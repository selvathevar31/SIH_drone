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
    
    mission = Mission(mission_id="TEST-MISSION-AI")
    db.add(mission)
    
    r1 = Reading(mission_id="TEST-MISSION-AI", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, pm25=50.0, pm10=60.0, aqi=100)
    r2 = Reading(mission_id="TEST-MISSION-AI", timestamp=datetime.utcnow(), latitude=10.1, longitude=20.1, pm25=20.0, pm10=30.0, aqi=50)
    
    # Missing readings mission
    mission_empty = Mission(mission_id="M-EMPTY")
    db.add(mission_empty)
    
    db.add_all([r1, r2])
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_query_highest_aqi():
    response = client.post("/api/ai/query", json={"mission_id": "TEST-MISSION-AI", "question": "Where is the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "highest_aqi"
    assert len(data["evidence"]) == 1
    assert data["evidence"][0]["aqi"] == 100

def test_query_empty_mission():
    response = client.post("/api/ai/query", json={"mission_id": "M-EMPTY", "question": "average aqi"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["evidence"]) == 0
    # Accept either wording: "insufficient sensor data" or "any sensor readings" (legacy engine message)
    answer_lower = data["answer"].lower()
    assert "insufficient sensor data" in answer_lower or "any sensor readings" in answer_lower or "no sensor" in answer_lower


def test_query_invalid_mission():
    response = client.post("/api/ai/query", json={"mission_id": "INVALID", "question": "average aqi"})
    # Mission doesn't exist - should return a "not found" message, not a data gap message.
    assert response.status_code == 200
    assert "not found" in response.json()["answer"].lower()
