import sys
import os

# Add the backend directory to sys.path
# Since the script is inside the backend directory, os.getcwd() is correct
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.database import engine

def migrate():
    print("Checking database schema for 'project_type'...")
    with engine.connect() as conn:
        # Check if ProjectType enum exists
        # NOTE: SQLAlchemy engine connect often uses automatic transaction, 
        # so for CREATE TYPE we might need to use a session or direct execution
        
        try:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projecttype');"))
            exists = result.scalar()
            
            if not exists:
                print("Creating ProjectType enum type...")
                conn.execute(text("CREATE TYPE projecttype AS ENUM ('project', 'product');"))
                # Commit manually if needed (some drivers require it)
                conn.execute(text("COMMIT;"))

            # Check if column exists
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_type');"))
            col_exists = result.scalar()

            if not col_exists:
                print("Adding 'project_type' column to 'projects' table...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_type projecttype DEFAULT 'project';"))
                conn.execute(text("COMMIT;"))
                print("Successfully added 'project_type' column.")
            else:
                print("'project_type' column already exists.")
        except Exception as e:
            print(f"Internal migration error: {e}")
            raise e

if __name__ == "__main__":
    try:
        migrate()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration script failed: {e}")
        sys.exit(1)
