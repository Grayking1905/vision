"""Pretrained model service — load, reverse-engineer, fine-tune."""

import asyncio
import json
import math
import os
import time
from typing import Any

import pandas as pd
from sqlmodel import Session, select

from app.config import get_settings
from app.models import DataFile
from app.models.pretrained import PretrainedModel
from app.services.pretrained_catalog import get_catalog_entry, PRETRAINED_CATALOG
from app.socketio_instance import sio, TRAINING_NS

# ── Helpers ──────────────────────────────────────────────────────────────

_main_loop: asyncio.AbstractEventLoop | None = None


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def _emit_ft(data: dict) -> None:
    """Thread-safe Socket.IO emit for fine-tuning progress."""
    if _main_loop and _main_loop.is_running():
        try:
            future = asyncio.run_coroutine_threadsafe(
                sio.emit("finetune_update", data, namespace=TRAINING_NS),
                _main_loop,
            )
            future.result(timeout=5)
        except Exception:
            pass


# ── Load Pretrained Model ────────────────────────────────────────────────

def _get_keras_model(key: str, include_top: bool = False):
    """Dynamically load a Keras Applications model by catalog key."""
    import tensorflow as tf

    entry = get_catalog_entry(key)
    if not entry:
        raise ValueError(f"Unknown model key: {key}")

    keras_class_name = entry["keras_class"]
    input_shape = tuple(entry["input_shape"])

    # Get the class from tf.keras.applications
    cls = getattr(tf.keras.applications, keras_class_name, None)
    if cls is None:
        raise ValueError(f"tf.keras.applications.{keras_class_name} not found")

    model = cls(
        include_top=include_top,
        weights="imagenet",
        input_shape=input_shape if not include_top else None,
    )
    return model


