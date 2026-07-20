"""Pretrained model API router."""

import asyncio
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Session

from app.database import get_db
from app.schemas.pretrained import (
    FineTuneCodeRequest,
    FineTuneConfigRequest,
    FineTuneRunRequest,
    LoadPretrainedRequest,
)
from app.services.pretrained_catalog import get_catalog
from app.services.pretrained_service import (
    delete_pretrained_service,
    generate_fine_tune_code_service,
    get_model_summary_service,
    list_pretrained_service,
    load_pretrained_service,
    reverse_engineer_service,
    run_fine_tune_service,
    save_fine_tune_config_service,
)

router = APIRouter(prefix="/pretrained", tags=["pretrained"])


@router.get("/catalog")
def catalog():
    """List all available pretrained models."""
    models = get_catalog()
    return JSONResponse(content={"success": True, "models": models})


@router.get("/list")
def list_pretrained(project_id: str | None = Query(None), db: Session = Depends(get_db)):
    """List loaded pretrained models for a project."""
    body, code = list_pretrained_service(db, project_id)
    return JSONResponse(status_code=code, content=body)


@router.post("/load")
def load_pretrained(req: LoadPretrainedRequest, db: Session = Depends(get_db)):
    """Load a pretrained model into the project."""
    body, code = load_pretrained_service(
        db,
        key=req.base_model_key,
        include_top=req.include_top,
        project_id=req.project_id,
    )
    return JSONResponse(status_code=code, content=body)


@router.get("/{pretrained_id}/reverse-engineer")
def reverse_engineer(pretrained_id: int, db: Session = Depends(get_db)):
    """Decompose a pretrained model into a ReactFlow graph."""
    body, code = reverse_engineer_service(db, pretrained_id)
    return JSONResponse(status_code=code, content=body)


@router.get("/{pretrained_id}/summary")
def model_summary(pretrained_id: int, db: Session = Depends(get_db)):
    """Get layer-by-layer summary of a loaded pretrained model."""
    body, code = get_model_summary_service(db, pretrained_id)
    return JSONResponse(status_code=code, content=body)


@router.patch("/fine-tune/config")
def fine_tune_config(req: FineTuneConfigRequest, db: Session = Depends(get_db)):
    """Save fine-tuning configuration."""
    body, code = save_fine_tune_config_service(db, req.model_dump())
    return JSONResponse(status_code=code, content=body)


@router.post("/fine-tune/run")
async def fine_tune_run(req: FineTuneRunRequest, db: Session = Depends(get_db)):
    """Start fine-tuning with Socket.IO progress streaming."""
    loop = asyncio.get_running_loop()
    body, code = await run_fine_tune_service(db, req.pretrained_id, loop)
    return JSONResponse(status_code=code, content=body)


@router.post("/fine-tune/code")
def fine_tune_code(req: FineTuneCodeRequest, db: Session = Depends(get_db)):
    """Generate fine-tuning Python script."""
    result, code = generate_fine_tune_code_service(db, req.pretrained_id)
    if code == 200:
        return StreamingResponse(
            io.BytesIO(result["content"].encode()),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={result['file_name']}"},
        )
    return JSONResponse(status_code=code, content=result)




@router.delete("/{pretrained_id}")
def delete_pretrained(pretrained_id: int, db: Session = Depends(get_db)):
    """Delete a loaded pretrained model."""
    body, code = delete_pretrained_service(db, pretrained_id)
    return JSONResponse(status_code=code, content=body)
