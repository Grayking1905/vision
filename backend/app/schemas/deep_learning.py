"""Pydantic schemas for deep learning endpoints."""

from typing import Any, Optional
from pydantic import BaseModel


class NodeData(BaseModel):
    params: dict[str, Any] = {}


class Node(BaseModel):
    id: str
    type: str
    position: dict[str, float] = {}
    data: NodeData = NodeData()


class Edge(BaseModel):
    source: str
    target: str
    id: Optional[str] = None


class GraphModel(BaseModel):
    nodes: list[Node] = []
    edges: list[Edge] = []


class ModelSaveRequest(BaseModel):
    model: GraphModel
    model_name: str
    project_id: Optional[str] = None


class TrainingConfigRequest(BaseModel):
    model_name: str
    file_id: str
    target_field: Optional[str] = None
    training_split: float
    problem_type_id: int
    optimizer: str
    metric: str
    epochs: int
    batch_size: int = 32
    project_id: Optional[str] = None


class ModelNameRequest(BaseModel):
    model_name: str
    project_id: Optional[str] = None


class TranspileRequest(BaseModel):
    nodes: list[Node] = []
    edges: list[Edge] = []
