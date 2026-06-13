"""Model generation: ReactFlow graph → Keras JSON (without TF runtime for transpile)."""

import json
from collections import defaultdict
from typing import Any


def model_generation_dict(model_params: dict) -> dict:
    """
    Convert a ReactFlow graph into a Keras-compatible JSON dict.
    Falls back to a schema-only representation when TensorFlow is unavailable.
    """
    try:
        return _tf_model_generation(model_params)
    except ImportError:
        return _mock_model_generation(model_params)
    except Exception as e:
        raise ValueError(f"Model generation failed: {e}") from e


def _tf_model_generation(model_params: dict) -> dict:
    import tensorflow as tf

    source_to_targets: dict[str, list] = defaultdict(list)
    target_to_sources: dict[str, list] = defaultdict(list)
    for edge in model_params.get("edges", []):
        source_to_targets[edge["source"]].append(edge["target"])
        target_to_sources[edge["target"]].append(edge["source"])

    nodes_by_id = {n["id"]: n for n in model_params.get("nodes", [])}
    keras_tensors: dict[str, Any] = {}
    visited: set = set()
    queue: list = []

    for node in model_params.get("nodes", []):
        if node["type"] == "input":
            dims = _parse_input_dims(node["data"].get("params", {}))
            keras_tensors[node["id"]] = tf.keras.Input(shape=dims, name=node["id"][:50])
            visited.add(node["id"])
            queue.append(node["id"])

    while queue:
        current_id = queue.pop(0)
        for target_id in source_to_targets.get(current_id, []):
            if target_id in visited:
                continue
            all_sources = target_to_sources.get(target_id, [])
            if not all(src in visited for src in all_sources):
                continue
            visited.add(target_id)
            queue.append(target_id)

            source_tensors = [keras_tensors[src] for src in all_sources]
            input_tensor = (
                tf.keras.layers.Concatenate(axis=-1)(source_tensors)
                if len(source_tensors) > 1
                else source_tensors[0]
            )

            node = nodes_by_id[target_id]
            keras_tensors[target_id] = _build_layer(node, input_tensor)

    inputs = [keras_tensors[n["id"]] for n in model_params.get("nodes", []) if n["type"] == "input"]
    output_ids = [n["id"] for n in model_params.get("nodes", []) if n["id"] not in source_to_targets]
    outputs = [keras_tensors[oid] for oid in output_ids if oid in keras_tensors]

    if not inputs or not outputs:
        raise ValueError("Model must have at least one input and one output node.")

    model = tf.keras.Model(inputs=inputs, outputs=outputs)
    return json.loads(model.to_json())


def _parse_input_dims(params: dict) -> list[int]:
    dims = []
    for i in range(1, 4):
        v = params.get(f"dim-{i}", "")
        try:
            d = int(v)
            if d > 0:
                dims.append(d)
        except (TypeError, ValueError):
            pass
    return dims if dims else [1]


def _build_layer(node: dict, input_tensor: Any) -> Any:
    import tensorflow as tf

    params = node["data"].get("params", {})
    node_type = node["type"]
    name = node["id"][:50]

    act_raw = params.get("activation", "none")
    activation = "linear" if act_raw == "none" else act_raw

    if node_type == "dense":
        units = max(1, int(params.get("units", 1) or 1))
        return tf.keras.layers.Dense(units=units, activation=activation, name=name)(input_tensor)

    elif node_type == "flatten":
        return tf.keras.layers.Flatten(name=name)(input_tensor)

    elif node_type == "conv":
        filters = max(1, int(params.get("filters", 32) or 32))
        kx = max(1, int(params.get("kernelX", 3) or 3))
        ky = max(1, int(params.get("kernelY", 3) or 3))
        sx = max(1, int(params.get("strideX", 1) or 1))
        sy = max(1, int(params.get("strideY", 1) or 1))
        padding = params.get("padding", "valid")
        return tf.keras.layers.Conv2D(
            filters=filters,
            kernel_size=(kx, ky),
            strides=(sx, sy),
            padding=padding,
            activation=activation,
            name=name,
        )(input_tensor)

    elif node_type == "dropout":
        rate = float(params.get("rate", 0.5) or 0.5)
        rate = max(0.0, min(0.9, rate))
        return tf.keras.layers.Dropout(rate=rate, name=name)(input_tensor)

    elif node_type == "maxpool":
        ps = max(1, int(params.get("poolSize", 2) or 2))
        return tf.keras.layers.MaxPooling2D(pool_size=(ps, ps), name=name)(input_tensor)

    elif node_type == "batchnorm":
        return tf.keras.layers.BatchNormalization(name=name)(input_tensor)

    else:
        raise ValueError(f"Unknown node type: {node_type}")


def _mock_model_generation(model_params: dict) -> dict:
    """Fallback schema when TensorFlow is not installed."""
    layers = []
    for node in model_params.get("nodes", []):
        layers.append({
            "class_name": _node_type_to_class(node["type"]),
            "config": {"name": node["id"]},
        })
    return {"class_name": "Sequential", "config": {"name": "mock_model", "layers": layers}}


def _node_type_to_class(node_type: str) -> str:
    mapping = {
        "input": "InputLayer",
        "dense": "Dense",
        "conv": "Conv2D",
        "flatten": "Flatten",
        "dropout": "Dropout",
        "maxpool": "MaxPooling2D",
        "batchnorm": "BatchNormalization",
    }
    return mapping.get(node_type, "Unknown")
