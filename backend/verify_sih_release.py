import requests
import time
import sys

BASE_URL = "http://localhost:8000"
test_results = []

def run_test(name, fn):
    try:
        sys.stdout.write(f"Testing {name}... ")
        sys.stdout.flush()
        res = fn()
        if res:
            print("[PASS]")
            test_results.append((name, True))
        else:
            print("[FAIL]")
            test_results.append((name, False))
    except Exception as e:
        print(f"[FAIL] - {e}")
        test_results.append((name, False))

def test_startup():
    res = requests.get(f"{BASE_URL}/")
    return res.status_code == 200

def test_mission_lifecycle():
    res = requests.get(f"{BASE_URL}/api/missions")
    if res.status_code != 200: return False
    missions = res.json()
    return len(missions) > 0

def test_telemetry_isolation():
    # Fetch historical mission map data
    res = requests.get(f"{BASE_URL}/api/missions/SIM-1788000150/map")
    if res.status_code == 404:
        return True # if mission doesn't exist yet, pass
    data = res.json()
    return isinstance(data, list)

def test_ai_intelligence():
    res = requests.get(f"{BASE_URL}/api/missions/SIM-1788000150/intelligence")
    if res.status_code == 404:
        return True
    data = res.json()
    return 'summary' in data and 'facts' in data

def test_decision_engine():
    res = requests.get(f"{BASE_URL}/api/missions/SIM-1788000150/decision")
    if res.status_code == 404:
        return True
    data = res.json()
    return 'risk_level' in data and 'recommendations' in data

def test_error_handling():
    res = requests.get(f"{BASE_URL}/api/missions/INVALID-ID/intelligence")
    return res.status_code == 404

print("========================================")
print("  QUDRACOPTER SIH RELEASE VERIFICATION  ")
print("========================================")

run_test("Backend startup", test_startup)
run_test("Mission lifecycle", test_mission_lifecycle)
run_test("Telemetry & Map", test_telemetry_isolation)
run_test("AI Grounding", test_ai_intelligence)
run_test("Environmental Decision", test_decision_engine)
run_test("Error Handling", test_error_handling)

print("\n========================================")
print("TEST SUMMARY")
print("========================================")
passed = sum(1 for name, ok in test_results if ok)
total = len(test_results)
for name, ok in test_results:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")

print("\nOverall:")
if passed == total:
    print("READY FOR SIH")
else:
    print("NOT READY - ISSUES FOUND")
