"""Model training runner with Socket.IO real-time progress streaming."""

import asyncio
import json
import os
from typing import Any

import pandas as pd
from sqlmodel import Session, select

from app.config import get_settings
from app.models import DataFile, ModelBasic
from app.socketio_instance import sio, TRAINING_NS

_main_loop: asyncio.AbstractEventLoop | None = None


def _emit(data: dict) -> None:
    """Thread-safe Socket.IO emit."""
    if _main_loop and _main_loop.is_running():
        try:
            future = asyncio.run_coroutine_threadsafe(
                sio.emit("training_update", data, namespace=TRAINING_NS),
                _main_loop,
            )
            future.result(timeout=5)
        except Exception:
            pass


class VisionProgressCallback:
    """Keras-compatible callback that streams training metrics via Socket.IO."""

    def __init__(self, total_epochs: int):
        self.total_epochs = total_epochs
        self.current_epoch = 0

    def on_epoch_begin(self, epoch: int, logs: dict = None):
        self.current_epoch = epoch
        _emit({
            "event": "epoch_begin",
            "epoch": epoch + 1,
            "total_epochs": self.total_epochs,
        })

    def on_epoch_end(self, epoch: int, logs: dict = None):
        logs = logs or {}
        _emit({
            "event": "epoch_end",
            "epoch": epoch + 1,
            "total_epochs": self.total_epochs,
            "loss": round(float(logs.get("loss", 0)), 4),
            "accuracy": round(float(logs.get("accuracy", logs.get("acc", 0))), 4),
            "val_loss": round(float(logs.get("val_loss", 0)), 4) if "val_loss" in logs else None,
            "val_accuracy": round(float(logs.get("val_accuracy", logs.get("val_acc", 0))), 4) if "val_accuracy" in logs else None,
        })

    def on_train_end(self, logs: dict = None):
        _emit({"event": "train_complete"})

    def on_train_begin(self, logs: dict = None):
        _emit({"event": "train_begin", "total_epochs": self.total_epochs})


def _get_file_path(db: Session, file_id: str) -> str:
    settings = get_settings()
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if file.file_type == "csv":
        return f"{settings.upload_folder}/{file.file_name}.{file.file_type}"
    return f"{settings.upload_folder}/{file.file_name}"


def _get_model_path(model_name: str) -> str:
    settings = get_settings()
    return os.path.join(settings.model_folder, f"{model_name}.json")


def model_run(model_name: str, db: Session, loop: asyncio.AbstractEventLoop | None = None) -> None:
    global _main_loop
    _main_loop = loop

    try:
        import tensorflow as tf
    except ImportError:
        _emit({"event": "error", "message": "TensorFlow not installed. Running mock training."})
        _run_mock(model_name)
        return

    try:
        model_config = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
        if not model_config:
            raise ValueError(f"Model '{model_name}' not found")

        # Load architecture
        model_path = _get_model_path(model_name)
        with open(model_path) as f:
            model = tf.keras.models.model_from_json(f.read())

        # Compile
        loss = model_config.loss or "sparse_categorical_crossentropy"
        metric = model_config.metric or "accuracy"
        model.compile(
            optimizer=model_config.optimizer or "adam",
            loss=loss,
            metrics=[metric],
        )

        # Load data
        file_path = _get_file_path(db, model_config.file_id)
        df = pd.read_csv(file_path)
        df.dropna(inplace=True)
        df = df.sample(frac=1, random_state=42).reset_index(drop=True)

        X = df.drop(columns=[model_config.target_field])
        y = df[model_config.target_field]

        split = int(len(X) * (model_config.training_split or 80) / 100)
        x_train, x_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        callback = VisionProgressCallback(total_epochs=model_config.epochs or 10)

        # Wrap callback for Keras
        class KerasCallback(tf.keras.callbacks.Callback):
            def on_epoch_begin(self, epoch, logs=None):
                callback.on_epoch_begin(epoch, logs)

            def on_epoch_end(self, epoch, logs=None):
                callback.on_epoch_end(epoch, logs)

            def on_train_begin(self, logs=None):
                callback.on_train_begin(logs)

            def on_train_end(self, logs=None):
                callback.on_train_end(logs)

        model.fit(
            x_train, y_train,
            epochs=model_config.epochs or 10,
            batch_size=model_config.batch_size or 32,
            validation_data=(x_test, y_test),
            callbacks=[KerasCallback()],
            verbose=0,
        )
    except Exception as e:
        _emit({"event": "error", "message": str(e)})
        raise


def _run_mock(model_name: str) -> None:
    """Simulated training for demo/dev when TensorFlow is unavailable."""
    import time
    import math

    epochs = 10
    callback = VisionProgressCallback(total_epochs=epochs)
    callback.on_train_begin()

    for epoch in range(epochs):
        time.sleep(0.5)
        callback.on_epoch_begin(epoch)
        time.sleep(0.3)
        loss = 1.5 * math.exp(-0.3 * epoch) + 0.05
        acc = 0.5 + 0.45 * (1 - math.exp(-0.3 * epoch))
        logs = {
            "loss": loss, "accuracy": acc,
            "val_loss": loss * 1.1, "val_accuracy": acc * 0.95
        }
        callback.on_epoch_end(epoch, logs)

    callback.on_train_end()
