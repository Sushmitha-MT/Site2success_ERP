import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_dashboard():
    # We need a token. I'll login first.
    print("Attempting to login...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@erp.com",
        "password": "admin123"
    })
    
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.status_code}")
        print(login_resp.text)
        return

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching dashboard summary...")
    dash_resp = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers)
    
    print(f"Status: {dash_resp.status_code}")
    if dash_resp.status_code != 200:
        print("Error Response:")
        print(dash_resp.text)
    else:
        print("Success!")
        print(dash_resp.json())

if __name__ == "__main__":
    test_dashboard()
