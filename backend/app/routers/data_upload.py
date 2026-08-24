"""Data upload API router."""

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlmodel import Session

from pydantic import BaseModel
from app.database import get_db
from app.services.data_upload import (
    add_file_service,
    delete_file_service,
    get_all_files_service,
    list_sample_datasets_service,
    load_sample_dataset_service,
)

router = APIRouter(prefix="/files", tags=["data-upload"])


class LoadSampleRequest(BaseModel):
    sample_id: str
    project_id: str | None = None


@router.get("/samples")
def list_sample_datasets():
    """List built-in demo sample datasets with metadata."""
    body, code = list_sample_datasets_service()
    return JSONResponse(status_code=code, content=body)


@router.post("/samples/load")
def load_sample_dataset(req: LoadSampleRequest, db: Session = Depends(get_db)):
    """1-Click load a demo sample dataset into the active project."""
    body, code = load_sample_dataset_service(db, sample_id=req.sample_id, project_id=req.project_id)
    return JSONResponse(status_code=code, content=body)


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    project_id: str | None = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    body, code = add_file_service(db, filename=file.filename, file_content=content, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.get("")
def list_files(project_id: str | None = Query(None), db: Session = Depends(get_db)):
    body, code = get_all_files_service(db, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.delete("/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db)):
    body, code = delete_file_service(db, file_id=file_id)
    return JSONResponse(status_code=code, content=body)
