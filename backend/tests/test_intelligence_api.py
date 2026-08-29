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
    
    mission = Mission(mission_id="M-INTEL-TEST")
    db.add(mission)
    
    r1 = Reading(mission_id="M-INTEL-TEST", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, pm25=50.0, pm10=60.0, aqi=100)
    db.add(r1)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def test_get_intelligence_valid():
    response = client.get("/api/missions/M-INTEL-TEST/intelligence")
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "M-INTEL-TEST"
    assert "facts" in data
    assert "inferences" in data
    assert "recommendations" in data
    assert "summary" in data

def test_get_intelligence_not_found():
    response = client.get("/api/missions/M-INVALID/intelligence")
    assert response.status_code == 404
