import sys
import os
sys.path.append(os.getcwd())
try:
    from app.db.session import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    
    # 1. Update attendance_logs
    try:
        db.execute(text("ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS errant BOOLEAN DEFAULT FALSE"))
        db.commit()
        print("Updated attendance_logs with errant column")
    except Exception as e:
        print("Error updating attendance_logs:", e)
        db.rollback()

    # 2. Update finance_entries
    try:
        db.execute(text("ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS is_client_advance BOOLEAN DEFAULT FALSE"))
        db.commit()
        print("Updated finance_entries with is_client_advance column")
    except Exception as e:
        print("Error updating finance_entries:", e)
        db.rollback()
    
    db.close()
except Exception as e:
    print("General Error:", e)
