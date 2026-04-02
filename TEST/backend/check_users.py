from app.db.database import SessionLocal
from app.models.users import User

db = SessionLocal()
users = db.query(User).all()
with open("users_out.txt", "w") as f:
    for u in users:
        f.write(f"Email: {u.email}, Hash: {u.password_hash}\n")
db.close()
