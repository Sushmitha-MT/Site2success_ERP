from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.notifications import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all notifications for the logged-in user, ordered by newest first.
    Strictly filters by `user_id == current_user.id`.
    """
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == uuid.UUID(current_user["user_id"]))
        .order_by(Notification.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifications
    ]


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a specific notification as read.
    Maintains strict RBAC isolation.
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == str(current_user["user_id"])
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return {"status": "success", "message": "Notification marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a specific notification.
    Maintains strict RBAC isolation.
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == str(current_user["user_id"])
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {"status": "success", "message": "Notification deleted"}
