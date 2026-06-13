"""SQLModel database models for data management."""

import uuid as uuid_pkg
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, func
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.ml import ModelBasic
    from app.models.project import Project


class DataFile(SQLModel, table=True):
    """Uploaded dataset file (CSV or ZIP image archive)."""

    __tablename__ = "data_file"

    id: str = Field(
        default_factory=lambda: str(uuid_pkg.uuid4()),
        primary_key=True,
    )
    file_name: str = Field(max_length=200, nullable=False)
    file_type: str = Field(max_length=10, nullable=False)
    columns: Optional[list] = Field(default=None, sa_column=Column(JSON, nullable=True))
    row_count: Optional[int] = Field(default=None, nullable=True)
    project_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=True),
    )
    created_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now())
    )

    project: Optional["Project"] = Relationship(back_populates="files")
    model_basic: Optional["ModelBasic"] = Relationship(
        back_populates="file",
        sa_relationship_kwargs={"uselist": False, "cascade": "all,delete"},
    )
    target: Optional["DataProcess"] = Relationship(
        back_populates="file",
        sa_relationship_kwargs={"uselist": False, "cascade": "all,delete"},
    )


class DataProcess(SQLModel, table=True):
    """Target field assignment linking a DataFile to its prediction column."""

    __tablename__ = "data_process"

    id: Optional[int] = Field(default=None, primary_key=True)
    target: str = Field(max_length=100, nullable=False)
    file_id: str = Field(
        sa_column=Column(String, ForeignKey("data_file.id"), index=True, nullable=False)
    )
    created_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now())
    )

    file: Optional[DataFile] = Relationship(back_populates="target")


class ImageProperties(SQLModel, table=True):
    """Image dataset preprocessing parameters."""

    __tablename__ = "image_properties"

    id: str = Field(
        sa_column=Column(String, ForeignKey("data_file.id"), primary_key=True)
    )
    image_size: int = Field(nullable=False)
    batch_size: int = Field(nullable=False)
    color_mode: str = Field(max_length=10, nullable=False, default="rgb")
    label_mode: str = Field(max_length=15, nullable=False, default="int")
