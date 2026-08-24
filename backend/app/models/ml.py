"""SQLModel database models for ML models."""

import uuid as uuid_pkg
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.data import DataFile
    from app.models.project import Project


class ModelBasic(SQLModel, table=True):
    """Persisted ML model configuration."""

    __tablename__ = "model_basic"

    id: Optional[int] = Field(default=None, primary_key=True)
    model_name: str = Field(max_length=100, nullable=False, unique=True)
    file_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, ForeignKey("data_file.id"), index=True, nullable=True),
    )
    project_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=True),
    )
    model_type: Optional[int] = Field(default=None, nullable=True)
    target_field: Optional[str] = Field(default=None, max_length=100)
    training_split: Optional[float] = Field(default=None, nullable=True)
    optimizer: Optional[str] = Field(default=None, max_length=50, nullable=True)
    metric: Optional[str] = Field(default=None, max_length=50, nullable=True)
    epochs: Optional[int] = Field(default=None, nullable=True)
    batch_size: Optional[int] = Field(default=None, nullable=True)
    loss: Optional[str] = Field(default=None, max_length=50, nullable=True)
    is_trained: Optional[bool] = Field(default=False, nullable=True)
    trained_model_path: Optional[str] = Field(default=None, max_length=500, nullable=True)
    final_accuracy: Optional[float] = Field(default=None, nullable=True)
    final_loss: Optional[float] = Field(default=None, nullable=True)
    val_accuracy: Optional[float] = Field(default=None, nullable=True)
    val_loss: Optional[float] = Field(default=None, nullable=True)
    trained_at: Optional[datetime] = Field(default=None, nullable=True)
    created_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now())
    )

    project: Optional["Project"] = Relationship(back_populates="models")
    file: Optional["DataFile"] = Relationship(back_populates="model_basic")
    configs: list["ModelConfigs"] = Relationship(
        back_populates="model",
        sa_relationship_kwargs={"cascade": "all,delete"},
    )


class ModelConfigs(SQLModel, table=True):
    """Flattened key-value pairs for model graph configuration."""

    __tablename__ = "model_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    parameter: str = Field(max_length=200, nullable=False)
    value: str = Field(max_length=500, nullable=False)
    model_id: int = Field(foreign_key="model_basic.id", index=True)

    model: Optional[ModelBasic] = Relationship(back_populates="configs")
