"""SQLModel database models for pretrained models."""

import uuid as uuid_pkg
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.project import Project


class PretrainedModel(SQLModel, table=True):
    """Tracks a loaded pretrained model and its fine-tuning configuration."""

    __tablename__ = "pretrained_model"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=True),
    )
    base_model_key: str = Field(max_length=100, nullable=False)
    display_name: str = Field(max_length=200, nullable=False)
    include_top: bool = Field(default=False)

    # Fine-tuning configuration
    file_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, ForeignKey("data_file.id"), index=True, nullable=True),
    )
    target_field: Optional[str] = Field(default=None, max_length=100)
    freeze_layers: Optional[int] = Field(default=None, nullable=True)
    custom_head_json: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )  # JSON string: [{"units": 128, "activation": "relu"}, ...]
    fine_tune_lr: Optional[float] = Field(default=None, nullable=True)
    fine_tune_epochs: Optional[int] = Field(default=None, nullable=True)
    fine_tune_batch_size: Optional[int] = Field(default=None, nullable=True)
    problem_type: Optional[int] = Field(default=None, nullable=True)  # 1=classification, 2=regression
    optimizer: Optional[str] = Field(default="adam", max_length=50, nullable=True)

    status: str = Field(default="loaded", max_length=30)  # loaded | fine-tuning | fine-tuned | error
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    created_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now())
    )

    project: Optional["Project"] = Relationship(back_populates="pretrained_models")