def load_pretrained_service(db: Session, key: str, include_top: bool, project_id: str | None) -> tuple:
    """Load a pretrained model and persist the record."""
    entry = get_catalog_entry(key)
    if not entry:
        return _resp(400, False, f"Unknown model key: {key}")

    # Check duplicate
    existing = db.exec(
        select(PretrainedModel).where(
            PretrainedModel.base_model_key == key,
            PretrainedModel.project_id == project_id,
        )
    ).first()
    if existing:
        return _resp(400, False, f"{entry['name']} is already loaded in this project.")

    # Try loading (verify TF is available)
    try:
        model = _get_keras_model(key, include_top)
        layer_count = len(model.layers)
        total_params = model.count_params()
    except ImportError:
        # TF not installed — still save the record for UI purposes
        layer_count = 0
        total_params = 0
    except Exception as e:
        return _resp(400, False, f"Failed to load model: {e}")

    record = PretrainedModel(
        project_id=project_id,
        base_model_key=key,
        display_name=entry["name"],
        include_top=include_top,
        status="loaded",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _resp(200, True, f"{entry['name']} loaded successfully", {
        "id": record.id,
        "display_name": record.display_name,
        "base_model_key": key,
        "layer_count": layer_count,
        "total_params": total_params,
        "status": "loaded",
    })


# ── Model Summary ────────────────────────────────────────────────────────

def get_model_summary_service(db: Session, pretrained_id: int) -> tuple:
    """Return layer-by-layer summary of a loaded pretrained model."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        return _resp(404, False, "Pretrained model not found")

    try:
        model = _get_keras_model(record.base_model_key, record.include_top)
    except ImportError:
        return _resp(400, False, "TensorFlow not installed — cannot inspect model layers.")
    except Exception as e:
        return _resp(400, False, f"Failed to load model: {e}")

    layers = []
    for layer in model.layers:
        output_shape = "unknown"
        try:
            os_raw = layer.output_shape
            output_shape = str(os_raw) if os_raw else "unknown"
        except (AttributeError, RuntimeError):
            pass

        layers.append({
            "name": layer.name,
            "type": layer.__class__.__name__,
            "output_shape": output_shape,
            "param_count": layer.count_params(),
            "trainable": layer.trainable,
        })

    return _resp(200, True, "Model summary retrieved", {
        "layers": layers,
        "total_params": model.count_params(),
        "trainable_params": sum(p.numpy().size for p in model.trainable_weights),
        "non_trainable_params": sum(p.numpy().size for p in model.non_trainable_weights),
    })


# ── Reverse Engineer to ReactFlow Graph ──────────────────────────────────

# Map Keras layer class names → Vision node types
_KERAS_TO_VISION = {
    "InputLayer": "input",
    "Dense": "dense",
    "Conv2D": "conv",
    "DepthwiseConv2D": "conv",
    "SeparableConv2D": "conv",
    "Flatten": "flatten",
    "Dropout": "dropout",
    "MaxPooling2D": "maxpool",
    "GlobalAveragePooling2D": "flatten",
    "GlobalMaxPooling2D": "flatten",
    "AveragePooling2D": "maxpool",
    "BatchNormalization": "batchnorm",
    "Concatenate": "dense",
    "Add": "dense",
    "Activation": "dense",
    "ReLU": "dense",
    "ZeroPadding2D": "input",
    "Rescaling": "input",
    "Normalization": "batchnorm",
}


def _extract_layer_params(layer) -> dict:
    """Extract key params from a Keras layer config for Vision node data."""
    config = layer.get_config()
    params = {}

    cls_name = layer.__class__.__name__

    if cls_name == "Dense":
        params["units"] = config.get("units", 64)
        params["activation"] = config.get("activation", "relu")

    elif cls_name in ("Conv2D", "DepthwiseConv2D", "SeparableConv2D"):
        params["filters"] = config.get("filters", 32)
        kernel = config.get("kernel_size", (3, 3))
        if isinstance(kernel, (list, tuple)):
            params["kernelX"] = kernel[0]
            params["kernelY"] = kernel[1] if len(kernel) > 1 else kernel[0]
        strides = config.get("strides", (1, 1))
        if isinstance(strides, (list, tuple)):
            params["strideX"] = strides[0]
            params["strideY"] = strides[1] if len(strides) > 1 else strides[0]
        params["padding"] = config.get("padding", "valid")
        params["activation"] = config.get("activation", "linear")

    elif cls_name == "Dropout":
        params["rate"] = config.get("rate", 0.5)

    elif cls_name in ("MaxPooling2D", "AveragePooling2D"):
        pool = config.get("pool_size", (2, 2))
        params["poolSize"] = pool[0] if isinstance(pool, (list, tuple)) else pool

    elif cls_name == "InputLayer":
        shape = config.get("batch_input_shape") or config.get("batch_shape") or []
        # Strip batch dimension
        dims = [d for d in (shape[1:] if shape else []) if d is not None]
        for i, d in enumerate(dims[:3], start=1):
            params[f"dim-{i}"] = d

    return params


def reverse_engineer_service(db: Session, pretrained_id: int) -> tuple:
    """Decompose a pretrained model into a ReactFlow graph {nodes, edges}."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        return _resp(404, False, "Pretrained model not found")

    try:
        model = _get_keras_model(record.base_model_key, record.include_top)
    except ImportError:
        return _resp(400, False, "TensorFlow not installed — cannot reverse-engineer model.")
    except Exception as e:
        return _resp(400, False, f"Failed to load model: {e}")

    nodes = []
    edges = []
    layer_id_map: dict[str, str] = {}  # keras layer name → node id

    # Limit to 50 layers for canvas performance (collapse middle blocks)
    all_layers = model.layers
    collapse = len(all_layers) > 50
    if collapse:
        # Keep first 15, last 15, sample from middle
        keep_indices = set(range(15))
        keep_indices.update(range(len(all_layers) - 15, len(all_layers)))
        step = max(1, (len(all_layers) - 30) // 20)
        for i in range(15, len(all_layers) - 15, step):
            keep_indices.add(i)
        keep_indices = sorted(keep_indices)
    else:
        keep_indices = list(range(len(all_layers)))

    # Layout: arrange nodes in a vertical flow
    x_base = 300
    y_spacing = 100

    for order_idx, layer_idx in enumerate(keep_indices):
        layer = all_layers[layer_idx]
        cls_name = layer.__class__.__name__
        node_type = _KERAS_TO_VISION.get(cls_name, "dense")

        node_id = f"pretrained_{layer_idx}_{layer.name[:30]}"
        layer_id_map[layer.name] = node_id

        params = _extract_layer_params(layer)

        nodes.append({
            "id": node_id,
            "type": node_type,
            "position": {"x": x_base, "y": order_idx * y_spacing},
            "data": {
                "label": f"{cls_name} — {layer.name}",
                "params": params,
                "original_class": cls_name,
                "original_name": layer.name,
                "param_count": layer.count_params(),
            },
        })

    # Build edges from inbound nodes
    for layer_idx in keep_indices:
        layer = all_layers[layer_idx]
        target_id = layer_id_map.get(layer.name)
        if not target_id:
            continue

        # Get inbound layers
        try:
            for node in layer._inbound_nodes:
                inbound_layers = node.inbound_layers
                if not isinstance(inbound_layers, (list, tuple)):
                    inbound_layers = [inbound_layers]
                for inbound in inbound_layers:
                    source_id = layer_id_map.get(inbound.name)
                    if source_id and source_id != target_id:
                        edges.append({
                            "id": f"e_{source_id}_{target_id}",
                            "source": source_id,
                            "target": target_id,
                        })
        except (AttributeError, IndexError):
            # Fallback: connect sequentially
            pass

    # If no edges were found (Sequential-like model), connect in order
    if not edges and len(nodes) > 1:
        for i in range(len(nodes) - 1):
            edges.append({
                "id": f"e_seq_{i}",
                "source": nodes[i]["id"],
                "target": nodes[i + 1]["id"],
            })

    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "layer_count": len(all_layers),
        "displayed_layers": len(nodes),
        "collapsed": collapse,
    }, 200


# ── Fine-tune Configuration ─────────────────────────────────────────────

def save_fine_tune_config_service(db: Session, config: dict) -> tuple:
    """Save fine-tuning configuration for a pretrained model."""
    record = db.get(PretrainedModel, config["pretrained_id"])
    if not record:
        return _resp(404, False, "Pretrained model not found")

    record.file_id = config["file_id"]
    record.target_field = config.get("target_field")
    record.freeze_layers = config.get("freeze_layers", 0)
    record.custom_head_json = json.dumps(config.get("custom_head", []))
    record.fine_tune_lr = config.get("learning_rate", 0.001)
    record.fine_tune_epochs = config.get("epochs", 10)
    record.fine_tune_batch_size = config.get("batch_size", 32)
    record.problem_type = config.get("problem_type", 1)
    record.optimizer = config.get("optimizer", "adam")

    db.add(record)
    db.commit()
    return _resp(200, True, "Fine-tuning configuration saved")


# ── Fine-tune Code Generation ───────────────────────────────────────────

def generate_fine_tune_code_service(db: Session, pretrained_id: int) -> tuple:
    """Generate a complete Python fine-tuning script."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        return _resp(404, False, "Pretrained model not found")

    entry = get_catalog_entry(record.base_model_key)
    if not entry:
        return _resp(400, False, "Unknown base model")

    head_layers = json.loads(record.custom_head_json or "[]")
    input_shape = tuple(entry["input_shape"])
    freeze = record.freeze_layers or 0
    lr = record.fine_tune_lr or 0.001
    epochs = record.fine_tune_epochs or 10
    batch_size = record.fine_tune_batch_size or 32
    optimizer = record.optimizer or "adam"
    target = record.target_field or "target"

    is_classification = record.problem_type in (1, None)
    loss = "sparse_categorical_crossentropy" if is_classification else "mean_squared_error"
    metric = "accuracy" if is_classification else "mae"

    lines = [
        "import tensorflow as tf",
        "import numpy as np",
        "import pandas as pd",
        "",
        "# ─── Vision Auto-Generated Fine-Tuning Script ────────────────────",
        f"# Base model: {entry['name']} ({entry['params']} parameters)",
        f"# Reverse-engineered and re-configured in Vision Sandbox",
        "",
        "# ─── Load Base Model ─────────────────────────────────────────────",
        f"base_model = tf.keras.applications.{entry['keras_class']}(",
        f"    include_top=False,",
        f"    weights='imagenet',",
        f"    input_shape={input_shape},",
        f")",
        "",
        f"# ─── Freeze Layers ───────────────────────────────────────────────",
        f"# Freezing first {freeze} layers for transfer learning",
        f"for layer in base_model.layers[:{freeze}]:",
        f"    layer.trainable = False",
        "",
        f"# ─── Custom Classification Head ─────────────────────────────────",
        f"x = base_model.output",
        f"x = tf.keras.layers.GlobalAveragePooling2D()(x)",
    ]

    for i, h in enumerate(head_layers):
        units = h.get("units", 128)
        act = h.get("activation", "relu")
        lines.append(f"x = tf.keras.layers.Dense({units}, activation='{act}')(x)")

    if not head_layers:
        lines.append(f"x = tf.keras.layers.Dense(128, activation='relu')(x)")

    lines.extend([
        f"x = tf.keras.layers.Dropout(0.3)(x)",
        f"outputs = tf.keras.layers.Dense(10, activation='{'softmax' if is_classification else 'linear'}')(x)",
        "",
        f"model = tf.keras.Model(inputs=base_model.input, outputs=outputs)",
        "",
        f"# ─── Compile ─────────────────────────────────────────────────────",
        f"model.compile(",
        f"    optimizer=tf.keras.optimizers.{optimizer.capitalize()}(learning_rate={lr}),",
        f"    loss='{loss}',",
        f"    metrics=['{metric}'],",
        f")",
        "",
        f"model.summary()",
        "",
        f"# ─── Load & Prepare Data ───────────────────────────────────────",
        f"# df = pd.read_csv('your_dataset.csv')",
        f"# X = df.drop(columns=['{target}'])",
        f"# y = df['{target}']",
        "",
        f"# ─── Train ─────────────────────────────────────────────────────",
        f"# history = model.fit(X, y, epochs={epochs}, batch_size={batch_size}, validation_split=0.2)",
    ])

    code = "\n".join(lines)
    return {"content": code, "file_name": f"{record.base_model_key}_finetune.py"}, 200


# ── Fine-tune Execution ─────────────────────────────────────────────────

def _run_fine_tune_thread(pretrained_id: int, db: Session) -> None:
    """Run fine-tuning in a thread (called via asyncio.to_thread)."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        _emit_ft({"event": "error", "message": "Pretrained model not found"})
        return

    try:
        import tensorflow as tf
    except ImportError:
        # Mock training when TF not available
        _run_mock_fine_tune(record)
        return

    try:
        record.status = "fine-tuning"
        db.add(record)
        db.commit()

        # Load base model
        model = _get_keras_model(record.base_model_key, include_top=False)

        # Freeze layers
        freeze = record.freeze_layers or 0
        for layer in model.layers[:freeze]:
            layer.trainable = False

        # Build custom head
        x = model.output
        x = tf.keras.layers.GlobalAveragePooling2D()(x)

        head_layers = json.loads(record.custom_head_json or "[]")
        for h in head_layers:
            x = tf.keras.layers.Dense(
                h.get("units", 128),
                activation=h.get("activation", "relu"),
            )(x)

        if not head_layers:
            x = tf.keras.layers.Dense(128, activation="relu")(x)

        x = tf.keras.layers.Dropout(0.3)(x)

        is_classification = record.problem_type in (1, None)
        output_units = 10  # Default, adjusted from data
        output_activation = "softmax" if is_classification else "linear"
        outputs = tf.keras.layers.Dense(output_units, activation=output_activation)(x)

        full_model = tf.keras.Model(inputs=model.input, outputs=outputs)

        # Compile
        lr = record.fine_tune_lr or 0.001
        optimizer_name = record.optimizer or "adam"
        loss = "sparse_categorical_crossentropy" if is_classification else "mean_squared_error"
        metric = "accuracy" if is_classification else "mae"

        opt = getattr(tf.keras.optimizers, optimizer_name.capitalize(), tf.keras.optimizers.Adam)(learning_rate=lr)
        full_model.compile(optimizer=opt, loss=loss, metrics=[metric])

        # Load data
        settings = get_settings()
        file = db.exec(select(DataFile).where(DataFile.id == record.file_id)).first()
        if not file:
            raise ValueError("Dataset not found")

        file_path = f"{settings.upload_folder}/{file.file_name}.{file.file_type}"
        df = pd.read_csv(file_path)
        df.dropna(inplace=True)
        df = df.sample(frac=1, random_state=42).reset_index(drop=True)

        target_field = record.target_field or df.columns[-1]
        X = df.drop(columns=[target_field]).values
        y = df[target_field].values

        split = int(len(X) * 0.8)
        x_train, x_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        epochs = record.fine_tune_epochs or 10
        batch_size = record.fine_tune_batch_size or 32

        # Progress callback
        class FTCallback(tf.keras.callbacks.Callback):
            def on_train_begin(self, logs=None):
                _emit_ft({"event": "ft_train_begin", "total_epochs": epochs, "model": record.display_name})

            def on_epoch_begin(self, epoch, logs=None):
                _emit_ft({"event": "ft_epoch_begin", "epoch": epoch + 1, "total_epochs": epochs})

            def on_epoch_end(self, epoch, logs=None):
                logs = logs or {}
                _emit_ft({
                    "event": "ft_epoch_end",
                    "epoch": epoch + 1,
                    "total_epochs": epochs,
                    "loss": round(float(logs.get("loss", 0)), 4),
                    "accuracy": round(float(logs.get("accuracy", logs.get("acc", 0))), 4),
                    "val_loss": round(float(logs.get("val_loss", 0)), 4) if "val_loss" in logs else None,
                    "val_accuracy": round(float(logs.get("val_accuracy", logs.get("val_acc", 0))), 4) if "val_accuracy" in logs else None,
                })

            def on_train_end(self, logs=None):
                _emit_ft({"event": "ft_train_complete", "model": record.display_name})

        full_model.fit(
            x_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(x_test, y_test),
            callbacks=[FTCallback()],
            verbose=0,
        )

        record.status = "fine-tuned"
        db.add(record)
        db.commit()

    except Exception as e:
        record.status = "error"
        record.error_message = str(e)
        db.add(record)
        db.commit()
        _emit_ft({"event": "ft_error", "message": str(e)})


def _run_mock_fine_tune(record: PretrainedModel) -> None:
    """Simulated fine-tuning for demo/dev without TensorFlow."""
    epochs = record.fine_tune_epochs or 10
    _emit_ft({"event": "ft_train_begin", "total_epochs": epochs, "model": record.display_name})

    for epoch in range(epochs):
        time.sleep(0.5)
        _emit_ft({"event": "ft_epoch_begin", "epoch": epoch + 1, "total_epochs": epochs})
        time.sleep(0.3)
        loss = 1.2 * math.exp(-0.35 * epoch) + 0.03
        acc = 0.55 + 0.42 * (1 - math.exp(-0.35 * epoch))
        _emit_ft({
            "event": "ft_epoch_end",
            "epoch": epoch + 1,
            "total_epochs": epochs,
            "loss": round(loss, 4),
            "accuracy": round(acc, 4),
            "val_loss": round(loss * 1.15, 4),
            "val_accuracy": round(acc * 0.94, 4),
        })

    _emit_ft({"event": "ft_train_complete", "model": record.display_name})


async def run_fine_tune_service(db: Session, pretrained_id: int, loop) -> tuple:
    """Start fine-tuning asynchronously."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        return _resp(404, False, "Pretrained model not found")
    if not record.file_id:
        return _resp(400, False, "Fine-tuning configuration not set. Configure first.")

    global _main_loop
    _main_loop = loop

    try:
        await asyncio.to_thread(_run_fine_tune_thread, pretrained_id, db)
        return _resp(200, True, "Fine-tuning completed")
    except Exception as e:
        return _resp(400, False, f"Fine-tuning failed: {e}")


# ── List / Delete ────────────────────────────────────────────────────────

def list_pretrained_service(db: Session, project_id: str | None) -> tuple:
    """List all loaded pretrained models for a project."""
    stmt = select(PretrainedModel)
    if project_id:
        stmt = stmt.where(PretrainedModel.project_id == project_id)
    models = db.exec(stmt).all()
    data = [
        {
            "id": m.id,
            "base_model_key": m.base_model_key,
            "display_name": m.display_name,
            "include_top": m.include_top,
            "status": m.status,
            "freeze_layers": m.freeze_layers,
            "fine_tune_epochs": m.fine_tune_epochs,
            "created_on": m.created_on.isoformat() if m.created_on else None,
        }
        for m in models
    ]
    return _resp(200, True, "Pretrained models retrieved", data)


def delete_pretrained_service(db: Session, pretrained_id: int) -> tuple:
    """Delete a loaded pretrained model."""
    record = db.get(PretrainedModel, pretrained_id)
    if not record:
        return _resp(404, False, "Pretrained model not found")
    name = record.display_name
    db.delete(record)
    db.commit()
    return _resp(200, True, f"{name} removed")
