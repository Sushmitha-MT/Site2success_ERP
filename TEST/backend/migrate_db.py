import os
import uuid
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.enums import UserRole
from passlib.context import CryptContext

# Database connection setup
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def migrate():
    db = SessionLocal()
    try:
        print("Importing all models explicitly to register with Metadata...", flush=True)
        from app.models.users import User
        from app.models.projects import Project
        from app.models.tasks import Task
        from app.models.notifications import Notification
        from app.models.finance_entries import FinanceEntry
        from app.models.chat_messages import ChatMessage
        from app.models.project_messages import ProjectMessage
        from app.models.clients import Client
        from app.models.attendance_logs import AttendanceLog
        from app.models.sprints import Sprint
        from app.models.task_comments import TaskComment
        from app.models.user_documents import UserDocument
        
        print(f"Tables in Metadata: {list(Base.metadata.tables.keys())}", flush=True)
        
        print("Ensuring tables exist...", flush=True)
        Base.metadata.create_all(bind=engine)
        print("create_all execution completed.", flush=True)

        inspector = inspect(engine)
        
        # ─── Table: users ──────────────────────────────────
        if 'users' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('users')]
            if 'github_username' not in columns:
                print("Adding 'github_username' column to 'users' table...", flush=True)
                db.execute(text("ALTER TABLE users ADD COLUMN github_username VARCHAR UNIQUE"))
            if 'workspace_enabled' not in columns:
                print("Adding 'workspace_enabled' column to 'users' table...", flush=True)
                db.execute(text("ALTER TABLE users ADD COLUMN workspace_enabled BOOLEAN DEFAULT TRUE"))
            
            # Ensure correct types for PostgreSQL
            db.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR"))
            db.execute(text("ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.commit()

        # ─── Table: notifications ─────────────────────────
        if 'notifications' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('notifications')]
            if 'is_read' not in columns:
                print("Adding 'is_read' column to 'notifications' table...", flush=True)
                db.execute(text("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE"))
            
            db.execute(text("ALTER TABLE notifications ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.commit()

        # ─── Table: finance_entries ───────────────────────
        if 'finance_entries' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('finance_entries')]
            if 'is_client_advance' not in columns:
                print("Adding 'is_client_advance' column to 'finance_entries' table...", flush=True)
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN is_client_advance BOOLEAN DEFAULT FALSE"))
            if 'advance_amount' not in columns:
                print("Adding 'advance_amount' column to 'finance_entries' table...", flush=True)
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN advance_amount FLOAT"))
            if 'currency' not in columns:
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN currency VARCHAR DEFAULT 'INR'"))
            if 'category' not in columns:
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN category VARCHAR DEFAULT 'general'"))
            
            if 'type' not in columns:
                print("Adding 'type' column to 'finance_entries' table...", flush=True)
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN type VARCHAR"))
            
            db.execute(text("ALTER TABLE finance_entries ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.commit()

        # ─── Table: projects ──────────────────────────────
        if 'projects' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('projects')]
            if 'status' not in columns:
                print("Adding 'status' column to 'projects' table...", flush=True)
                db.execute(text("ALTER TABLE projects ADD COLUMN status VARCHAR"))
            if 'project_type' not in columns:
                print("Adding 'project_type' column to 'projects' table...", flush=True)
                db.execute(text("ALTER TABLE projects ADD COLUMN project_type VARCHAR DEFAULT 'project'"))
            
            db.execute(text("ALTER TABLE projects ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE projects ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR"))
            if 'project_type' in columns:
                db.execute(text("ALTER TABLE projects ALTER COLUMN project_type TYPE VARCHAR"))
            db.commit()

        # ─── Table: tasks ─────────────────────────────────
        if 'tasks' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('tasks')]
            if 'github_event_type' not in columns:
                print("Adding 'github_event_type' column to 'tasks' table...", flush=True)
                db.execute(text("ALTER TABLE tasks ADD COLUMN github_event_type VARCHAR"))
            if 'github_actor_username' not in columns:
                print("Adding 'github_actor_username' column to 'tasks' table...", flush=True)
                db.execute(text("ALTER TABLE tasks ADD COLUMN github_actor_username VARCHAR"))
            
            db.execute(text("ALTER TABLE tasks ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE tasks ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR"))
            db.execute(text("ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR"))
            db.commit()

        # ─── Table: task_comments ───────────────────────
        if 'task_comments' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('task_comments')]
            if 'github_event_type' not in columns:
                print("Adding 'github_event_type' column to 'task_comments' table...", flush=True)
                db.execute(text("ALTER TABLE task_comments ADD COLUMN github_event_type VARCHAR"))
            if 'github_actor_username' not in columns:
                print("Adding 'github_actor_username' column to 'task_comments' table...", flush=True)
                db.execute(text("ALTER TABLE task_comments ADD COLUMN github_actor_username VARCHAR"))
            
            db.commit()

        # ─── Table: chat_messages ────────────────────────
        if 'chat_messages' in inspector.get_table_names():
            db.execute(text("ALTER TABLE chat_messages ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE chat_messages ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.commit()

        # ─── Table: attendance_logs ──────────────────────
        if 'attendance_logs' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('attendance_logs')]
            if 'errant' not in columns:
                print("Adding 'errant' column to 'attendance_logs' table...", flush=True)
                db.execute(text("ALTER TABLE attendance_logs ADD COLUMN errant BOOLEAN DEFAULT FALSE"))
            
            db.execute(text("ALTER TABLE attendance_logs ALTER COLUMN clock_in TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE attendance_logs ALTER COLUMN clock_out TYPE TIMESTAMP WITH TIME ZONE"))
            db.execute(text("ALTER TABLE attendance_logs ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE"))
            db.commit()

        # 3. Create a default Super Admin if no users exist
        print("Checking for existing users...", flush=True)
        user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        # 3. Create or Update Core Admin Users
        print("Ensuring core admin users exist with correct passwords...", flush=True)
        core_users = [
            {"email": "rahul@erp.com", "password": "rahul123", "name": "Rahul", "role": "super_admin"},
            {"email": "dhanush@erp.com", "password": "dhanush123", "name": "Dhanush", "role": "super_admin"},
        ]

        for u in core_users:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hpwd = pwd_context.hash(u["password"])
            # Check if user exists
            existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": u["email"]}).fetchone()
            
            if existing:
                print(f"Updating password for existing user: {u['email']}", flush=True)
                db.execute(text(
                    "UPDATE users SET password_hash = :hpwd, full_name = :name, role = :role, updated_at = NOW() "
                    "WHERE email = :email"
                ), {
                    "hpwd": hpwd,
                    "name": u["name"],
                    "role": u["role"],
                    "email": u["email"]
                })
            else:
                print(f"Creating new core user: {u['email']}", flush=True)
                db.execute(text(
                    "INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) "
                    "VALUES (:id, :email, :hpwd, :name, :role, True, NOW(), NOW())"
                ), {
                    "id": str(uuid.uuid4()),
                    "email": u["email"],
                    "hpwd": hpwd,
                    "name": u["name"],
                    "role": u["role"]
                })
            db.commit()

        print("Migration and Seeding complete.", flush=True)

    except Exception as e:
        print(f"Error during migration: {e}", flush=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
