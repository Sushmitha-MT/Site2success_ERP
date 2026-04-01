"""
create_archive_table.py
-----------------------
Creates the `archived_chat_messages` table for the rolling 7-day
community chat retention system.

Run once:
    python create_archive_table.py
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import inspect
from app.db.database import engine, Base

# Import ALL models so Base.metadata knows about every table
from app.models import *                          # noqa
from app.models.archived_chat_messages import ArchivedChatMessage  # noqa

def main():
    insp = inspect(engine)
    existing = insp.get_table_names()

    if "archived_chat_messages" in existing:
        print("✅ Table 'archived_chat_messages' already exists — nothing to do.")
        return

    # Create ONLY the new table (leaves everything else untouched)
    ArchivedChatMessage.__table__.create(bind=engine)
    print("✅ Table 'archived_chat_messages' created successfully.")

if __name__ == "__main__":
    main()
