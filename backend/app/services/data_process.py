"""Data processing and EDA service with support for Tabular CSV and Image ZIP datasets."""

import base64
import io
import os
import uuid as uuid_pkg
import zipfile
from typing import Any

import numpy as np
import pandas as pd
from PIL import Image
from sqlmodel import Session, select

from app.config import get_settings
from app.models import DataFile, DataProcess


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def _get_file_path(file: DataFile) -> str:
    settings = get_settings()
    cand1 = os.path.join(settings.upload_folder, f"{file.file_name}.{file.file_type}")
    cand2 = os.path.join(settings.upload_folder, file.file_name)
    if os.path.exists(cand1):
        return cand1
    if os.path.exists(cand2):
        return cand2

    # Check demo datasets fallback
    demo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "demo_datasets", f"{file.file_name}.{file.file_type}"))
    if os.path.exists(demo_path):
        return demo_path

    return cand1


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
    if file.file_type == "zip":
        return get_column_stats_service(db, file_id)

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

    if file.file_type == "zip":
        return _resp(200, True, "Correlation matrix is only applicable to tabular CSV datasets.", {"columns": [], "matrix": [], "dataset_type": "image_zip"})

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

    # ── Image ZIP Dataset Processing ─────────────────────────────────────────
    if file.file_type == "zip":
        try:
            if not os.path.exists(file_path):
                return _resp(404, False, f"ZIP dataset file not found at: {file_path}")

            image_exts = (".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff")
            class_counts: dict[str, int] = {}
            sample_previews = []
            resolutions = set()
            color_modes = set()
            total_images = 0

            with zipfile.ZipFile(file_path, "r") as zf:
                all_names = [n for n in zf.namelist() if n.lower().endswith(image_exts) and not n.startswith("__MACOSX")]
                total_images = len(all_names)

                for name in all_names:
                    parts = name.replace("\\", "/").split("/")
                    cls = parts[-2] if len(parts) > 1 and parts[-2] not in (".", "..", "dataset", "images", "data") else "default"
                    class_counts[cls] = class_counts.get(cls, 0) + 1

                    # Extract up to 24 thumbnail previews
                    if len(sample_previews) < 24:
                        try:
                            img_bytes = zf.read(name)
                            img = Image.open(io.BytesIO(img_bytes))
                            resolutions.add(f"{img.width}×{img.height}")
                            color_modes.add(img.mode)

                            # Create small thumbnail
                            thumb = img.copy()
                            thumb.thumbnail((128, 128))
                            thumb_buf = io.BytesIO()
                            thumb.convert("RGB").save(thumb_buf, format="JPEG", quality=75)
                            b64 = base64.b64encode(thumb_buf.getvalue()).decode("utf-8")

                            sample_previews.append({
                                "filename": os.path.basename(name),
                                "path": name,
                                "class_name": cls,
                                "dimensions": f"{img.width}×{img.height}",
                                "format": img.format or "JPEG",
                                "mode": img.mode,
                                "thumbnail_b64": f"data:image/jpeg;base64,{b64}",
                            })
                        except Exception:
                            pass

            classes_list = sorted(list(class_counts.keys()))
            class_summary = [
                {
                    "class_name": c,
                    "count": class_counts[c],
                    "percentage": round((class_counts[c] / total_images) * 100, 1) if total_images > 0 else 0,
                }
                for c in classes_list
            ]

            histogram = [{"bin": c["class_name"], "count": c["count"]} for c in class_summary]

            columns_info = [
                {
                    "column": "class_category",
                    "dtype": "category",
                    "count": total_images,
                    "null_count": 0,
                    "unique": len(classes_list),
                    "mean": None,
                    "std": None,
                    "median": None,
                    "min": None,
                    "max": None,
                    "histogram": histogram,
                }
            ]

            data = {
                "dataset_type": "image_zip",
                "total_rows": total_images,
                "total_cols": len(classes_list),
                "total_images": total_images,
                "total_classes": len(classes_list),
                "classes": class_summary,
                "resolutions": list(resolutions),
                "color_modes": list(color_modes),
                "sample_previews": sample_previews,
                "columns": columns_info,
            }
            return _resp(200, True, "Image dataset statistics generated", data)

        except Exception as e:
            return _resp(500, False, f"Error processing ZIP dataset: {e}")

    # ── Tabular CSV Dataset Processing ───────────────────────────────────────
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return _resp(500, False, f"Error reading CSV: {e}")

    numeric_cols = df.select_dtypes(include="number").columns
    columns = []
    for col in df.columns:
        is_num = col in numeric_cols
        null_count = int(df[col].isnull().sum())

        histogram = None
        if is_num and pd.notna(df[col].mean()) and len(df[col].dropna()) > 0:
            counts, bins = np.histogram(df[col].dropna(), bins=10)
            histogram = [{"bin": f"{round(bins[i], 2)} to {round(bins[i+1], 2)}", "count": int(counts[i])} for i in range(len(counts))]

        entry: dict = {
            "column": col,
            "dtype": str(df[col].dtype),
            "count": int(df[col].count()),
            "null_count": null_count,
            "mean": round(float(df[col].mean()), 4) if is_num and pd.notna(df[col].mean()) else None,
            "std": round(float(df[col].std()), 4) if is_num and pd.notna(df[col].std()) else None,
            "median": round(float(df[col].median()), 4) if is_num and pd.notna(df[col].median()) else None,
            "min": round(float(df[col].min()), 4) if is_num and pd.notna(df[col].min()) else None,
            "max": round(float(df[col].max()), 4) if is_num and pd.notna(df[col].max()) else None,
            "unique": int(df[col].nunique()),
            "histogram": histogram,
        }
        columns.append(entry)

    data = {
        "dataset_type": "tabular_csv",
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "columns": columns,
    }
    return _resp(200, True, "Column statistics generated", data)


def get_file_data(db: Session, file_id: str) -> tuple:
    file = db.exec(select(DataFile).where(DataFile.id == file_id)).first()
    if not file:
        return _resp(400, False, "File not found")

    file_path = _get_file_path(file)

    if file.file_type == "zip":
        try:
            image_exts = (".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff")
            images = []
            with zipfile.ZipFile(file_path, "r") as zf:
                all_names = [n for n in zf.namelist() if n.lower().endswith(image_exts) and not n.startswith("__MACOSX")]
                for name in all_names[:100]:
                    parts = name.replace("\\", "/").split("/")
                    cls = parts[-2] if len(parts) > 1 and parts[-2] not in (".", "..", "dataset", "images", "data") else "default"
                    size_kb = round(zf.getinfo(name).file_size / 1024, 1)
                    images.append({
                        "file_name": os.path.basename(name),
                        "class_name": cls,
                        "size_kb": size_kb,
                        "path": name,
                    })
            return _resp(200, True, "Images manifest retrieved", images)
        except Exception as e:
            return _resp(500, False, f"Error reading ZIP: {e}")

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
