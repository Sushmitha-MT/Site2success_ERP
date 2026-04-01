import urllib.request
import json
import urllib.error

try:
    data = json.dumps({"email": "admin@erp.com", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())["access_token"]
        print("Login OK")

    req2 = urllib.request.Request("http://localhost:8000/api/v1/tasks/")
    req2.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req2)
        print("Tasks OK:", len(resp.read()))
    except urllib.error.HTTPError as e:
        print("Tasks GET error:", e.code, e.read().decode()[:1000])

    sprint_data = json.dumps({"project_id": "00000000-0000-0000-0000-000000000000", "name": "Test sprint"}).encode('utf-8')
    req3 = urllib.request.Request("http://localhost:8000/api/v1/sprints/", data=sprint_data, method="POST")
    req3.add_header("Authorization", f"Bearer {token}")
    req3.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req3)
        print("Sprints POST OK")
    except urllib.error.HTTPError as e:
        print("Sprints POST error:", e.code, e.read().decode()[:1000])

except Exception as e:
    print("Script Error:", e)
