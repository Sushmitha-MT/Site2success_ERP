from fastapi.testclient import TestClient
from app.main import app
from app.middleware.auth import create_access_token

client = TestClient(app)

# Generate a fake token for tests bypassing strict DB checks if possible, 
# or use a known user
token = create_access_token({"sub": "admin", "user_id": "00000000-0000-0000-0000-000000000000", "role": "super_admin"})

# However, get_current_user checks the database. Let's just create a real user or fetch the first one.
from app.db.session import SessionLocal
from app.models.users import User

db = SessionLocal()
user = db.query(User).first()
if user:
    token = create_access_token({"sub": user.email, "user_id": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else str(user.role)})
    print(f"Using user: {user.email}")
    
    response = client.get("/tasks/", headers={"Authorization": f"Bearer {token}"})
    print("Tasks Status:", response.status_code)
    if response.status_code != 200:
        print("Tasks Error Detail:", response.json())
        
    response = client.get("/projects/", headers={"Authorization": f"Bearer {token}"})
    print("Projects Status:", response.status_code)
else:
    print("No user found in DB")
