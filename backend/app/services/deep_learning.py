"""Deep learning orchestration service."""

import contextlib
import json
import os
import re
from typing import Any

from sqlmodel import Session, select

from app.models import ModelBasic, ModelConfigs
from app.services.code_generation import transpile_graph
from app.services.model_generation import model_generation_dict
from app.services.model_run import model_run


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def _sanitize_name(name: str) -> str:
    name = name.strip()
    if not name or not re.fullmatch(r"[A-Za-z0-9_\-]+", name):
        raise ValueError(f"Invalid model name '{name}'. Use only letters, numbers, hyphens, underscores.")
    return name


def _model_path(name: str, settings) -> str:
    return os.path.join(settings.model_folder, name + ".json")


def _build_summary(keras_json: dict) -> dict:
    """Build a lightweight summary from Keras JSON config."""
    layers = []
    config = keras_json.get("config", {})
    raw_layers = config.get("layers", [])
    if isinstance(raw_layers, list):
        for layer in raw_layers:
            layers.append({
                "name": layer.get("config", {}).get("name", "?"),
                "type": layer.get("class_name", "?"),
                "output_shape": "unknown",
                "param_count": 0,
            })
    return {"layers": layers, "total_params": 0, "trainable_params": 0}


def save_model_service(db: Session, model_params: dict, model_name: str, project_id: str | None = None) -> tuple:
    from app.config import get_settings
    settings = get_settings()

    try:
        model_name = _sanitize_name(model_name)
    except ValueError as e:
        return _resp(400, False, str(e))

    existing = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if existing:
        return _resp(400, False, "Model name already exists. Choose a different name.")

    try:
        keras_json = model_generation_dict(model_params)
    except Exception as e:
        return _resp(400, False, f"Model architecture invalid: {e}")

    model = ModelBasic(model_name=model_name, project_id=project_id)
    db.add(model)
    db.flush()
    db.refresh(model)

    # Flatten graph params for storage
    def flatten(obj, prefix=""):
        items = {}
        if isinstance(obj, dict):
            for k, v in obj.items():
                items.update(flatten(v, f"{prefix}.{k}" if prefix else k))
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                items.update(flatten(v, f"{prefix}.{i}" if prefix else str(i)))
        else:
            items[prefix] = str(obj) if obj is not None else ""
        return items

    flat = flatten(model_params)
    configs = [
        ModelConfigs(model_id=model.id, parameter=k, value=v)
        for k, v in flat.items()
        if v
    ]
    db.add_all(configs)

    os.makedirs(settings.model_folder, exist_ok=True)
    model_path = _model_path(model_name, settings)
    with open(model_path, "w") as f:
        json.dump(keras_json, f, indent=2)

    db.commit()
    summary = _build_summary(keras_json)
    return _resp(200, True, "Model saved successfully", {"summary": summary})


def update_training_config_service(db: Session, model_name: str, config: dict, project_id: str | None = None) -> tuple:
    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model:
        return _resp(404, False, "Model not found")

    problem_type = config.get("problem_type_id", 1)
    loss = "sparse_categorical_crossentropy" if problem_type in (1, 3) else "mean_squared_error"

    model.file_id = config["file_id"]
    model.model_type = problem_type
    model.target_field = config.get("target_field")
    model.training_split = config["training_split"]
    model.optimizer = config["optimizer"]
    model.metric = config["metric"]
    model.epochs = config["epochs"]
    model.batch_size = config.get("batch_size", 32)
    model.loss = loss

    db.add(model)
    db.commit()
    return _resp(200, True, "Training configuration saved")


def get_code_service(db: Session, model_name: str, project_id: str | None = None) -> tuple:
    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model:
        return _resp(404, False, "Model not found")

    configs = db.exec(select(ModelConfigs).where(ModelConfigs.model_id == model.id)).all()
    graph = _reconstruct_graph(configs)
    code = transpile_graph(graph.get("nodes", []), graph.get("edges", []))
    return {"content": code, "file_name": model_name + ".py"}, 200


def _reconstruct_graph(configs: list) -> dict:
    """Reconstruct graph from flattened configs."""
    flat = {c.parameter: c.value for c in configs}
    root = {}
    for key, value in flat.items():
        parts = key.split(".")
        cur = root
        for part in parts[:-1]:
            cur = cur.setdefault(part, {})
        cur[parts[-1]] = value

    def lists(obj):
        if not isinstance(obj, dict):
            return obj
        converted = {k: lists(v) for k, v in obj.items()}
        if converted and all(k.isdigit() for k in converted):
            max_i = max(int(k) for k in converted)
            result = [None] * (max_i + 1)
            for k, v in converted.items():
                result[int(k)] = v
            return result
        return converted

    return lists(root)


def get_model_list_service(db: Session, project_id: str | None = None) -> tuple:
    stmt = select(ModelBasic)
    if project_id:
        stmt = stmt.where(ModelBasic.project_id == project_id)
    models = db.exec(stmt).all()
    data = [
        {
            "id": m.id,
            "model_name": m.model_name,
            "file_id": m.file_id,
            "target_field": m.target_field,
            "epochs": m.epochs,
            "is_trained": bool(m.is_trained),
            "trained_model_path": m.trained_model_path,
            "final_accuracy": m.final_accuracy,
            "final_loss": m.final_loss,
            "val_accuracy": m.val_accuracy,
            "val_loss": m.val_loss,
            "trained_at": m.trained_at.isoformat() if m.trained_at else None,
            "created_on": m.created_on.isoformat() if m.created_on else None,
        }
        for m in models
    ]
    return _resp(200, True, "Models retrieved", data)


