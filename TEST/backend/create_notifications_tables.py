"""
create_notifications_tables.py
------------------------------
Safely adds `github_username` to the `users` table and creates the
`notifications` table for the GitHub integration.
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, inspect
from app.db.database import engine

# Import models to ensure they're tracked by Base
from app.models import *

def main():
    insp = inspect(engine)
    
    with engine.begin() as conn:
        # 1. Add github_username to users if it doesn't exist
        columns = [col['name'] for col in insp.get_columns('users')]
        if 'github_username' not in columns:
            print("Adding 'github_username' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN github_username VARCHAR UNIQUE;"))
            conn.execute(text("CREATE INDEX ix_users_github_username ON users (github_username);"))
            print("✅ 'github_username' added successfully.")
        else:
            print("✅ 'github_username' column already exists in 'users' table.")
            
    # 2. Create the notifications table
    existing_tables = insp.get_table_names()
    if "notifications" not in existing_tables:
        from app.models.notifications import Notification
        print("Creating 'notifications' table...")
        Notification.__table__.create(bind=engine)
        print("✅ 'notifications' table created successfully.")
    else:
        print("✅ 'notifications' table already exists.")

if __name__ == "__main__":
    main()
