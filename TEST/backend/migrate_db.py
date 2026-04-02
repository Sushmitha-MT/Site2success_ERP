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
        print("Importing models before create_all...")
        import app.models # this triggers __init__.py which imports all models
        
        
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
            if 'advance_amount' not in columns:
                print("Adding 'advance_amount' column to 'finance_entries' table...")
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN advance_amount FLOAT"))
                db.commit()
            if 'currency' not in columns:
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN currency VARCHAR DEFAULT 'INR'"))
                db.commit()
            if 'category' not in columns:
                db.execute(text("ALTER TABLE finance_entries ADD COLUMN category VARCHAR DEFAULT 'general'"))
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
        # 3. Create or Update Core Admin Users
        print("Ensuring core admin users exist with correct passwords...")
        core_users = [
            {"email": "rahul@erp.com", "password": "rahul123", "name": "Rahul", "role": "super_admin"},
            {"email": "dhanush@erp.com", "password": "dhanush123", "name": "Dhanush", "role": "super_admin"},
        ]

        for u in core_users:
            hpwd = pwd_context.hash(u["password"])
            # Check if user exists
            existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": u["email"]}).fetchone()
            
            if existing:
                print(f"Updating password for existing user: {u['email']}")
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
                print(f"Creating new core user: {u['email']}")
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

        print("Migration and Seeding complete.")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
