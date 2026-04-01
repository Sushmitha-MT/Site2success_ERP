import requests
import uuid

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
PROJECT_ID = "63d76329-8736-474c-8f35-97e3c153f3e1" # Example ID, replace with real one from DB if known
TOKEN = "..." # I don't have a token yet

def test_send_message():
    url = f"{BASE_URL}/project-chat/{PROJECT_ID}/messages"
    print(f"Testing URL: {url}")
    # We can't really run this without a token.
    # But I can check if the route exists at least.
    try:
        r = requests.get(f"{BASE_URL}/project-chat/{PROJECT_ID}/messages")
        print(f"GET check: {r.status_code}") # Should be 401/403
        
        r = requests.post(url, json={"message": "test from bot"})
        print(f"POST check: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_send_message()
