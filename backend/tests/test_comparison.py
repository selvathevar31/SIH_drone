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
    
    m1 = Mission(mission_id="M-PREV", duration_seconds=100, distance_km=2.5, total_readings=2)
    m2 = Mission(mission_id="M-CURR", duration_seconds=120, distance_km=2.6, total_readings=2)
    db.add_all([m1, m2])
    
    # Previous Readings (Point A, Point B)
    r1_p = Reading(mission_id="M-PREV", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=100, pm25=50.0, pm10=60.0)
    r2_p = Reading(mission_id="M-PREV", timestamp=datetime.utcnow(), latitude=10.1, longitude=20.1, aqi=50, pm25=20.0, pm10=30.0)
    db.add_all([r1_p, r2_p])
    
    # Current Readings (Point A exactly, Point C far away)
    r1_c = Reading(mission_id="M-CURR", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=150, pm25=75.0, pm10=80.0)
    r2_c = Reading(mission_id="M-CURR", timestamp=datetime.utcnow(), latitude=20.0, longitude=30.0, aqi=80, pm25=40.0, pm10=50.0)
    db.add_all([r1_c, r2_c])
    
    # Hotspots
    h1_p = Hotspot(mission_id="M-PREV", latitude=10.0, longitude=20.0, average_aqi=100, peak_aqi=100, radius_meters=20.0, severity="High")
    db.add(h1_p)
    
    h1_c = Hotspot(mission_id="M-CURR", latitude=10.0, longitude=20.0, average_aqi=150, peak_aqi=150, radius_meters=20.0, severity="High")
    h2_c = Hotspot(mission_id="M-CURR", latitude=20.0, longitude=30.0, average_aqi=80, peak_aqi=80, radius_meters=20.0, severity="Medium")
    db.add_all([h1_c, h2_c])
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_compare_missions_valid():
    response = client.get("/api/missions/M-CURR/compare/M-PREV")
    assert response.status_code == 200
    data = response.json()
    
    # Check overall averages
    assert data["overall"]["aqi"]["current_average"] == 115.0 # (150+80)/2
    assert data["overall"]["aqi"]["previous_average"] == 75.0 # (100+50)/2
    assert data["overall"]["aqi"]["absolute_change"] == 40.0
    assert data["overall"]["aqi"]["percentage_change"] == pytest.approx(53.33, 0.01)
    
    # Check hotspots
    assert data["hotspots"]["current_count"] == 2
    assert data["hotspots"]["previous_count"] == 1
    assert data["hotspots"]["count_change"] == 1
    assert data["hotspots"]["current_highest_aqi"] == 150
    assert data["hotspots"]["previous_highest_aqi"] == 100
    
    # Check spatial matching
    assert data["matching"]["current_total"] == 2
    assert data["matching"]["previous_total"] == 2
    assert data["matching"]["matched"] == 1 # Only Point A matched
    
    assert len(data["spatial_data"]) == 1
    sp = data["spatial_data"][0]
    assert sp["latitude"] == 10.0
    assert sp["longitude"] == 20.0
    assert sp["aqi"]["current"] == 150
    assert sp["aqi"]["previous"] == 100
    assert sp["aqi"]["change"] == 50
    assert sp["distance_meters"] == 0.0

def test_compare_missions_same():
    response = client.get("/api/missions/M-CURR/compare/M-CURR")
    assert response.status_code == 400

def test_compare_missions_not_found():
    response = client.get("/api/missions/M-NOTFOUND/compare/M-PREV")
    assert response.status_code == 404
