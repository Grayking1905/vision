"""Pretrained model catalog — static registry of supported base models."""

from typing import Any

# ── Supported Pretrained Models ──────────────────────────────────────────
# Each entry maps to a tf.keras.applications.<Class> constructor.
# Keys are used as identifiers throughout the system.

PRETRAINED_CATALOG: dict[str, dict[str, Any]] = {
    "mobilenet_v2": {
        "name": "MobileNetV2",
        "params": "3.4M",
        "input_shape": [224, 224, 3],
        "size": "small",
        "description": "Lightweight mobile-optimized CNN — ideal for edge & real-time apps.",
        "keras_class": "MobileNetV2",
    },
    "resnet50": {
        "name": "ResNet50",
        "params": "25.6M",
        "input_shape": [224, 224, 3],
        "size": "medium",
        "description": "Deep residual network with 50 layers — strong general-purpose backbone.",
        "keras_class": "ResNet50",
    },
    "resnet101": {
        "name": "ResNet101",
        "params": "44.7M",
        "input_shape": [224, 224, 3],
        "size": "large",
        "description": "Deep residual network with 101 layers — high capacity for complex tasks.",
        "keras_class": "ResNet101",
    },
    "vgg16": {
        "name": "VGG16",
        "params": "138M",
        "input_shape": [224, 224, 3],
        "size": "large",
        "description": "Classic deep CNN with 16 weight layers — widely used benchmark model.",
        "keras_class": "VGG16",
    },
    "efficientnet_b0": {
        "name": "EfficientNetB0",
        "params": "5.3M",
        "input_shape": [224, 224, 3],
        "size": "small",
        "description": "Compound-scaled efficient CNN — best accuracy/FLOP ratio, B0 variant.",
        "keras_class": "EfficientNetB0",
    },
    "efficientnet_b3": {
        "name": "EfficientNetB3",
        "params": "12M",
        "input_shape": [300, 300, 3],
        "size": "medium",
        "description": "Compound-scaled efficient CNN — B3 variant for higher accuracy.",
        "keras_class": "EfficientNetB3",
    },
    "inception_v3": {
        "name": "InceptionV3",
        "params": "23.9M",
        "input_shape": [299, 299, 3],
        "size": "medium",
        "description": "Inception architecture with factorized convolutions — multi-scale features.",
        "keras_class": "InceptionV3",
    },
    "densenet121": {
        "name": "DenseNet121",
        "params": "8M",
        "input_shape": [224, 224, 3],
        "size": "small",
        "description": "Densely connected CNN — strong feature reuse, 121 layers.",
        "keras_class": "DenseNet121",
    },
    "xception": {
        "name": "Xception",
        "params": "22.9M",
        "input_shape": [299, 299, 3],
        "size": "medium",
        "description": "Depthwise separable convolutions — extreme version of Inception.",
        "keras_class": "Xception",
    },
    "nasnet_mobile": {
        "name": "NASNetMobile",
        "params": "5.3M",
        "input_shape": [224, 224, 3],
        "size": "small",
        "description": "Neural Architecture Search optimized — automated design for mobile.",
        "keras_class": "NASNetMobile",
    },
}


def get_catalog() -> list[dict]:
    """Return the full catalog as a list of dicts (without internal keras_class)."""
    result = []
    for key, info in PRETRAINED_CATALOG.items():
        result.append({
            "key": key,
            "name": info["name"],
            "params": info["params"],
            "input_shape": info["input_shape"],
            "size": info["size"],
            "description": info["description"],
        })
    return result


def get_catalog_entry(key: str) -> dict | None:
    """Return a single catalog entry by key, or None."""
    return PRETRAINED_CATALOG.get(key)
