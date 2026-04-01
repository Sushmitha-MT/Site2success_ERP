import sys
import os
sys.path.append(os.getcwd())
try:
    from app.db.session import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    
    try:
        db.execute(text("ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS advance_amount FLOAT"))
        db.commit()
        print("Updated finance_entries with advance_amount column")
    except Exception as e:
        print("Error updating finance_entries:", e)
        db.rollback()
    
    db.close()
except Exception as e:
    print("General Error:", e)
