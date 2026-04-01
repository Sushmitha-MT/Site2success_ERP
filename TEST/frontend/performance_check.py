import time
import requests
import statistics

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(name, url, method="GET", json=None, headers=None):
    latencies = []
    print(f"Testing {name} ({url})...")
    for i in range(5):
        start = time.perf_counter()
        try:
            resp = requests.request(method, url, json=json, headers=headers)
            end = time.perf_counter()
            latencies.append((end - start) * 1000)
            if resp.status_code >= 400:
                 print(f"  Warning: Run {i+1} returned {resp.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
    
    if latencies:
        avg = statistics.mean(latencies)
        p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 2 else avg
        print(f"  Avg: {avg:.2f}ms | P95: {p95:.2f}ms")
    else:
        print("  No successful runs.")

if __name__ == "__main__":
    # Test public root
    test_endpoint("Root API", "http://localhost:8000/")
    
    # In a real environment, we'd login here to get a token.
    # For now, we test response readiness of public/open endpoints if any.
    # We will also test the Dashboard if it's open for check or with a mock token.
    print("\nPerformance testing complete.")
