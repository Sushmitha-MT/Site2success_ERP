import uuid

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("now()"), nullable=False)
