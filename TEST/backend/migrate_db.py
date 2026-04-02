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

        # Seeding has been moved to seed_company.py for a unified roster management.
        print("Schema migration complete. Seeding will be handled by startup.py -> seed_company.py.")

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
