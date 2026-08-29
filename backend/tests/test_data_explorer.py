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
    
    mission = Mission(mission_id="TEST-MISSION")
    db.add(mission)
    
    base_time = datetime.utcnow()
    
    # Insert 15 readings
    for i in range(15):
        r = Reading(
            mission_id="TEST-MISSION", 
            timestamp=base_time - timedelta(minutes=i),
            latitude=10.0 + (i * 0.1), 
            longitude=20.0,
            pm1=5.0,
            pm25=10.0 + i, # 10 to 24
            pm10=20.0,
            aqi=50 + (i * 10), # 50 to 190
            aqi_category="Test"
        )
        db.add(r)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_pagination():
    response = client.get("/api/missions/TEST-MISSION/readings?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert data["pages"] == 3
    assert data["page"] == 1
    assert data["limit"] == 5
    assert len(data["items"]) == 5

def test_pagination_bounds():
    response = client.get("/api/missions/TEST-MISSION/readings?page=-1&limit=5")
    assert response.status_code == 400
    
    response = client.get("/api/missions/TEST-MISSION/readings?page=1&limit=2000")
    assert response.status_code == 400

def test_aqi_filtering():
    # AQI ranges from 50 to 190
    response = client.get("/api/missions/TEST-MISSION/readings?aqi_min=100&aqi_max=150")
    assert response.status_code == 200
    data = response.json()
    # 100, 110, 120, 130, 140, 150 -> 6 items
    assert data["total"] == 6
    for item in data["items"]:
        assert 100 <= item["aqi"] <= 150

def test_pm25_filtering():
    # PM2.5 ranges from 10 to 24
    response = client.get("/api/missions/TEST-MISSION/readings?pm25_min=15&pm25_max=20")
    assert response.status_code == 200
    data = response.json()
    # 15, 16, 17, 18, 19, 20 -> 6 items
    assert data["total"] == 6
    for item in data["items"]:
        assert 15 <= item["pm25"] <= 20

def test_invalid_sort():
    response = client.get("/api/missions/TEST-MISSION/readings?sort_by=invalid_field")
    assert response.status_code == 400

def test_csv_export():
    response = client.get("/api/missions/TEST-MISSION/readings/export?aqi_min=100&aqi_max=150")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    lines = content.strip().split("\n")
    # header + 6 matching items
    assert len(lines) == 7
    assert lines[0].startswith("timestamp,latitude,longitude,altitude,pm1,pm25,pm10,temperature,humidity,aqi,aqi_category")

