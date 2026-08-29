import pytest
from datetime import datetime
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

# Setup a test DB in memory
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
    
    # Create test mission
    mission = Mission(mission_id="TEST-MISSION")
    db.add(mission)
    
    # Valid reading
    r1 = Reading(
        mission_id="TEST-MISSION", 
        timestamp=datetime.utcnow(),
        latitude=10.0, 
        longitude=20.0,
        pm1=5.0,
        pm25=10.0,
        pm10=20.0,
        aqi=50,
        aqi_category="Good"
    )
    # Invalid reading (bad lat/lng)
    r2 = Reading(
        mission_id="TEST-MISSION", 
        timestamp=datetime.utcnow(),
        latitude=100.0, 
        longitude=200.0,
        pm25=10.0
    )
    # Missing PM25
    r3 = Reading(
        mission_id="TEST-MISSION", 
        timestamp=datetime.utcnow(),
        latitude=15.0, 
        longitude=25.0,
        pm10=30.0
    )
    # Different mission
    r4 = Reading(
        mission_id="OTHER", 
        timestamp=datetime.utcnow(),
        latitude=15.0, 
        longitude=25.0,
        pm25=5.0
    )
    db.add_all([r1, r2, r3, r4])
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_environment_map_returns_only_valid_points():
    response = client.get("/api/missions/TEST-MISSION/environment-map")
    assert response.status_code == 200
    data = response.json()
    
    # Should only return r1 and r3 (r2 is invalid lat/lng, r4 is OTHER mission)
    assert len(data) == 2
    lats = [pt["latitude"] for pt in data]
    assert 100.0 not in lats

def test_missing_environmental_values_do_not_crash():
    response = client.get("/api/missions/TEST-MISSION/environment-map")
    assert response.status_code == 200
    data = response.json()
    
    # r3 has null pm25, pm1
    r3_data = next(pt for pt in data if pt["latitude"] == 15.0)
    assert r3_data["pm25"] is None
    assert r3_data["pm10"] == 30.0

def test_aqi_values_returned():
    response = client.get("/api/missions/TEST-MISSION/environment-map")
    assert response.status_code == 200
    data = response.json()
    
    r1_data = next(pt for pt in data if pt["latitude"] == 10.0)
    assert r1_data["aqi"] == 50
    assert r1_data["aqi_category"] == "Good"
    assert r1_data["pm1"] == 5.0
