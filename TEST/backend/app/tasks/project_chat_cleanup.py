"""
app/tasks/project_chat_cleanup.py
---------------------------------
Rolling 24-hour retention for Project Collaborator Chat.

• Fetches ProjectMessage rows older than 24 hours.
• Copies each row into ArchivedProjectMessage.
• Deletes the originals from project_messages.

This task is registered as a daily APScheduler job in app/main.py.
"""

import logging
from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.project_messages import ProjectMessage
from app.models.archived_project_messages import ArchivedProjectMessage

logger = logging.getLogger(__name__)

# ── Retention window ──────────────────────────────────────────────────────────
RETENTION_HOURS = 24


def archive_old_project_messages() -> None:
    """
    Move project chat messages older than RETENTION_HOURS from
    `project_messages` → `archived_project_messages`, then delete originals.

    Designed to run daily via APScheduler; non-blocking relative to the
    web server since APScheduler executes it in a thread-pool worker.
    """
    cutoff: datetime = datetime.utcnow() - timedelta(hours=RETENTION_HOURS)
    db = SessionLocal()

    try:
        old_messages = (
            db.query(ProjectMessage)
            .filter(ProjectMessage.created_at < cutoff)
            .all()
        )

        if not old_messages:
            logger.info(
                "[ProjectChatCleanup] No project chat messages older than %d hours found. "
                "Nothing to archive.",
                RETENTION_HOURS,
            )
            return

        archived_count = 0
        failed_ids = []

        for msg in old_messages:
            try:
                archived = ArchivedProjectMessage(
                    id=msg.id,
                    project_id=msg.project_id,
                    sender_id=msg.sender_id,
                    sender_name=msg.sender_name,
                    message=msg.message,
                    file_url=msg.file_url,
                    file_type=msg.file_type,
                    file_name=msg.file_name,
                    created_at=msg.created_at,
                    updated_at=msg.updated_at,
                    archived_at=datetime.utcnow(),
                )
                db.add(archived)
                db.delete(msg)
                archived_count += 1
            except Exception as exc:
                logger.error(
                    "[ProjectChatCleanup] Failed to archive message id=%s: %s",
                    msg.id,
                    exc,
                )
                failed_ids.append(str(msg.id))

        db.commit()

        logger.info(
            "[ProjectChatCleanup] Archived %d project chat message(s) older than %d hours. "
            "Cutoff: %s UTC. Failed: %s",
            archived_count,
            RETENTION_HOURS,
            cutoff.isoformat(),
            failed_ids if failed_ids else "none",
        )

    except Exception as exc:
        db.rollback()
        logger.error("[ProjectChatCleanup] Cleanup job encountered an error: %s", exc)
    finally:
        db.close()
