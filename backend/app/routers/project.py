"""Project API router."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.database import get_db
from app.schemas.project import ProjectCreate
from app.services.project import (
    create_project_service,
    delete_project_service,
    get_all_projects_service,
    get_project_service,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    body, code = get_all_projects_service(db)
    return JSONResponse(status_code=code, content=body)


@router.post("")
def create_project(req: ProjectCreate, db: Session = Depends(get_db)):
    body, code = create_project_service(db, name=req.name, description=req.description)
    return JSONResponse(status_code=code, content=body)


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    body, code = get_project_service(db, project_id)
    return JSONResponse(status_code=code, content=body)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    body, code = delete_project_service(db, project_id)
    return JSONResponse(status_code=code, content=body)
