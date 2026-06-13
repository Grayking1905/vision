"""Data processing API router."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_db
from app.services.data_process import (
    add_target_service,
    get_column_stats_service,
    get_correlation_matrix,
    get_file_data,
    preprocess_data,
)

router = APIRouter(prefix="/data", tags=["data-process"])


class TargetRequest(BaseModel):
    file_id: str
    target: str


class TransformItem(BaseModel):
    feature: str
    transformation: str
    params: dict = {}


class PreprocessRequest(BaseModel):
    file_id: str
    transformations: list[TransformItem]


@router.post("/target")
def set_target(req: TargetRequest, db: Session = Depends(get_db)):
    body, code = add_target_service(db, file_id=req.file_id, target=req.target)
    return JSONResponse(status_code=code, content=body)


@router.get("/{file_id}/correlation")
def get_correlation(file_id: str, db: Session = Depends(get_db)):
    body, code = get_correlation_matrix(db, file_id=file_id)
    return JSONResponse(status_code=code, content=body)


@router.get("/{file_id}/stats")
def get_stats(file_id: str, db: Session = Depends(get_db)):
    body, code = get_column_stats_service(db, file_id=file_id)
    return JSONResponse(status_code=code, content=body)


@router.get("/{file_id}/preview")
def preview_data(file_id: str, db: Session = Depends(get_db)):
    body, code = get_file_data(db, file_id=file_id)
    return JSONResponse(status_code=code, content=body)


@router.post("/preprocess")
def preprocess(req: PreprocessRequest, db: Session = Depends(get_db)):
    transforms = [t.model_dump() for t in req.transformations]
    body, code = preprocess_data(db, file_id=req.file_id, transformations=transforms)
    return JSONResponse(status_code=code, content=body)
