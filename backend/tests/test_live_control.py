import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app
from app.core.database import Base, get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Active high-pollution mission
    m1 = Mission(mission_id="M-ACTIVE-HIGH", status="ACTIVE", drone_id="DRONE-01")
    db.add(m1)
    
    # 2. Empty mission
    m_empty = Mission(mission_id="M-EMPTY", status="IDLE", drone_id="DRONE-02")
    db.add(m_empty)
    
    # Readings with a gap and high PM2.5 to trigger multiple alerts
    base_time = datetime.utcnow()
    r1 = Reading(
        mission_id="M-ACTIVE-HIGH", 
        timestamp=base_time - timedelta(minutes=2), 
        latitude=10.0, 
        longitude=20.0, 
        pm25=20.0, 
        pm10=30.0, 
        aqi=50,
        gps_status="3D Fix"
    )
    # Stale/gap reading
    r2 = Reading(
        mission_id="M-ACTIVE-HIGH", 
        timestamp=base_time, 
        latitude=10.0001, 
        longitude=20.0001, 
        pm25=95.0, # triggers VERY_HIGH_POLLUTION (>90)
        pm10=160.0, # triggers VERY_HIGH_POLLUTION (>150)
        aqi=210, # triggers CRITICAL risk
        gps_status="No Fix", # triggers GPS status change
        satellites=4
    )
    db.add_all([r1, r2])
    
    # Add a hotspot
    h = Hotspot(
        mission_id="M-ACTIVE-HIGH",
        latitude=10.0,
        longitude=20.0,
        radius_meters=75.0,
        average_aqi=150.0,
        peak_aqi=210.0,
        severity="CRITICAL",
        reading_count=5
    )
    db.add(h)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_live_state_endpoint():
    response = client.get("/api/missions/M-ACTIVE-HIGH/live-state")
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "M-ACTIVE-HIGH"
    assert data["status"] == "ACTIVE"
    assert data["current_altitude"] is None # returned null because it wasn't set, which is correct!
    assert data["latest_environment"]["pm25"] == 95.0
    assert len(data["active_alerts"]) > 0

def test_live_state_empty_mission():
    response = client.get("/api/missions/M-EMPTY/live-state")
    assert response.status_code == 200
    data = response.json()
    assert data["latest_timestamp"] is None
    assert len(data["active_alerts"]) == 0

def test_live_state_not_found():
    response = client.get("/api/missions/M-INVALID/live-state")
    assert response.status_code == 404

def test_events_endpoint():
    response = client.get("/api/missions/M-ACTIVE-HIGH/events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) > 0
    # Check that events sorted newest first
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps, reverse=True)

def test_event_types_generation():
    response = client.get("/api/missions/M-ACTIVE-HIGH/events")
    events = response.json()
    event_types = [e["type"] for e in events]
    assert "MISSION_STARTED" in event_types
    assert "GPS_STATUS_CHANGE" in event_types
    assert "HIGH_POLLUTION" in event_types
    assert "HOTSPOT_DETECTED" in event_types
    assert "SAMPLING_RECOMMENDED" in event_types

def test_alerts_engine():
    response = client.get("/api/missions/M-ACTIVE-HIGH/live-state")
    data = response.json()
    alerts = data["active_alerts"]
    alert_types = [a["type"] for a in alerts]
    
    # 1. High/Very High Pollution thresholds checked
    assert "VERY_HIGH_POLLUTION" in alert_types
    # 2. Missing/stale telemetry (gap > 30s)
    assert "MISSING_TELEMETRY" in alert_types
    # 3. Hotspot detection alert
    assert "HOTSPOT_DETECTED" in alert_types
    # 4. Sampling required (adaptive recommendations)
    assert "SAMPLING_REQUIRED" in alert_types
