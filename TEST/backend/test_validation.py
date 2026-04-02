import requests
from requests.exceptions import RequestException

def test_system():
    issues = []
    base_url = "http://127.0.0.1:8000"
    
    # 1. Test github webhook working correctly
    try:
        payload = {
            "repository": {"name": "P1: Website development "},
            "pull_request": {"title": "Test PR", "number": 1},
            "action": "opened",
            "sender": {"login": "testuser"}
        }
        resp = requests.post(
            f"{base_url}/webhooks/github", 
            json=payload,
            headers={"X-GitHub-Event": "pull_request"}
        )
        if resp.status_code not in [200, 201]:
            issues.append(f"Webhook failed with status {resp.status_code}: {resp.text}")
    except RequestException as e:
        issues.append(f"Webhook error: {e}")

    # 2. Test fetching notifications (RBAC + DB logic)
    # We would need to login to get a token first.
    try:
        login_resp = requests.post(
            f"{base_url}/api/v1/auth/login",
            json={"email": "rahul@erp.com", "password": "rahul123"}
        )
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            # Get notifications
            notif_resp = requests.get(
                f"{base_url}/api/v1/notifications/",
                headers={"Authorization": f"Bearer {token}"}
            )
            if notif_resp.status_code != 200:
                issues.append(f"Get notifications failed: {notif_resp.status_code}")
        else:
            issues.append(f"Login failed for test: {login_resp.status_code}")
    except RequestException as e:
        issues.append(f"Auth error: {e}")

    if issues:
        print("❌ Issues found:")
        for issue in issues:
            print(f"- {issue}")
    else:
        print("✅ Everything is working correctly")

test_system()
