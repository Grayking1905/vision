"""Deep learning API router."""

import asyncio
import io
import os

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlmodel import Session, select

from app.config import get_settings
from app.database import get_db
from app.models import ModelBasic, PretrainedModel
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
    get_trained_models_service,
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
    config_overrides = req.model_dump(exclude_unset=True)
    body, code = await run_model_service(
        db,
        model_name=req.model_name,
        project_id=req.project_id,
        loop=loop,
        config_overrides=config_overrides,
    )
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


@router.get("/trained/list")
def list_trained_models(project_id: str | None = Query(None), db: Session = Depends(get_db)):
    body, code = get_trained_models_service(db, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.get("/trained/{model_name}/download")
def download_trained_model(model_name: str, format: str = Query("keras")):
    settings = get_settings()
    if format == "weights":
        file_path = os.path.join(settings.trained_model_folder, f"{model_name}_weights.weights.h5")
        filename = f"{model_name}_weights.weights.h5"
    elif format == "metadata":
        file_path = os.path.join(settings.trained_model_folder, f"{model_name}_metadata.json")
        filename = f"{model_name}_metadata.json"
    else:
        file_path = os.path.join(settings.trained_model_folder, f"{model_name}_trained.keras")
        filename = f"{model_name}_trained.keras"

    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"success": False, "message": "Trained model artifact not found"})

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename,
    )


@router.post("/trained/{model_name}/export-to-pretrained")
def export_to_pretrained(model_name: str, db: Session = Depends(get_db)):
    """Registers the locally trained model into the Pretrained Models catalogue for fine-tuning."""
    settings = get_settings()
    model = db.exec(select(ModelBasic).where(ModelBasic.model_name == model_name)).first()
    if not model or not model.is_trained:
        return JSONResponse(status_code=404, content={"success": False, "message": "Trained model not found"})

    keras_file = os.path.join(settings.trained_model_folder, f"{model_name}_trained.keras")
    if not os.path.exists(keras_file):
        return JSONResponse(status_code=404, content={"success": False, "message": "Trained model file missing on disk"})

    # Check if already registered
    existing = db.exec(
        select(PretrainedModel).where(
            PretrainedModel.base_model_key == f"trained_{model_name}",
            PretrainedModel.project_id == model.project_id,
        )
    ).first()

    if not existing:
        pretrained_record = PretrainedModel(
            display_name=f"Custom: {model_name}",
            base_model_key=f"trained_{model_name}",
            project_id=model.project_id,
            file_id=model.file_id,
            target_field=model.target_field,
            include_top=False,
            problem_type=model.model_type or 1,
            optimizer=model.optimizer or "adam",
            status="loaded",
        )
        db.add(pretrained_record)
        db.commit()
        db.refresh(pretrained_record)
        return JSONResponse(content={
            "success": True,
            "message": f"Trained model '{model_name}' successfully added to Pretrained Models catalogue for fine-tuning!",
            "pretrained_id": pretrained_record.id,
        })

    return JSONResponse(content={
        "success": True,
        "message": f"Model '{model_name}' is already in Pretrained Models catalogue",
        "pretrained_id": existing.id,
    })


@router.get("/{model_name}/graph")
def get_graph(model_name: str, project_id: str | None = Query(None), db: Session = Depends(get_db)):
    body, code = get_model_graph_service(db, model_name=model_name, project_id=project_id)
    return JSONResponse(status_code=code, content=body)


@router.delete("/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    body, code = delete_model_service(db, model_id=model_id)
    return JSONResponse(status_code=code, content=body)