def get_model_graph_service(db: Session, model_name: str, project_id: str | None = None) -> tuple:
    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model:
        return _resp(404, False, "Model not found")

    configs = db.exec(select(ModelConfigs).where(ModelConfigs.model_id == model.id)).all()
    graph = _reconstruct_graph(configs)
    return _resp(200, True, "Graph retrieved", {"model_name": model_name, "graph": graph})


def delete_model_service(db: Session, model_id: int) -> tuple:
    from app.config import get_settings
    model = db.get(ModelBasic, model_id)
    if not model:
        return _resp(404, False, "Model not found")

    model_name = model.model_name
    db.delete(model)
    db.commit()

    settings = get_settings()
    model_path = _model_path(model_name, settings)
    with contextlib.suppress(OSError):
        os.remove(model_path)

    # Also clean up trained model artifacts if present
    trained_keras = os.path.join(settings.trained_model_folder, f"{model_name}_trained.keras")
    with contextlib.suppress(OSError):
        os.remove(trained_keras)

    return _resp(200, True, f"Model '{model_name}' deleted")


async def run_model_service(
    db: Session,
    model_name: str,
    project_id: str | None = None,
    loop = None,
    config_overrides: dict | None = None,
) -> tuple:
    import asyncio
    from app.models import DataFile

    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model:
        return _resp(404, False, f"Model '{model_name}' not found")

    # Apply any config overrides passed in the request
    if config_overrides:
        if config_overrides.get("file_id"):
            model.file_id = config_overrides["file_id"]
        if config_overrides.get("target_field"):
            model.target_field = config_overrides["target_field"]
        if config_overrides.get("epochs"):
            model.epochs = config_overrides["epochs"]
        if config_overrides.get("batch_size"):
            model.batch_size = config_overrides["batch_size"]
        if config_overrides.get("optimizer"):
            model.optimizer = config_overrides["optimizer"]
        if config_overrides.get("metric"):
            model.metric = config_overrides["metric"]
        if config_overrides.get("training_split"):
            model.training_split = config_overrides["training_split"]
        if config_overrides.get("problem_type_id"):
            model.model_type = config_overrides["problem_type_id"]

    # Auto-resolve dataset file if not set
    if not model.file_id:
        file_query = select(DataFile).where(DataFile.file_type == "csv")
        if project_id:
            file_query = file_query.where(DataFile.project_id == project_id)
        first_file = db.exec(file_query).first()
        if not first_file:
            first_file = db.exec(select(DataFile).where(DataFile.file_type == "csv")).first()

        if first_file:
            model.file_id = first_file.id
            if not model.target_field and first_file.columns:
                model.target_field = first_file.columns[-1]

    if not model.epochs:
        model.epochs = 15
    if not model.batch_size:
        model.batch_size = 32
    if not model.optimizer:
        model.optimizer = "adam"
    if not model.metric:
        model.metric = "accuracy"
    if not model.training_split:
        model.training_split = 80.0

    db.add(model)
    db.commit()
    db.refresh(model)

    try:
        result = await asyncio.to_thread(model_run, model_name, db, loop)
        return _resp(200, True, "Training completed successfully", result.get("data", {}))
    except Exception as e:
        return _resp(400, False, f"Training failed: {e}")


def get_trained_models_service(db: Session, project_id: str | None = None) -> tuple:
    """List all models that have been successfully trained locally."""
    from app.config import get_settings
    settings = get_settings()

    stmt = select(ModelBasic).where(ModelBasic.is_trained == True)  # noqa: E712
    if project_id:
        stmt = stmt.where(ModelBasic.project_id == project_id)

    models = db.exec(stmt).all()
    results = []

    for m in models:
        file_size_bytes = 0
        keras_file = os.path.join(settings.trained_model_folder, f"{m.model_name}_trained.keras")
        if os.path.exists(keras_file):
            file_size_bytes = os.path.getsize(keras_file)

        results.append({
            "id": m.id,
            "model_name": m.model_name,
            "project_id": m.project_id,
            "file_id": m.file_id,
            "target_field": m.target_field,
            "epochs": m.epochs,
            "optimizer": m.optimizer,
            "metric": m.metric,
            "final_accuracy": m.final_accuracy,
            "final_loss": m.final_loss,
            "val_accuracy": m.val_accuracy,
            "val_loss": m.val_loss,
            "trained_model_path": m.trained_model_path,
            "relative_path": f"data/trained_models/{m.model_name}_trained.keras",
            "file_size_bytes": file_size_bytes,
            "file_size_formatted": f"{file_size_bytes / (1024 * 1024):.2f} MB" if file_size_bytes > 0 else "—",
            "trained_at": m.trained_at.isoformat() if m.trained_at else None,
        })

    return _resp(200, True, "Trained models retrieved", results)

