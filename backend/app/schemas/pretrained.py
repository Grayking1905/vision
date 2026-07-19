"""Pydantic schemas for pretrained model endpoints."""

from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Catalog ──────────────────────────────────────────────────────────────

class CatalogEntry(BaseModel):
    key: str
    name: str
    params: str
    input_shape: list[int]
    size: str  # small | medium | large
    description: str


class CatalogResponse(BaseModel):
    success: bool = True
    models: list[CatalogEntry]


# ── Load ─────────────────────────────────────────────────────────────────

class LoadPretrainedRequest(BaseModel):
    base_model_key: str
    include_top: bool = False
    project_id: Optional[str] = None


class LayerInfo(BaseModel):
    name: str
    type: str
    output_shape: str
    param_count: int
    trainable: bool


class LoadPretrainedResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


# ── Reverse Engineer ─────────────────────────────────────────────────────

class ReverseEngineerResponse(BaseModel):
    success: bool
    nodes: list[dict] = []
    edges: list[dict] = []
    layer_count: int = 0


# ── Model Summary ────────────────────────────────────────────────────────

class ModelSummaryResponse(BaseModel):
    success: bool
    layers: list[LayerInfo] = []
    total_params: int = 0
    trainable_params: int = 0
    non_trainable_params: int = 0


# ── Fine-tune Config ─────────────────────────────────────────────────────

class HeadLayer(BaseModel):
    units: int = 128
    activation: str = "relu"


class FineTuneConfigRequest(BaseModel):
    pretrained_id: int
    file_id: str
    target_field: Optional[str] = None
    freeze_layers: int = 0
    custom_head: list[HeadLayer] = []
    learning_rate: float = 0.001
    epochs: int = 10
    batch_size: int = 32
    problem_type: int = 1  # 1=classification, 2=regression
    optimizer: str = "adam"
    project_id: Optional[str] = None


class FineTuneRunRequest(BaseModel):
    pretrained_id: int
    project_id: Optional[str] = None


class FineTuneCodeRequest(BaseModel):
    pretrained_id: int
    project_id: Optional[str] = None


# ── List / Delete ────────────────────────────────────────────────────────

class PretrainedIdRequest(BaseModel):
    pretrained_id: int
    project_id: Optional[str] = None
