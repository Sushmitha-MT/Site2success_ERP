import os
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.db.enums import UserRole

# ── Database connection setup ──────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    db = SessionLocal()
    try:
        # Full Roster Data
        # Format: (Name, RegNo, Role, Designation/Responsibility, Course/Dept)
        roster = [
            ("Rahul R", "2440166", UserRole.co_founder, "CEO & Co-Founder", "Management"),
            ("L Dhanush Raj", "2440269", UserRole.co_founder, "COO & Co-Founder", "Operations"),
            ("Kushi Shenoy", "2431983", UserRole.manager, "General Manager (Intern)", "BACP"),
            ("Ram Sunil K R", "2440232", UserRole.manager, "Manager (Cold Calling & Mails)", "BSc CS"),
            ("Ashraff unnissa", "2440263", UserRole.employee, "Frontend Developer", "BSc CS"),
            ("Rashmi K", "2440170", UserRole.employee, "Backend Developer", "CM"),
            ("Adith aby mathew", "2440258", UserRole.employee, "Full Stack Developer", "BSc CS"),
            ("Rithesh K R", "2440233", UserRole.project_manager, "Full Stack Dev & Project Manager", "BSc CS"),
            ("Yagni Parecha", "2531775", UserRole.manager, "Social Media / Media Manager", "BACEH"),
            ("Neha Hareesh", "2340140", UserRole.employee, "Social Media Intern", "BSc CM"),
            ("Leelavathi S", "2340131", UserRole.employee, "Full Stack Developer", "BSc CM"),
            ("Alen Saji", "2340205", UserRole.employee, "AI & Automation Developer", "BSc CS"),
            ("Sushmitha M T", "2340257", UserRole.employee, "Full Stack Developer", "BSc CS"),
            ("Adithya Anish Abraham", "2340201", UserRole.employee, "AI & Automation Developer", "BSc CS"),
            ("Karline", "2541628", UserRole.employee, "Full Stack Developer", "BCA B"),
            ("Anagha Jayakumar", "2541609", UserRole.employee, "Full Stack Developer", "BCA B"),
            ("Sandra Siby", "2541651", UserRole.employee, "Full Stack Developer", "BCA B"),
            ("Deepanshu Jain", "2541615", UserRole.employee, "Full Stack Developer", "BCA B"),
            ("Medansh Madhusudhan", "2541635", UserRole.employee, "Full Stack Developer", "BCA B"),
            ("R S Prajeeth Kanna", "2541643", UserRole.employee, "Full Stack Developer", "BCA B")
        ]

        default_pwd = pwd_context.hash("password123")
        
        print(f"Seeding {len(roster)} company members...")

        for name, regno, role, designation, dept in roster:
            # Check for existing user by name (since identifier login uses name) OR regno email
            email = f"{name.lower().replace(' ', '.')}.{regno}@site2success.com"
            existing = db.execute(text("SELECT id FROM users WHERE full_name = :name OR email = :email"), {"name": name, "email": email}).first()
            
            if not existing:
                uid = str(uuid.uuid4())
                db.execute(text(
                    "INSERT INTO users (id, email, password_hash, full_name, role, is_active, department, designation, created_at, updated_at) "
                    "VALUES (:id, :email, :hpwd, :name, :role, :active, :dept, :desig, NOW(), NOW())"
                ), {
                    "id": uid,
                    "email": email,
                    "hpwd": default_pwd,
                    "name": name,
                    "role": role.value if hasattr(role, 'value') else role,
                    "active": True,
                    "dept": dept,
                    "desig": designation
                })
                print(f"✅ Created: {name} ({role})")
            else:
                # Update existing user to match the designation and Dept from the new roster
                db.execute(text(
                    "UPDATE users SET designation = :desig, department = :dept, role = :role, password_hash = :hpwd WHERE full_name = :name"
                ), {
                    "name": name, 
                    "desig": designation, 
                    "dept": dept, 
                    "role": role.value if hasattr(role, 'value') else role,
                    "hpwd": default_pwd
                })
                print(f"🔄 Updated: {name}")

        db.commit()
        print("Company Seeding complete.")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
