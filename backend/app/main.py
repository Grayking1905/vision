"""Vision backend — FastAPI + Socket.IO entry point."""

import os
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_db_and_tables
from app.exceptions import AppException, app_exception_handler, generic_exception_handler
from app.routers import data_process, data_upload, deep_learning, pretrained, project
from app.socketio_instance import sio

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    create_db_and_tables()
    # Ensure upload/model directories exist
    os.makedirs(settings.upload_folder, exist_ok=True)
    os.makedirs(settings.model_folder, exist_ok=True)
    yield


app = FastAPI(
    title="Vision API",
    description="Low-code ML platform — Lego for Machine Learning",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

BASE = settings.api_base
app.include_router(project.router, prefix=BASE)
app.include_router(data_upload.router, prefix=BASE)
app.include_router(data_process.router, prefix=BASE)
app.include_router(deep_learning.router, prefix=BASE)
app.include_router(pretrained.router, prefix=BASE)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Vision API"}


# Wrap FastAPI with Socket.IO ASGI app
# Run with: uvicorn app.main:socket_app --reload --port 8000
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
