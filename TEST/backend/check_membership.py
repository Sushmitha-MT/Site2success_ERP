import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import get_db
from app.models.projects import Project
from app.models.project_members import ProjectMember
from app.models.users import User

def check_membership():
    db = next(get_db())
    # 1. Find user Sushmitha
    user = db.query(User).filter(User.full_name.ilike("%Sushmitha%")).first()
    if not user:
        print("User Sushmitha not found.")
        return
    print(f"User found: {user.full_name} ({user.id}), Role: {user.role}")

    # 2. Find project P1: Website
    project = db.query(Project).filter(Project.name.ilike("%Website%")).first()
    if not project:
        print("Project P1 not found.")
        return
    print(f"Project found: {project.name} ({project.id}), Lead/Manager: {project.manager_id}")

    # 3. Check membership
    is_lead = project.manager_id == user.id
    membership = db.query(ProjectMember).filter_by(project_id=project.id, user_id=user.id).first()
    
    print(f"Is Lead: {is_lead}")
    print(f"Is Member: {membership is not None}")

if __name__ == "__main__":
    check_membership()
