from app.db.session import SessionLocal
from sqlalchemy import text

def check():
    db = SessionLocal()
    try:
        # Check Columns
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_messages'"))
        columns = [r[0] for r in res]
        print(f"Columns: {columns}")
        
        # Check Data
        res = db.execute(text("SELECT id, sender_id, sender_name FROM chat_messages LIMIT 5"))
        for row in res:
            # Safer printing for row objects
            print(f"Row: {row[0]}, {row[1]}, {row[2]}")
            
    except Exception as e:
        print(f"Diagnostic Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
