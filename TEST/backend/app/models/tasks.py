import uuid

from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base
from app.db.mixins import TimestampMixin
from app.db.enums import TaskStatus, TaskPriority


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True
    )

    sprint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sprints.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    parent_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id"),
        index=True,
        nullable=True
    )

    title = Column(String)

    description = Column(String)

    order_index = Column(Integer)

    status = Column(Enum(TaskStatus, native_enum=False, create_constraint=False))

    priority = Column(Enum(TaskPriority, native_enum=False, create_constraint=False))

    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    due_date = Column(Date, nullable=True)
    github_event_type = Column(String, nullable=True)
    github_actor_username = Column(String, nullable=True)
