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


SAMPLE_CATALOG = [
    {
        "id": "iris_classification",
        "name": "Iris Flower Classification",
        "filename": "iris_classification.csv",
        "task_type": "Classification",
        "problem_type_id": 1,
        "rows": 150,
        "features": 4,
        "target": "species_id",
        "loss": "sparse_categorical_crossentropy",
        "description": "Classic 3-class benchmark classifying iris species from sepal/petal measurements.",
        "badge": "Beginner Friendly",
        "color": "cyan",
    },
    {
        "id": "heart_disease",
        "name": "Heart Disease Risk",
        "filename": "heart_disease.csv",
        "task_type": "Binary Classification",
        "problem_type_id": 1,
        "rows": 300,
        "features": 11,
        "target": "heart_disease",
        "loss": "sparse_categorical_crossentropy",
        "description": "Clinical health attributes predicting risk of cardiac disease. Excellent for EDA heatmaps.",
        "badge": "Healthcare",
        "color": "violet",
    },
    {
        "id": "customer_churn",
        "name": "Customer Churn Prediction",
        "filename": "customer_churn.csv",
        "task_type": "Binary Classification",
        "problem_type_id": 1,
        "rows": 1000,
        "features": 8,
        "target": "churn",
        "loss": "sparse_categorical_crossentropy",
        "description": "Banking customer demographics and account behavior to predict churn.",
        "badge": "Business",
        "color": "amber",
    },
    {
        "id": "california_housing",
        "name": "California Housing Prices",
        "filename": "california_housing.csv",
        "task_type": "Regression",
        "problem_type_id": 2,
        "rows": 1000,
        "features": 8,
        "target": "median_house_value",
        "loss": "mean_squared_error",
        "description": "Predict median house values across California districts using census statistics.",
        "badge": "Regression",
        "color": "emerald",
    },
    {
        "id": "wine_quality",
        "name": "Wine Recognition",
        "filename": "wine_quality.csv",
        "task_type": "Multi-class Classification",
        "problem_type_id": 3,
        "rows": 178,
        "features": 13,
        "target": "cultivar_class",
        "loss": "sparse_categorical_crossentropy",
        "description": "Chemical analysis of 13 attributes from wines grown in a specific Italian region.",
        "badge": "Chemistry",
        "color": "pink",
    },
    {
        "id": "mnist_digits_mini",
        "name": "MNIST Handwritten Digits (8x8)",
        "filename": "mnist_digits_mini.csv",
        "task_type": "Image / Digits",
        "problem_type_id": 3,
        "rows": 500,
        "features": 64,
        "target": "digit_label",
        "loss": "sparse_categorical_crossentropy",
        "description": "Flattened 8x8 pixel grayscale values classifying digits 0 through 9.",
        "badge": "Vision Tabular",
        "color": "indigo",
    },
    {
        "id": "sample_images",
        "name": "Sample Geometric Shapes (ZIP)",
        "filename": "sample_images.zip",
        "task_type": "Image Archive",
        "problem_type_id": 1,
        "rows": 30,
        "features": 3,
        "target": "folder_label",
        "loss": "sparse_categorical_crossentropy",
        "description": "ZIP archive with labeled folders (circles, squares, triangles) for testing image uploads.",
        "badge": "Image Archive",
        "color": "blue",
    },
]


def list_sample_datasets_service() -> tuple:
    return _resp(200, True, "Sample datasets catalog retrieved", SAMPLE_CATALOG)


def load_sample_dataset_service(db: Session, sample_id: str, project_id: str | None = None) -> tuple:
    sample = next((s for s in SAMPLE_CATALOG if s["id"] == sample_id or s["filename"] == sample_id), None)
    if not sample:
        return _resp(404, False, f"Sample dataset '{sample_id}' not found")

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    demo_dir = os.path.join(base_dir, "demo_datasets")
    file_path = os.path.join(demo_dir, sample["filename"])

    if not os.path.exists(file_path):
        return _resp(404, False, f"Sample file '{sample['filename']}' not found on disk")

    with open(file_path, "rb") as f:
        content = f.read()

    return add_file_service(
        db=db,
        filename=sample["filename"],
        file_content=content,
        project_id=project_id,
    )

