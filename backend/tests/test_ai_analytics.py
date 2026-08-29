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
    
    # Pre-populate missions
    m_prev = Mission(mission_id="M-PREV", duration_seconds=100, distance_km=2.5, total_readings=2, created_at=datetime.utcnow() - timedelta(hours=2))
    m_test = Mission(mission_id="M-TEST", duration_seconds=120, distance_km=2.6, total_readings=4, created_at=datetime.utcnow(), data_source="CSV")
    m_empty = Mission(mission_id="M-EMPTY", duration_seconds=0, distance_km=0.0, total_readings=0, created_at=datetime.utcnow() + timedelta(hours=1))
    db.add_all([m_prev, m_test, m_empty])
    db.commit()
    
    # Seed readings for M-TEST
    base_time = datetime.utcnow()
    readings = [
        Reading(
            mission_id="M-TEST", 
            timestamp=base_time - timedelta(minutes=10), 
            latitude=19.0200, longitude=73.1000, altitude=10.0,
            pm25=30.0, pm10=40.0, aqi=80, aqi_category="Satisfactory",
            temperature=25.0, humidity=60.0
        ),
        Reading(
            mission_id="M-TEST", 
            timestamp=base_time - timedelta(minutes=8), 
            latitude=19.0210, longitude=73.1010, altitude=20.0,
            pm25=117.6, pm10=120.0, aqi=292, aqi_category="Poor",
            temperature=26.0, humidity=58.0
        ),
        Reading(
            mission_id="M-TEST", 
            timestamp=base_time - timedelta(minutes=5), 
            latitude=19.0220, longitude=73.1020, altitude=35.0,
            pm25=95.0, pm10=180.0, aqi=210, aqi_category="Poor",
            temperature=27.0, humidity=55.0
        ),
        Reading(
            mission_id="M-TEST", 
            timestamp=base_time, 
            latitude=19.0230, longitude=73.1030, altitude=45.0,
            pm25=40.0, pm10=None, aqi=90, aqi_category="Satisfactory", # pm10 is None
            temperature=24.0, humidity=62.0
        ),
    ]
    db.add_all(readings)
    
    # Previous Readings for M-PREV
    r_prev = [
        Reading(
            mission_id="M-PREV", 
            timestamp=base_time - timedelta(hours=2), 
            latitude=19.0200, longitude=73.1000, altitude=10.0,
            pm25=20.0, pm10=30.0, aqi=50, aqi_category="Good",
            temperature=24.0, humidity=65.0
        )
    ]
    db.add_all(r_prev)
    
    # Hotspots
    h1 = Hotspot(
        mission_id="M-TEST", 
        latitude=19.0210, longitude=73.1010, 
        radius_meters=75.0, peak_aqi=292, average_aqi=292.0, 
        severity="Poor"
    )
    db.add(h1)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_query_highest_pm25():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "Where is the highest PM2.5 concentration?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "highest_pm25"
    assert "117.6" in data["answer"]
    assert data["supporting_values"]["pm25"] == 117.6
    assert len(data["locations"]) == 1
    assert data["locations"][0]["latitude"] == 19.0210

def test_query_highest_pm10():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "What is the highest PM10?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "highest_pm10"
    assert "120" in data["answer"] or "180" in data["answer"]
    assert data["supporting_values"]["pm10"] == 180.0

def test_query_highest_aqi():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "Where is the pollution highest?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "highest_aqi"
    assert data["supporting_values"]["aqi"] == 292

def test_query_averages():
    # Average AQI
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "average aqi"})
    assert response.status_code == 200
    assert response.json()["query_type"] == "average_aqi"
    
    # Average PM2.5
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "average pm2.5"})
    assert response.status_code == 200
    assert response.json()["query_type"] == "average_pm25"

def test_query_hotspot_count():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "how many hotspots were detected?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "hotspot_count"
    assert data["supporting_values"]["hotspot_count"] == 1

def test_query_mission_summary():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "summarize this mission"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "mission_summary"
    assert "M-TEST" in data["answer"]

def test_query_pollution_trend():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "did pollution increase?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "pollution_trend"

def test_query_altitude_analysis():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "what is the worst altitude?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "pollution_by_altitude"

def test_query_empty_mission():
    response = client.post("/api/ai/query", json={"mission_id": "M-EMPTY", "question": "average aqi"})
    assert response.status_code == 200
    data = response.json()
    assert "any sensor readings" in data["answer"].lower()

def test_query_missing_values():
    # PM10 contains a None value in M-TEST readings. Check average doesn't crash
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "average pm10"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "average_pm10"
    # Average of [40, 120, 180] = 340 / 3 = 113.33
    assert data["supporting_values"]["average_pm10"] == pytest.approx(113.33, 0.01)

def test_query_unsupported_questions():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "what is the weather tomorrow?"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "unsupported"
    assert "currently answer" in data["answer"]

def test_query_invalid_mission():
    response = client.post("/api/ai/query", json={"mission_id": "M-INVALID", "question": "average aqi"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "unsupported"
    assert "not found" in data["answer"]

def test_query_historical_comparison():
    response = client.post("/api/ai/query", json={"mission_id": "M-TEST", "question": "compare with previous mission"})
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "mission_comparison"
    assert "M-PREV" in data["answer"]
