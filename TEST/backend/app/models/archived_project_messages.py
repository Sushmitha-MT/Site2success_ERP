import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class ArchivedProjectMessage(Base):
    __tablename__ = "archived_project_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), nullable=True) # Nullable to preserve history even if user is deleted
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_type = Column(String, nullable=True)   # "image" | "video" | "document"
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
