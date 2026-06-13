"""Deep learning API router."""

import asyncio
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Session

from app.database import get_db
from app.schemas.deep_learning import (
    ModelNameRequest,
    ModelSaveRequest,
    TrainingConfigRequest,
    TranspileRequest,
)
from app.services.code_generation import transpile_graph
from app.services.deep_learning import (
    delete_model_service,
    get_code_service,
    get_model_graph_service,
    get_model_list_service,
    run_model_service,
    save_model_service,
    update_training_config_service,
)

router = APIRouter(prefix="/model", tags=["deep-learning"])


@router.post("/transpile")
def transpile(req: TranspileRequest):
    """Live code generation — no DB writes, returns Python code string."""
    nodes = [n.model_dump() for n in req.nodes]
    edges = [e.model_dump() for e in req.edges]
    code = transpile_graph(nodes, edges)
    return JSONResponse(content={"success": True, "code": code})


@router.post("/save")
def save_model(req: ModelSaveRequest, db: Session = Depends(get_db)):
    body, code = save_model_service(
        db,
        model_params=req.model.model_dump(),
        model_name=req.model_name,
        project_id=req.project_id,
    )
    return JSONResponse(status_code=code, content=body)


@router.patch("/training-config")
def update_training_config(req: TrainingConfigRequest, db: Session = Depends(get_db)):
    body, code = update_training_config_service(
        db, model_name=req.model_name, config=req.model_dump(), project_id=req.project_id
    )
    return JSONResponse(status_code=code, content=body)


@router.post("/run")
async def run_model(req: ModelNameRequest, db: Session = Depends(get_db)):
    loop = asyncio.get_running_loop()
    body, code = await run_model_service(db, model_name=req.model_name, project_id=req.project_id, loop=loop)
    return JSONResponse(status_code=code, content=body)


@router.post("/code")
def get_code(req: ModelNameRequest, db: Session = Depends(get_db)):
    result, code = get_code_service(db, model_name=req.model_name, project_id=req.project_id)
    if code == 200:
        return StreamingResponse(
            io.BytesIO(result["content"].encode()),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={result['file_name']}"},
        )
    return JSONResponse(status_code=code, content=result)


@router.get("/list")
def list_models(project_id: str | None = Query(None), db: Session = Depends(get_db)):
    body, code = get_model_list_service(db, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.get("/{model_name}/graph")
def get_graph(model_name: str, project_id: str | None = Query(None), db: Session = Depends(get_db)):
    body, code = get_model_graph_service(db, model_name=model_name, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.delete("/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    body, code = delete_model_service(db, model_id=model_id)
    return JSONResponse(status_code=code, content=body)
