"""Data upload service."""

import os
import uuid as uuid_pkg
from typing import Any

import pandas as pd
from sqlmodel import Session, select

from app.config import get_settings
from app.models import DataFile


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def add_file_service(db: Session, filename: str, file_content: bytes, project_id: str | None = None) -> tuple:
    settings = get_settings()
    upload_folder = settings.upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    # Safe filename
    safe_name = "".join(c for c in filename.lower() if c.isalnum() or c in "._-")
    file_path = os.path.join(upload_folder, safe_name)

    with open(file_path, "wb") as f:
        f.write(file_content)

    parts = safe_name.rsplit(".", 1)
    file_name_db = parts[0]
    file_type_db = parts[1] if len(parts) > 1 else "csv"

    columns_list = None
    row_count = None
    if file_type_db == "csv":
        try:
            df_header = pd.read_csv(file_path, nrows=0)
            columns_list = list(df_header.columns)
            row_count = sum(c.shape[0] for c in pd.read_csv(file_path, chunksize=10_000))
        except Exception:
            pass

    record = DataFile(
        file_name=file_name_db,
        file_type=file_type_db,
        project_id=project_id,
        columns=columns_list,
        row_count=row_count,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _resp(201, True, "File saved successfully", {"file_id": str(record.id)})


def get_all_files_service(db: Session, project_id: str | None = None) -> tuple:
    settings = get_settings()
    upload_folder = settings.upload_folder

    stmt = select(DataFile)
    if project_id:
        stmt = stmt.where(DataFile.project_id == project_id)

    files = db.exec(stmt).all()
    data = []
    for file in files:
        fields = file.columns or []
        row_count = file.row_count or 0
        data.append({
            "file_name": file.file_name,
            "file_type": file.file_type,
            "file_id": str(file.id),
            "fields": fields,
            "row_count": row_count,
            "created_on": file.created_on.isoformat() if file.created_on else None,
        })
    return _resp(200, True, "Files retrieved", data)


def delete_file_service(db: Session, file_id: str) -> tuple:
    settings = get_settings()
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(404, False, "File not found")

    file_path = os.path.join(settings.upload_folder, f"{file.file_name}.{file.file_type}")
    db.delete(file)
    db.commit()

    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    return _resp(200, True, "File deleted")
