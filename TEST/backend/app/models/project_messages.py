import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class ProjectMessage(Base):
    __tablename__ = "project_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_type = Column(String, nullable=True)   # "image" | "video" | "document"
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("now()"), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow, nullable=True)
