import requests

resp = requests.post(
    "http://127.0.0.1:8000/api/v1/auth/login",
    json={"email": "rahul@erp.com", "password": "rahul123"}
)
print("Status:", resp.status_code)
print("Text:", resp.text)
