import pytest
from fastapi.testclient import TestClient
from datetime import datetime
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
from app.core.config import settings

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
    
    # Needs 2 missions for persistent hotspot
    m1 = Mission(mission_id="M-ZONE1", duration_seconds=100, distance_km=2.5, total_readings=4)
    m2 = Mission(mission_id="M-ZONE2", duration_seconds=100, distance_km=2.5, total_readings=4)
    db.add_all([m1, m2])
    
    # 5 readings close together (zone 1) - needs MIN_SAMPLES = 5
    r1 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=10.0001, longitude=20.0001, aqi=50, pm25=20.0, pm10=40.0)
    r2 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=10.0002, longitude=20.0002, aqi=150, pm25=65.0, pm10=110.0) 
    r3 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=10.0003, longitude=20.0003, aqi=300, pm25=95.0, pm10=160.0) 
    r4 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=10.0004, longitude=20.0004, aqi=50, pm25=20.0, pm10=40.0)
    r5 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=10.0005, longitude=20.0005, aqi=300, pm25=95.0, pm10=160.0) 
    
    # 1 reading far away (noise)
    r6 = Reading(mission_id="M-ZONE1", timestamp=datetime.utcnow(), latitude=11.0, longitude=21.0, aqi=50, pm25=20.0, pm10=40.0)
    
    db.add_all([r1, r2, r3, r4, r5, r6])
    
    # Hotspots across two missions at the same location (approx)
    h1 = Hotspot(mission_id="M-ZONE1", latitude=10.0001, longitude=20.0001, average_aqi=200, peak_aqi=300)
    h2 = Hotspot(mission_id="M-ZONE2", latitude=10.0002, longitude=20.0002, average_aqi=210, peak_aqi=310)
    
    # One hotspot isolated
    h3 = Hotspot(mission_id="M-ZONE1", latitude=15.0, longitude=25.0, average_aqi=100, peak_aqi=100)
    
    db.add_all([h1, h2, h3])
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_get_zones():
    response = client.get("/api/missions/M-ZONE1/zones")
    assert response.status_code == 200
    data = response.json()
    
    # Should find 1 zone with 5 readings (noise is ignored)
    assert len(data["zones"]) == 1
    zone = data["zones"][0]
    
    assert zone["measurement_count"] == 5
    assert zone["aqi"]["maximum"] == 300
    assert zone["aqi"]["minimum"] == 50
    assert zone["severity"] == "POOR" or zone["severity"] == "VERY_POOR" # average is 170 => POOR
    
def test_get_persistent_hotspots():
    response = client.get("/api/hotspots/persistent")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "OK"
    assert data["total"] == 1 # only h1 and h2 cluster together across 2 surveys
    
    ph = data["persistent_hotspots"][0]
    assert ph["surveys_detected"] == 2
    assert "M-ZONE1" in ph["surveys"]
    assert "M-ZONE2" in ph["surveys"]
    assert ph["peak_aqi"] == 310
    
def test_get_persistent_hotspots_insufficient_data():
    db = TestingSessionLocal()
    db.query(Mission).filter(Mission.mission_id == "M-ZONE2").delete()
    db.commit()
    
    response = client.get("/api/hotspots/persistent")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "INSUFFICIENT_DATA"
    assert data["total"] == 0
    db.close()
