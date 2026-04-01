"""
app/tasks/chat_cleanup.py
--------------------------
Rolling 7-day retention for Community Chat.

• Fetches ChatMessage rows older than 7 days.
• Copies each row into ArchivedChatMessage.
• Deletes the originals from chat_messages.

This task is registered as a daily APScheduler job in app/main.py.
It is SCOPED to Community Chat only — project_messages are untouched.
"""

import logging
from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.chat_messages import ChatMessage
from app.models.archived_chat_messages import ArchivedChatMessage

logger = logging.getLogger(__name__)

# ── Retention window ──────────────────────────────────────────────────────────
RETENTION_DAYS = 7


def archive_old_community_messages() -> None:
    """
    Move community chat messages older than RETENTION_DAYS from
    `chat_messages` → `archived_chat_messages`, then delete originals.

    Designed to run daily via APScheduler; non-blocking relative to the
    web server since APScheduler executes it in a thread-pool worker.
    """
    cutoff: datetime = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    db = SessionLocal()

    try:
        old_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.created_at < cutoff)
            .all()
        )

        if not old_messages:
            logger.info(
                "[ChatCleanup] No community chat messages older than %d days found. "
                "Nothing to archive.",
                RETENTION_DAYS,
            )
            return

        archived_count = 0
        failed_ids = []

        for msg in old_messages:
            try:
                archived = ArchivedChatMessage(
                    id=msg.id,
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
                    "[ChatCleanup] Failed to archive message id=%s: %s",
                    msg.id,
                    exc,
                )
                failed_ids.append(str(msg.id))

        db.commit()

        logger.info(
            "[ChatCleanup] Archived %d community chat message(s) older than %d days. "
            "Cutoff: %s UTC. Failed: %s",
            archived_count,
            RETENTION_DAYS,
            cutoff.isoformat(),
            failed_ids if failed_ids else "none",
        )

    except Exception as exc:
        db.rollback()
        logger.error("[ChatCleanup] Cleanup job encountered an error: %s", exc)
    finally:
        db.close()
