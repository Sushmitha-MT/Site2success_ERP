import uuid
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.db.database import Base


class ArchivedChatMessage(Base):
    """
    Archive table for community chat messages older than 7 days.
    Mirrors ChatMessage fields exactly, plus an archived_at timestamp.
    """
    __tablename__ = "archived_chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_type = Column(String, nullable=True)   # "image" | "video" | "document"
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, default=datetime.utcnow, nullable=False)
