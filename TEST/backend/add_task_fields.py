import sys
import os

# Add backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.database import engine

def migrate():
    print("Checking 'tasks' table for new fields...")
    with engine.connect() as conn:
        # Add assignee_id
        result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignee_id');"))
        if not result.scalar():
            print("Adding 'assignee_id' column...")
            conn.execute(text("ALTER TABLE tasks ADD COLUMN assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;"))
            conn.execute(text("COMMIT;"))
        else:
            print("'assignee_id' already exists.")

        # Add due_date
        result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='due_date');"))
        if not result.scalar():
            print("Adding 'due_date' column...")
            conn.execute(text("ALTER TABLE tasks ADD COLUMN due_date DATE;"))
            conn.execute(text("COMMIT;"))
        else:
            print("'due_date' already exists.")

if __name__ == "__main__":
    try:
        migrate()
        print("Task fields migration completed successfully.")
    except Exception as e:
        print(f"Migration script failed: {e}")
        sys.exit(1)
