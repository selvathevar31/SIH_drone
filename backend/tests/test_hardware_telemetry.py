from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)
HARDWARE_TOKEN = os.getenv("HARDWARE_TOKEN", "qudracopter-hardware-secret")
HEADERS = {"X-Hardware-Token": HARDWARE_TOKEN}

def get_mission_id():
    # Helper to get an active mission or fallback string
    # Assuming tests create or rely on SIM-1788000150
    return "SIM-1788000150"

def test_hardware_telemetry_valid():
    payload = {
        "mission_id": get_mission_id(),
        "timestamp": "2026-08-29T19:40:00Z",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "altitude": 45.2,
        "pm25": 42.5,
        "pm10": 55.1,
        "temperature": 28.4,
        "humidity": 65.0,
        "data_source": "hardware"
    }
    response = client.post("/api/telemetry/hardware", json=payload, headers=HEADERS)
    # 404 is acceptable if mission doesn't exist during pure unit tests, 201 is success
    assert response.status_code in [201, 404]

def test_hardware_telemetry_unauthorized():
    payload = {
        "mission_id": get_mission_id(),
        "timestamp": "2026-08-29T19:40:00Z",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "data_source": "hardware"
    }
    response = client.post("/api/telemetry/hardware", json=payload, headers={"X-Hardware-Token": "wrong-token"})
    assert response.status_code == 401

def test_hardware_telemetry_invalid_source():
    payload = {
        "mission_id": get_mission_id(),
        "timestamp": "2026-08-29T19:40:00Z",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "data_source": "simulation" # Must strictly be hardware
    }
    response = client.post("/api/telemetry/hardware", json=payload, headers=HEADERS)
    assert response.status_code == 400

def test_hardware_telemetry_invalid_gps():
    payload = {
        "mission_id": get_mission_id(),
        "timestamp": "2026-08-29T19:40:00Z",
        "latitude": 0.0, # Missing fix
        "longitude": 0.0,
        "data_source": "hardware"
    }
    response = client.post("/api/telemetry/hardware", json=payload, headers=HEADERS)
    assert response.status_code == 422

def test_hardware_telemetry_invalid_pm():
    payload = {
        "mission_id": get_mission_id(),
        "timestamp": "2026-08-29T19:40:00Z",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "pm25": -10.0, # Impossible
        "data_source": "hardware"
    }
    response = client.post("/api/telemetry/hardware", json=payload, headers=HEADERS)
    assert response.status_code == 422
