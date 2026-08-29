from fastapi.testclient import TestClient
from app.main import app
from datetime import datetime

client = TestClient(app)

def test_create_mission_and_reading():
    mission_data = {
        "mission_id": "TEST-MISS-01",
        "drone_id": "TEST-DRONE",
        "data_source": "TEST"
    }
    # Clean up first if needed (test db ideal, but sticking to simple setup)
    client.delete(f"/api/missions/{mission_data['mission_id']}")
    
    resp_mission = client.post("/api/missions/", json=mission_data)
    assert resp_mission.status_code == 201
    
    reading_data = {
        "mission_id": "TEST-MISS-01",
        "data_source": "ESP32",
        "timestamp": datetime.utcnow().isoformat(),
        "latitude": 19.0215,
        "longitude": 73.1000,
        "pm25": 45.0,
        "pm10": 90.0
    }
    
    resp_reading = client.post("/api/readings/", json=reading_data)
    assert resp_reading.status_code == 201
    data = resp_reading.json()
    assert data["latitude"] == 19.0215
    assert data["aqi"] is not None
    
    # invalid mission
    reading_data["mission_id"] = "INVALID-MISS"
    resp_inv = client.post("/api/readings/", json=reading_data)
    assert resp_inv.status_code == 404
