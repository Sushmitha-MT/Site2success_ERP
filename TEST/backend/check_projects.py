import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import get_db
from app.models.projects import Project

def check_projects():
    db = next(get_db())
    projects = db.query(Project).all()
    print(f"Total projects: {len(projects)}")
    for p in projects:
        print(f"ID: {p.id} ({type(p.id)}), Name: {p.name}")

if __name__ == "__main__":
    check_projects()
