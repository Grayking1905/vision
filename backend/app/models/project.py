"""Project model."""

import uuid as uuid_pkg
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, String, func
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.data import DataFile
    from app.models.ml import ModelBasic


class Project(SQLModel, table=True):
    """A Vision workspace project."""

    __tablename__ = "project"

    id: str = Field(
        default_factory=lambda: str(uuid_pkg.uuid4()),
        primary_key=True,
    )
    name: str = Field(max_length=200, nullable=False)
    description: Optional[str] = Field(default=None, max_length=500)
    created_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now())
    )
    updated_on: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, server_default=func.now(), onupdate=func.now())
    )

    files: list["DataFile"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all,delete"},
    )
    models: list["ModelBasic"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all,delete"},
    )
