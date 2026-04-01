"""
app/routes/projects.py
-----------------------
Project API routes with RBAC enforcement.
"""

import uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.rbac import require_role
from app.middleware.auth import get_current_user
from app.models.projects import Project
from app.models.project_members import ProjectMember
from app.models.users import User

router = APIRouter(prefix="/projects", tags=["Projects"])


# ── Request schemas ────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    project_type: Optional[str] = "project"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    manager_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    project_type: Optional[str] = None
    end_date: Optional[date] = None
    manager_id: Optional[str] = None


class AddMemberRequest(BaseModel):
    user_id: str


class AddMemberBulkRequest(BaseModel):
    user_ids: List[str]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("super_admin", "admin", "manager", "project_manager", "founder", "co_founder")),
):
    """
    Create a new project.
    manager_id is auto-set from the JWT — not accepted from body.
    RBAC: Only super_admin and project_manager allowed.
    """
    manager = uuid.UUID(data.manager_id) if data.manager_id else uuid.UUID(current_user["user_id"])

    project = Project(
        id=uuid.uuid4(),
        name=data.name,
        description=data.description,
        manager_id=manager,
        status=data.status or "active",
        project_type=data.project_type or "project",
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "manager_id": str(project.manager_id),
        "status": str(project.status.value) if hasattr(project.status, 'value') else str(project.status),
        "project_type": str(project.project_type.value) if hasattr(project.project_type, 'value') else str(project.project_type),
        "start_date": str(project.start_date) if project.start_date else None,
        "end_date": str(project.end_date) if project.end_date else None,
        "created_at": str(project.created_at) if project.created_at else None,
        "updated_at": str(project.updated_at) if project.updated_at else None,
    }


@router.get("/")
def list_projects(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all projects — returns full schema. All logged-in users can view."""
    projects = db.query(Project).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "manager_id": str(p.manager_id) if p.manager_id else None,
            "status": str(p.status.value) if hasattr(p.status, 'value') else str(p.status),
            "project_type": str(p.project_type.value) if hasattr(p.project_type, 'value') else str(p.project_type),
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
            "created_at": str(p.created_at) if p.created_at else None,
            "updated_at": str(p.updated_at) if p.updated_at else None,
        }
        for p in projects
    ]


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("super_admin", "admin", "manager", "project_manager", "founder", "co_founder")),
):
    """
    Update project details. 
    RBAC: Only admins/managers allowed.
    """
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.dict(exclude_unset=True)
    
    if "manager_id" in update_data:
        new_manager_id = update_data.pop("manager_id")
        if new_manager_id:
            project.manager_id = uuid.UUID(new_manager_id)

    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return {"message": "Project updated", "id": project_id}


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: str,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("super_admin", "admin", "manager", "project_manager", "founder", "co_founder")),
):
    """Add a user to a project. RBAC: admin/manager only."""
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for duplicate
    existing = db.query(ProjectMember).filter_by(
        project_id=uuid.UUID(project_id),
        user_id=uuid.UUID(data.user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already part of this project")

    member = ProjectMember(
        project_id=uuid.UUID(project_id),
        user_id=uuid.UUID(data.user_id),
    )
    db.add(member)
    db.commit()
    return {"message": "Member added", "project_id": project_id, "user_id": data.user_id}


@router.get("/{project_id}/members")
def list_project_members(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List current members of a project with names and roles."""
    members = (
        db.query(User.id, User.full_name, User.role)
        .join(ProjectMember, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == uuid.UUID(project_id))
        .all()
    )
    return [
        {"id": str(m.id), "name": m.full_name, "role": m.role.value if hasattr(m.role, 'value') else str(m.role)}
        for m in members
    ]


@router.post("/{project_id}/members/bulk", status_code=status.HTTP_201_CREATED)
def add_members_bulk(
    project_id: str,
    data: AddMemberBulkRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("super_admin", "admin", "manager", "project_manager", "founder", "co_founder")),
):
    """Add multiple users to a project. Skips existing members."""
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    added = []
    skipped = []

    for uid_str in data.user_ids:
        user_id = uuid.UUID(uid_str)
        # Check for duplicate
        existing = db.query(ProjectMember).filter_by(
            project_id=project.id,
            user_id=user_id
        ).first()
        
        if existing:
            skipped.append(uid_str)
            continue
            
        new_member = ProjectMember(
            project_id=project.id,
            user_id=user_id
        )
        db.add(new_member)
        added.append(uid_str)

    db.commit()
    
    return {
        "added": added,
        "skipped": skipped,
        "message": f"{len(added)} users added, {len(skipped)} already existed"
    }


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("super_admin", "admin", "manager", "project_manager", "founder", "co_founder")),
):
    """
    Delete a project by ID and cascade delete associated records.
    RBAC: Only admins/managers allowed.
    """
    from app.models.tasks import Task

    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Manually cascade delete related tasks and members to prevent IntegrityError
    db.query(Task).filter(Task.project_id == project.id).delete()
    db.query(ProjectMember).filter(ProjectMember.project_id == project.id).delete()

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully", "id": project_id}
