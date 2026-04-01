import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import engine, Base
from app.models.project_messages import ProjectMessage
from app.models.projects import Project
from app.models.project_members import ProjectMember
from app.models.users import User
from app.models.tasks import Task
from app.models.task_comments import TaskComment

def ensure_tables():
    print("Ensuring database tables exist...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Success: Tables are synced.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ensure_tables()
