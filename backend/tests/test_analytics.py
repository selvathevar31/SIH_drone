import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
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

Base.metadata.create_all(bind=engine)

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
    
    # Mission 1: Full data
    m1 = Mission(mission_id="M-1", duration_seconds=100, distance_km=2.5, total_readings=2)
    db.add(m1)
    
    r1 = Reading(mission_id="M-1", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=50, pm25=10.0, pm10=20.0, temperature=25.0, humidity=50.0, speed=5.0, altitude=100.0)
    r2 = Reading(mission_id="M-1", timestamp=datetime.utcnow(), latitude=10.1, longitude=20.1, aqi=150, pm25=50.0, pm10=60.0, temperature=30.0, humidity=60.0, speed=10.0, altitude=150.0)
    db.add_all([r1, r2])
    
    h1 = Hotspot(mission_id="M-1", latitude=10.1, longitude=20.1, average_aqi=100.0, peak_aqi=150, radius_meters=20.0, severity="High")
    db.add(h1)
    
    # Mission 2: Empty data
    m2 = Mission(mission_id="M-2", duration_seconds=0, distance_km=0.0, total_readings=0)
    db.add(m2)
    
    # Mission 3: Partial data (Null values)
    m3 = Mission(mission_id="M-3", duration_seconds=50, distance_km=1.0, total_readings=1)
    db.add(m3)
    r3 = Reading(mission_id="M-3", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=None, pm25=None)
    db.add(r3)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_get_missions_analytics():
    response = client.get("/api/missions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # M-1
    m1_data = next(m for m in data if m["mission_id"] == "M-1")
    assert m1_data["average_aqi"] == 100.0 # (50+150)/2
    assert m1_data["peak_aqi"] == 150
    assert m1_data["average_pm25"] == 30.0
    assert m1_data["peak_pm25"] == 50.0
    assert m1_data["hotspot_count"] == 1
    
    # M-2
    m2_data = next(m for m in data if m["mission_id"] == "M-2")
    assert m2_data["average_aqi"] is None
    assert m2_data["peak_aqi"] is None
    assert m2_data["hotspot_count"] == 0
    
    # M-3
    m3_data = next(m for m in data if m["mission_id"] == "M-3")
    assert m3_data["average_aqi"] is None

def test_get_single_mission_analytics():
    response = client.get("/api/missions/M-1/analytics")
    assert response.status_code == 200
    data = response.json()
    
    assert data["mission"]["mission_id"] == "M-1"
    assert data["flight"]["distance_km"] == 2.5
    assert data["flight"]["total_readings"] == 2
    assert data["flight"]["min_altitude"] == 100.0
    
    assert data["environment"]["aqi"]["average"] == 100.0
    assert data["environment"]["aqi"]["minimum"] == 50
    assert data["environment"]["aqi"]["maximum"] == 150
    
    assert data["hotspots"]["count"] == 1
    assert data["hotspots"]["highest_aqi"] == 150
    
def test_get_single_mission_analytics_empty():
    response = client.get("/api/missions/M-2/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["environment"]["aqi"]["average"] is None
    assert data["hotspots"]["count"] == 0

def test_get_single_mission_analytics_not_found():
    response = client.get("/api/missions/M-404/analytics")
    assert response.status_code == 404
