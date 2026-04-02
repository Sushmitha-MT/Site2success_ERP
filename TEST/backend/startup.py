import sys
import os

# Add current directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from migrate_db import migrate
from seed_company import seed

def run_startup():
    print("--- STARTING BACKEND INITIALIZATION ---")
    
    try:
        print("\n1. Running Database Migrations...")
        migrate()
        print("✅ Migrations successful.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        # We don't exit here because seeding might still be needed if tables exist
    
    try:
        print("\n2. Seeding Company Roster...")
        seed()
        print("✅ Seeding successful.")
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        # Failure here is critical for the user's specific request
        sys.exit(1)

    print("\n--- INITIALIZATION COMPLETE ---")

if __name__ == "__main__":
    run_startup()
