"""Shared Socket.IO server instance for real-time training progress."""

import socketio
from app.config import get_settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=get_settings().cors_allowed_origins_list,
    logger=False,
    engineio_logger=False,
)

TRAINING_NS = "/training"


@sio.on("connect", namespace=TRAINING_NS)
async def on_connect(sid, environ):
    pass


@sio.on("disconnect", namespace=TRAINING_NS)
async def on_disconnect(sid):
    pass
