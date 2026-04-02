from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = "$2b$12$O0pQiN51Yj6Yv9slkNjEQeery63Sg8ju5E0/dO4XRDq6/IjAjbJVu"
plain = "rahul123"

print("Does hash match 'rahul123'?", pwd_context.verify(plain, hashed))
