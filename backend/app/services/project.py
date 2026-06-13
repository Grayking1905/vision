"""Project CRUD service."""

from typing import Any
from sqlmodel import Session, select
from app.models import Project


def _resp(status_code: int, success: bool, message: str, data: Any = None) -> tuple:
    return {"success": success, "message": message, "data": data}, status_code


def create_project_service(db: Session, name: str, description: str | None = None) -> tuple:
    project = Project(name=name, description=description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _resp(201, True, "Project created", _serialize(project))


def get_all_projects_service(db: Session) -> tuple:
    projects = db.exec(select(Project)).all()
    return _resp(200, True, "Projects retrieved", [_serialize(p) for p in projects])


def get_project_service(db: Session, project_id: str) -> tuple:
    project = db.get(Project, project_id)
    if not project:
        return _resp(404, False, "Project not found")
    return _resp(200, True, "Project found", _serialize(project))


def delete_project_service(db: Session, project_id: str) -> tuple:
    project = db.get(Project, project_id)
    if not project:
        return _resp(404, False, "Project not found")
    db.delete(project)
    db.commit()
    return _resp(200, True, "Project deleted")


def _serialize(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description,
        "created_on": p.created_on.isoformat() if p.created_on else None,
    }
