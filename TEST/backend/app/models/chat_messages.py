import uuid
from sqlalchemy import Column, String, Text, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.db.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_type = Column(String, nullable=True)   # "image" | "video" | "document"
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("now()"), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow, nullable=True)
