import argparse
import requests
import json
import time
from datetime import datetime

# --- Configuration ---
API_URL = "http://localhost:8000/api/telemetry/hardware"
HARDWARE_TOKEN = "qudracopter-hardware-secret"
DEFAULT_MISSION_ID = "SIM-1788000150"

def build_payload(mission_id, lat, lon, pm25, pm10, temp, humidity):
    return {
        "mission_id": mission_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "latitude": lat,
        "longitude": lon,
        "altitude": 50.0,
        "pm25": pm25,
        "pm10": pm10,
        "temperature": temp,
        "humidity": humidity,
        "data_source": "hardware"
    }

def send_payload(payload):
    headers = {
        "Content-Type": "application/json",
        "X-Hardware-Token": HARDWARE_TOKEN
    }
    
    print(f"\n[INFO] Sending payload to {API_URL}:")
    print(json.dumps(payload, indent=2))
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        print(f"[HTTP {response.status_code}]")
        if response.status_code == 201:
            print("[SUCCESS] Hardware reading ingested.")
        else:
            print(f"[ERROR] {response.text}")
    except requests.exceptions.ConnectionError:
        print("[CRITICAL] Could not connect to FastAPI backend. Is uvicorn running?")

def main():
    parser = argparse.ArgumentParser(description="QUDRACOPTER Phase 16A ESP32 Test Simulator")
    parser.add_argument("--mission", type=str, default=DEFAULT_MISSION_ID, help="Mission ID")
    parser.add_argument("--scenario", type=str, choices=["valid", "missing-gps", "missing-dht", "negative-pm"], default="valid", help="Test scenario to run")
    
    args = parser.parse_args()

    print("=== QUDRACOPTER BENCH TEST CLIENT ===")
    
    if args.scenario == "valid":
        print("Scenario: All sensors connected and valid.")
        payload = build_payload(args.mission, 12.9716, 77.5946, 42.5, 55.1, 28.4, 65.0)
    elif args.scenario == "missing-gps":
        print("Scenario: No GPS fix (0.0, 0.0). ESP32 should drop this, but we are testing backend rejection.")
        payload = build_payload(args.mission, 0.0, 0.0, 42.5, 55.1, 28.4, 65.0)
    elif args.scenario == "missing-dht":
        print("Scenario: DHT11 disconnected. Temp/Humidity must be null.")
        payload = build_payload(args.mission, 12.9716, 77.5946, 42.5, 55.1, None, None)
    elif args.scenario == "negative-pm":
        print("Scenario: Impossible PM values. Backend should reject.")
        payload = build_payload(args.mission, 12.9716, 77.5946, -10.0, 55.1, 28.4, 65.0)

    send_payload(payload)

if __name__ == "__main__":
    main()
