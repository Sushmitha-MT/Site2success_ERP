import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import get_db
from app.models.projects import Project

def check_manager():
    db = next(get_db())
    project = db.query(Project).filter(Project.name.ilike("%Website%")).first()
    if project:
        print(f"Project: {project.name}")
        print(f"Manager ID: {project.manager_id} ({type(project.manager_id)})")
    else:
        print("Project not found.")

if __name__ == "__main__":
    check_manager()
