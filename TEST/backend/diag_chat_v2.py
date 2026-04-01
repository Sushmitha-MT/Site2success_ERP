from app.db.session import SessionLocal
from sqlalchemy import text

def check():
    db = SessionLocal()
    try:
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_messages'"))
        columns = [r[0] for r in res]
        print("ALL COLUMNS:")
        for c in columns:
            print(f" - {c}")
            
        print("\nSAMPLE DATA (id, sender_id):")
        res = db.execute(text("SELECT id, sender_id FROM chat_messages LIMIT 3"))
        for row in res:
            print(f" ID: {row[0]}, Sender: {row[1]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
