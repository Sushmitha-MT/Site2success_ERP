import uuid

from sqlalchemy import Column, String, Date, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base
from app.db.mixins import TimestampMixin
from app.db.enums import ProjectStatus, ProjectType


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String, nullable=False)

    description = Column(String)

    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    status = Column(Enum(ProjectStatus, native_enum=False, create_constraint=False))

    project_type = Column(Enum(ProjectType, native_enum=False, create_constraint=False), default=ProjectType.project)

    start_date = Column(Date)

    end_date = Column(Date)