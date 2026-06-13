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
    data = [{"id": m.id, "model_name": m.model_name, "created_on": m.created_on.isoformat() if m.created_on else None} for m in models]
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

    return _resp(200, True, f"Model '{model_name}' deleted")


async def run_model_service(db: Session, model_name: str, project_id: str | None, loop) -> tuple:
    import asyncio
    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model:
        return _resp(404, False, "Model not found")
    if model.file_id is None or model.epochs is None:
        return _resp(400, False, "Training configuration not set. Configure training first.")

    try:
        await asyncio.to_thread(model_run, model_name, db, loop)
        return _resp(200, True, "Training completed")
    except Exception as e:
        return _resp(400, False, f"Training failed: {e}")
