"""Live Python code transpilation from ReactFlow graph."""

from typing import Any


def transpile_graph(nodes: list[dict], edges: list[dict]) -> str:
    """
    Reverse-engineer a ReactFlow graph into TensorFlow/Keras Python code.
    This is the core 'Vision' feature — WYSIWYG → executable script.
    """
    if not nodes:
        return _empty_template()

    lines = [
        "import tensorflow as tf",
        "import numpy as np",
        "",
        "# ─── Vision Auto-Generated Model ─────────────────────────────────",
        "# This code was reverse-engineered from your visual canvas.",
        "# Drag nodes, and this panel updates in real-time.",
        "",
    ]

    # Build adjacency maps
    source_to_targets: dict[str, list] = {}
    target_to_sources: dict[str, list] = {}
    for edge in edges:
        source_to_targets.setdefault(edge["source"], []).append(edge["target"])
        target_to_sources.setdefault(edge["target"], []).append(edge["source"])

    nodes_by_id = {n["id"]: n for n in nodes}

    # Topological sort via BFS from input nodes
    visited = set()
    order = []
    queue = [n["id"] for n in nodes if n["type"] == "input"]
    for nid in queue:
        visited.add(nid)

    while queue:
        current = queue.pop(0)
        order.append(current)
        for target in source_to_targets.get(current, []):
            if target not in visited:
                all_sources = target_to_sources.get(target, [])
                if all(s in visited for s in all_sources):
                    visited.add(target)
                    queue.append(target)

    # Variable name mapping
    var_names: dict[str, str] = {}
    counts: dict[str, int] = {}

    def get_var(node_type: str, node_id: str) -> str:
        counts[node_type] = counts.get(node_type, 0) + 1
        name = f"{node_type}_{counts[node_type]}"
        var_names[node_id] = name
        return name

    lines.append("# ─── Model Architecture ──────────────────────────────────────────")

    for node_id in order:
        if node_id not in nodes_by_id:
            continue
        node = nodes_by_id[node_id]
        ntype = node["type"]
        params = node["data"].get("params", {})

        sources = target_to_sources.get(node_id, [])
        if len(sources) == 1:
            input_var = var_names.get(sources[0], "x")
        elif len(sources) > 1:
            src_vars = [var_names.get(s, "x") for s in sources]
            input_var = f"tf.keras.layers.Concatenate()([{', '.join(src_vars)}])"
        else:
            input_var = None

        if ntype == "input":
            dims = _parse_dims(params)
            var = get_var("inputs", node_id)
            lines.append(f"{var} = tf.keras.Input(shape={dims})")

        elif ntype == "dense":
            units = int(params.get("units", 64) or 64)
            act = _activation(params)
            var = get_var("dense", node_id)
            lines.append(f"{var} = tf.keras.layers.Dense({units}, activation='{act}')({input_var})")

        elif ntype == "conv":
            filters = int(params.get("filters", 32) or 32)
            kx = int(params.get("kernelX", 3) or 3)
            ky = int(params.get("kernelY", 3) or 3)
            sx = int(params.get("strideX", 1) or 1)
            sy = int(params.get("strideY", 1) or 1)
            pad = params.get("padding", "valid")
            act = _activation(params)
            var = get_var("conv2d", node_id)
            lines.append(
                f"{var} = tf.keras.layers.Conv2D("
                f"{filters}, kernel_size=({kx}, {ky}), strides=({sx}, {sy}), "
                f"padding='{pad}', activation='{act}')({input_var})"
            )

        elif ntype == "flatten":
            var = get_var("flatten", node_id)
            lines.append(f"{var} = tf.keras.layers.Flatten()({input_var})")

        elif ntype == "dropout":
            rate = float(params.get("rate", 0.5) or 0.5)
            var = get_var("dropout", node_id)
            lines.append(f"{var} = tf.keras.layers.Dropout({rate})({input_var})")

        elif ntype == "maxpool":
            ps = int(params.get("poolSize", 2) or 2)
            var = get_var("maxpool", node_id)
            lines.append(f"{var} = tf.keras.layers.MaxPooling2D(pool_size=({ps}, {ps}))({input_var})")

        elif ntype == "batchnorm":
            var = get_var("batchnorm", node_id)
            lines.append(f"{var} = tf.keras.layers.BatchNormalization()({input_var})")

    # Identify outputs
    output_ids = [n["id"] for n in nodes if n["id"] not in source_to_targets]
    input_ids = [n["id"] for n in nodes if n["type"] == "input"]

    input_vars = [var_names[nid] for nid in input_ids if nid in var_names]
    output_vars = [var_names[nid] for nid in output_ids if nid in var_names]

    lines.append("")
    lines.append("# ─── Build Model ─────────────────────────────────────────────────")

    if len(input_vars) == 1:
        in_str = input_vars[0]
    else:
        in_str = f"[{', '.join(input_vars)}]"

    if len(output_vars) == 1:
        out_str = output_vars[0]
    else:
        out_str = f"[{', '.join(output_vars)}]"

    lines.append(f"model = tf.keras.Model(inputs={in_str}, outputs={out_str})")
    lines.append("")
    lines.append("# ─── Training Configuration ──────────────────────────────────────")
    lines.append("model.compile(")
    lines.append("    optimizer='adam',")
    lines.append("    loss='sparse_categorical_crossentropy',")
    lines.append("    metrics=['accuracy'],")
    lines.append(")")
    lines.append("")
    lines.append("model.summary()")
    lines.append("")
    lines.append("# ─── Train ───────────────────────────────────────────────────────")
    lines.append("# history = model.fit(X_train, y_train, epochs=10, validation_split=0.2)")

    return "\n".join(lines)


def _parse_dims(params: dict) -> str:
    dims = []
    for i in range(1, 4):
        v = params.get(f"dim-{i}", "")
        try:
            d = int(v)
            if d > 0:
                dims.append(d)
        except (TypeError, ValueError):
            pass
    return str(tuple(dims)) if dims else "(1,)"


def _activation(params: dict) -> str:
    act = params.get("activation", "relu")
    return "linear" if act == "none" else (act or "relu")


def _empty_template() -> str:
    return "\n".join([
        "import tensorflow as tf",
        "",
        "# ─── Vision Auto-Generated Model ─────────────────────────────────",
        "# Start by dragging layers from the sidebar onto the canvas.",
        "# Connect them with arrows to define the data flow.",
        "# Your TensorFlow code will appear here in real-time.",
        "",
        "# Example:",
        "# inputs = tf.keras.Input(shape=(784,))",
        "# x = tf.keras.layers.Dense(128, activation='relu')(inputs)",
        "# outputs = tf.keras.layers.Dense(10)(x)",
        "# model = tf.keras.Model(inputs=inputs, outputs=outputs)",
    ])
