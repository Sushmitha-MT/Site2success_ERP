import asyncio
from app.db.database import engine, Base
import app.models

def create_tables():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    create_tables()
