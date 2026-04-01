"""
seed_user.py
------------
Run this once to create initial users (Founder & Co-Founder)
and print JWT tokens for testing.

Usage:
    cd backend
    python seed_user.py
"""

import uuid
from dotenv import load_dotenv
load_dotenv()

from app.db.database import SessionLocal
from app.models.users import User
from app.db.enums import UserRole
from app.middleware.auth import create_access_token
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# DB session
db = SessionLocal()


def create_user(email, password, full_name, role):
    """
    Create user if not exists, else return existing user
    """
    existing = db.query(User).filter(User.email == email).first()
    
    if existing:
        print(f"✅ User already exists: {email}")
        return existing
    
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=pwd_context.hash(password),
        full_name=full_name,
        role=role,
        is_active=True,
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    print(f"✅ Created user: {email} / {password}")
    return user


# 👑 Founder (Rahul)
rahul = create_user(
    email="rahul@erp.com",
    password="rahul123",
    full_name="Rahul",
    role=UserRole.super_admin
)

# 👑 Co-Founder (Dhanush)
dhanush = create_user(
    email="dhanush@erp.com",
    password="dhanush123",
    full_name="Dhanush",
    role=UserRole.super_admin
)


# 🔑 Generate JWT Tokens
def print_token(user, name):
    token = create_access_token({
        "sub": user.email,
        "role": str(user.role.value),
        "user_id": str(user.id),
    })
    
    print(f"\n🔑 {name} Token:")
    print("-" * 60)
    print(token)
    print("-" * 60)


print_token(rahul, "Rahul (Founder)")
print_token(dhanush, "Dhanush (Co-Founder)")


print("\n📋 How to use in Swagger:")
print("  1. Open http://127.0.0.1:8000/docs")
print("  2. Click 'Authorize 🔓'")
print("  3. Paste token")
print("  4. Click Authorize → Close")


# Close DB
db.close()