import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_rbac(name, url, token=None, expected_status=200):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    print(f"Testing RBAC: {name}...")
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code == expected_status:
            print(f"  [PASS] Got {resp.status_code} as expected.")
        else:
            print(f"  [FAIL] Got {resp.status_code}, expected {expected_status}.")
            if resp.status_code == 401:
                print(f"    Detail: {resp.json().get('detail')}")
    except Exception as e:
        print(f"  [ERROR] {e}")

if __name__ == "__main__":
    # 1. Test unauthenticated access to protected route
    test_rbac("Unauthorized Dashboard Summary", f"{BASE_URL}/dashboard/summary", expected_status=401)
    
    # 2. Test Invalid Token
    test_rbac("Invalid Token Access", f"{BASE_URL}/users/profile", token="invalid_token", expected_status=401)
    
    print("\nRBAC Audit complete.")
