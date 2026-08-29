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
    
    m1 = Mission(mission_id="M-KPI", duration_seconds=100, distance_km=2.5, total_readings=4)
    db.add(m1)
    
    r1 = Reading(mission_id="M-KPI", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=50, pm25=20.0, pm10=40.0)
    r2 = Reading(mission_id="M-KPI", timestamp=datetime.utcnow(), latitude=10.1, longitude=20.1, aqi=150, pm25=65.0, pm10=110.0) # pm25 > 60, pm10 > 100
    r3 = Reading(mission_id="M-KPI", timestamp=datetime.utcnow(), latitude=10.2, longitude=20.2, aqi=300, pm25=95.0, pm10=160.0) # pm25 > 90, pm10 > 150
    r4 = Reading(mission_id="M-KPI", timestamp=datetime.utcnow(), latitude=10.3, longitude=20.3, aqi=None, pm25=None, pm10=None) # Null reading
    
    db.add_all([r1, r2, r3, r4])
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_get_environmental_kpi():
    response = client.get("/api/missions/M-KPI/environmental-analytics")
    assert response.status_code == 200
    data = response.json()
    
    # Air Quality Stats
    assert data["air_quality"]["readings_with_aqi"] == 3
    assert data["air_quality"]["average_aqi"] == (50 + 150 + 300) / 3
    assert data["air_quality"]["minimum_aqi"] == 50
    assert data["air_quality"]["maximum_aqi"] == 300
    
    # AQI Exceedances
    aqi_100 = next(t for t in data["aqi_thresholds"] if t["threshold"] == 100)
    assert aqi_100["count"] == 2
    assert aqi_100["percentage"] == round((2/3) * 100, 1)

    # PM2.5 Stats
    assert data["pm25"]["readings"] == 3
    pm25_60 = next(t for t in data["pm25"]["thresholds"] if t["threshold"] == settings.PM25_THRESHOLD)
    assert pm25_60["count"] == 2 # 65 and 95
    assert pm25_60["percentage"] == round((2/3) * 100, 1)
    
    # AQI Distribution
    assert data["aqi_distribution"]["good"] == 1 # 50 is Good
    assert data["aqi_distribution"]["moderately_polluted"] == 1 # 150 is Moderate
    assert data["aqi_distribution"]["poor"] == 1 # 300 is Poor
    
    # Coverage
    assert data["coverage"]["total_readings"] == 4
    assert data["coverage"]["valid_aqi"] == 3
    assert data["coverage"]["valid_pm25"] == 3
    
    # Dominant Pollutant (Both are 2/3 exceedance, but logic might pick PM2.5)
    assert data["dominant_pollutant"] == "PM2.5"

def test_kpi_not_found():
    response = client.get("/api/missions/NOT-FOUND/environmental-analytics")
    assert response.status_code == 404
