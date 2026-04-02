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
        
        # 2. Check for missing columns in 'users' table
        columns = [c['name'] for c in inspector.get_columns('users')]
        
        if 'github_username' not in columns:
            print("Adding 'github_username' column to 'users' table...")
            db.execute(text("ALTER TABLE users ADD COLUMN github_username VARCHAR UNIQUE"))
            db.commit()
            print("Column added successfully.")
        
        if 'workspace_enabled' not in columns:
            print("Adding 'workspace_enabled' column to 'users' table...")
            db.execute(text("ALTER TABLE users ADD COLUMN workspace_enabled BOOLEAN DEFAULT TRUE"))
            db.commit()
            print("Column added successfully.")

        # 3. Create default users for ALL roles if they don't exist
        print("Checking/Seeding default users for all roles...")
        roles_to_seed = [
            ("super_admin", "admin@erp.com", "Super Admin"),
            ("admin", "admin_user@erp.com", "Admin User"),
            ("manager", "manager@erp.com", "Manager User"),
            ("project_manager", "pm@erp.com", "Project Manager"),
            ("employee", "employee@erp.com", "Standard Employee"),
            ("founder", "founder@erp.com", "Founder User"),
            ("co_founder", "co_founder@erp.com", "Co-Founder User")
        ]

        for role_val, email, name in roles_to_seed:
            existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).first()
            if not existing:
                print(f"Seeding {role_val} user: {email}...")
                uid = str(uuid.uuid4())
                hpwd = pwd_context.hash("password123")
                db.execute(text(
                    "INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) "
                    "VALUES (:id, :email, :hpwd, :name, :role, :active, NOW(), NOW())"
                ), {
                    "id": uid,
                    "email": email,
                    "hpwd": hpwd,
                    "name": name,
                    "role": role_val,
                    "active": True
                })
                db.commit()
                print(f"Created {role_val} user successfully.")
            else:
                print(f"User {email} already exists.")

        # Ensure Rahul's password is reset to rahul123 if needed (since user mentioned only Rahul works)
        # We'll leave existing users alone to avoid overwriting their data unless asked.

        print("Migration and Seeding complete.")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
