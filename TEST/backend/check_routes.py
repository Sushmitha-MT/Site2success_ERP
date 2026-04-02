import requests
try:
    routes = requests.get("http://127.0.0.1:8000/openapi.json").json()
    print([path for path in routes.get('paths', {}).keys() if 'auth' in path])
except Exception as e:
    print("Error:", e)
