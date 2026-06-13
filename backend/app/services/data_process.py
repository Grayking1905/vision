"""Data processing and EDA service."""

import uuid as uuid_pkg
from typing import Any

import numpy as np
import pandas as pd
from sqlmodel import Session, select

from app.config import get_settings
from app.models import DataFile, DataProcess


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def _get_file_path(file: DataFile) -> str:
    settings = get_settings()
    return f"{settings.upload_folder}/{file.file_name}.{file.file_type}"


def add_target_service(db: Session, file_id: str, target: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File doesn't exist")

    existing = db.exec(select(DataProcess).where(DataProcess.file_id == file_id)).first()
    if existing:
        existing.target = target
        db.add(existing)
    else:
        db.add(DataProcess(file_id=file_id, target=target))
    db.commit()
    return _resp(201, True, "Target field saved successfully")


def get_data_metrics(db: Session, file_id: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File doesn't exist")

    file_path = _get_file_path(file)
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        return _resp(500, False, f"File not found: {file_path}")
    except Exception as e:
        return _resp(500, False, f"Error reading CSV: {e}")

    metrics = {
        "data_types": df.dtypes.apply(str).to_dict(),
        "correlation_matrix": df.corr(numeric_only=True).map(str).to_dict(),
        "metric": df.describe().map(str).to_dict(),
        "shape": {"rows": len(df), "cols": len(df.columns)},
    }
    return _resp(200, True, "Metrics generated", metrics)


def get_correlation_matrix(db: Session, file_id: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File doesn't exist")

    file_path = _get_file_path(file)
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return _resp(500, False, f"Error reading CSV: {e}")

    numeric_df = df.select_dtypes(include="number")
    if numeric_df.empty:
        return _resp(200, True, "No numeric columns", {"columns": [], "matrix": []})

    corr = numeric_df.corr()
    columns = corr.columns.tolist()
    matrix = [[None if pd.isna(v) else round(float(v), 4) for v in row] for row in corr.to_numpy()]
    return _resp(200, True, "Correlation matrix computed", {"columns": columns, "matrix": matrix})


def get_column_stats_service(db: Session, file_id: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File doesn't exist")

    file_path = _get_file_path(file)
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return _resp(500, False, f"Error reading CSV: {e}")

    numeric_cols = df.select_dtypes(include="number").columns
    columns = []
    for col in df.columns:
        is_num = col in numeric_cols
        null_count = int(df[col].isnull().sum())
        entry: dict = {
            "column": col,
            "dtype": str(df[col].dtype),
            "count": int(df[col].count()),
            "null_count": null_count,
            "mean": round(float(df[col].mean()), 4) if is_num and pd.notna(df[col].mean()) else None,
            "min": round(float(df[col].min()), 4) if is_num else None,
            "max": round(float(df[col].max()), 4) if is_num else None,
            "unique": int(df[col].nunique()),
        }
        columns.append(entry)

    data = {"total_rows": len(df), "total_cols": len(df.columns), "columns": columns}
    return _resp(200, True, "Column statistics generated", data)


def get_file_data(db: Session, file_id: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File not found")

    file_path = _get_file_path(file)
    try:
        df = pd.read_csv(file_path, nrows=200)  # Limit preview
    except Exception as e:
        return _resp(500, False, f"Error reading CSV: {e}")

    return _resp(200, True, "Data retrieved", df.to_dict(orient="records"))


_VALID_TRANSFORMS = {"One Hot Encoding", "Categorical to Numerical", "Drop Column",
                     "Min-Max Normalization", "Z-score Standardization", "Log Transform"}


def preprocess_data(db: Session, file_id: str, transformations: list) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File doesn't exist")

    file_path = _get_file_path(file)
    try:
        df = pd.read_csv(file_path)
        for t in transformations:
            t_name = t.get("transformation", "")
            feature = t.get("feature", "")
            if t_name not in _VALID_TRANSFORMS:
                return _resp(422, False, f"Unknown transformation: {t_name}")
            if feature not in df.columns:
                return _resp(422, False, f"Column '{feature}' not found")

        for t in transformations:
            t_name = t.get("transformation")
            feature = t.get("feature")
            if t_name == "One Hot Encoding":
                df = pd.get_dummies(df, columns=[feature])
            elif t_name == "Categorical to Numerical":
                df[feature] = pd.Categorical(df[feature]).codes
            elif t_name == "Drop Column":
                df = df.drop(columns=[feature])
            elif t_name == "Min-Max Normalization":
                mn, mx = df[feature].min(), df[feature].max()
                df[feature] = 0.0 if np.isclose(mn, mx) else (df[feature] - mn) / (mx - mn)
            elif t_name == "Z-score Standardization":
                std = df[feature].std()
                df[feature] = 0.0 if std == 0 else (df[feature] - df[feature].mean()) / std
            elif t_name == "Log Transform":
                df[feature] = np.log1p(df[feature])

        df.to_csv(file_path, index=False)

        # Update cached columns
        file.columns = list(df.columns)
        db.add(file)
        db.commit()
        return _resp(200, True, "Dataset preprocessed successfully")
    except Exception as e:
        return _resp(500, False, f"Error preprocessing: {e}")
