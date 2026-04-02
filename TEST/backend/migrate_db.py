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
        # 1. Ensure all tables exist (Base.metadata.create_all won't add columns to existing tables)
        print("Ensuring tables exist...")
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        
        # ─── Table: users ──────────────────────────────────
        if 'users' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('users')]
            if 'github_username' not in columns:
                print("Adding 'github_username' column to 'users' table...")
                db.execute(text("ALTER TABLE users ADD COLUMN github_username VARCHAR UNIQUE"))
                db.commit()
            if 'workspace_enabled' not in columns:
                print("Adding 'workspace_enabled' column to 'users' table...")
                db.execute(text("ALTER TABLE users ADD COLUMN workspace_enabled BOOLEAN DEFAULT TRUE"))
                db.commit()

        # ─── Table: notifications ─────────────────────────
        if 'notifications' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('notifications')]
            if 'is_read' not in columns:
                print("Adding 'is_read' column to 'notifications' table...")
                db.execute(text("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE"))
                db.commit()

        # ─── Table: finance_entries ───────────────────────
        if 'finance_entries' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('finance_entries')]
            if 'is_client_advance' not in columns:
                print("Adding 'is_client_advance' column to 'finance_entries' table...")
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN is_client_advance BOOLEAN DEFAULT FALSE"))
                db.commit()

        # ─── Table: projects ──────────────────────────────
        if 'projects' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('projects')]
            if 'status' not in columns:
                print("Adding 'status' column to 'projects' table...")
                db.execute(text("ALTER TABLE projects ADD COLUMN status VARCHAR"))
                db.commit()
            if 'project_type' not in columns:
                print("Adding 'project_type' column to 'projects' table...")
                db.execute(text("ALTER TABLE projects ADD COLUMN project_type VARCHAR DEFAULT 'project'"))
                db.commit()

        # 3. Create a default Super Admin if no users exist
        print("Checking for existing users...")
        user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if user_count == 0:
            print("No users found. Seeding default super_admin...")
            admin_id = str(uuid.uuid4())
            hpwd = pwd_context.hash("admin123")
            db.execute(text(
                "INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) "
                "VALUES (:id, :email, :hpwd, :name, :role, :active, NOW(), NOW())"
            ), {
                "id": admin_id,
                "email": "admin@erp.com",
                "hpwd": hpwd,
                "name": "Global Administrator",
                "role": "super_admin",
                "active": True
            })
            db.commit()
            print("Default super_admin (admin@erp.com / admin123) created.")
        else:
            print(f"Database already has {user_count} users.")

        print("Migration and Seeding complete.")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
