"""
app/routes/finance.py
---------------------
Finance entry routes — strictest RBAC in the system.
POST: super_admin ONLY
GET:  super_admin + admin + founder + co_founder (manager/employee fully blocked with 403)
"""

import uuid
import io
import csv
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.rbac import require_role
from app.middleware.auth import get_current_user
from app.models.finance_entries import FinanceEntry
from app.models.projects import Project

router = APIRouter(prefix="/finance", tags=["Finance"])

FINANCE_ROLES = ("super_admin", "admin", "founder", "co_founder")


class FinanceCreate(BaseModel):
    amount: float
    type: str # 'income' or 'expense'
    description: Optional[str] = None
    project_id: Optional[str] = None
    is_client_advance: bool = False
    client_name: Optional[str] = None
    advance_amount: Optional[float] = None


class FinanceUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    is_client_advance: Optional[bool] = None
    client_name: Optional[str] = None
    advance_amount: Optional[float] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_finance_entry(
    data: FinanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*FINANCE_ROLES)),
):
    """
    Create a finance entry.
    RBAC: Restricted to finance roles only.
    """
    if data.project_id:
        project = db.query(Project).filter(Project.id == uuid.UUID(data.project_id)).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    if data.is_client_advance and not data.client_name:
        raise HTTPException(status_code=400, detail="Client name is required for client advances")

    entry = FinanceEntry(
        id=uuid.uuid4(),
        amount=data.amount,
        type=data.type,
        description=data.description,
        project_id=uuid.UUID(data.project_id) if data.project_id else None,
        created_by=uuid.UUID(current_user["user_id"]),
        is_client_advance=data.is_client_advance,
        client_name=data.client_name,
        advance_amount=data.advance_amount if data.is_client_advance else None,
        currency="INR",    # default value
        category="general",# default value
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "message": "Finance entry created",
        "entry": {
            "id": str(entry.id),
            "amount": entry.amount,
            "type": entry.type,
            "description": entry.description,
            "project_id": str(entry.project_id) if entry.project_id else None,
            "created_by": str(entry.created_by),
            "is_client_advance": entry.is_client_advance,
            "client_name": entry.client_name,
            "advance_amount": entry.advance_amount,
        },
    }


@router.patch("/{entry_id}")
def update_finance_entry(
    entry_id: str,
    data: FinanceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*FINANCE_ROLES)),
):
    """
    Update a finance entry.
    RBAC: Restricted to finance roles only.
    """
    entry = db.query(FinanceEntry).filter(FinanceEntry.id == uuid.UUID(entry_id)).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Finance entry not found")

    update_data = data.dict(exclude_unset=True)

    if "project_id" in update_data and update_data["project_id"]:
        project = db.query(Project).filter(Project.id == uuid.UUID(update_data["project_id"])).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    for key, value in update_data.items():
        if key == "project_id":
            setattr(entry, key, uuid.UUID(value) if value else None)
        else:
            setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return {"message": "Finance entry updated", "entry": {"id": str(entry.id)}}

@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
def delete_finance_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*FINANCE_ROLES)),
):
    """
    Delete a finance entry.
    RBAC: Restricted to finance roles only.
    """
    entry = db.query(FinanceEntry).filter(FinanceEntry.id == uuid.UUID(entry_id)).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Finance entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Finance entry deleted", "id": entry_id}

@router.get("/")
def get_finance_entries(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*FINANCE_ROLES)),
):
    """
    Get all finance entries.
    RBAC: Restricted to finance roles only.
    """
    entries = db.query(FinanceEntry).all()
    return [
        {
            "id": str(e.id),
            "amount": e.amount,
            "type": e.type,
            "description": e.description,
            "project_id": str(e.project_id) if e.project_id else None,
            "created_by": str(e.created_by),
            "created_at": str(e.created_at) if e.created_at else None,
            "is_client_advance": e.is_client_advance or False,
            "client_name": e.client_name or "N/A",
            "advance_amount": e.advance_amount,
            # include legacy fields just in case frontend needs them right now
            "category": e.category or "general",
        }
        for e in entries
    ]

@router.get("/download")
def download_finance_entries(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*FINANCE_ROLES)),
):
    """
    Download CSV of finance entries.
    """
    entries = db.query(FinanceEntry).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Type", "Amount", "Client Advance", "Client Name", "Advance Amount"])
    
    for e in entries:
        dt_str = e.created_at.strftime("%Y-%m-%d") if e.created_at else "N/A"
        writer.writerow([
            dt_str,
            e.description or "N/A",
            e.type,
            e.amount,
            "Yes" if e.is_client_advance else "No",
            e.client_name or "—",
            e.advance_amount if e.is_client_advance else "—"
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=finance_report.csv"}
    )
