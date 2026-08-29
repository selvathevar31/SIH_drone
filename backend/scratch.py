import sys, os
sys.path.insert(0, os.path.abspath('.'))
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)
db = TestingSessionLocal()

# Setup data
m1 = Mission(mission_id="M-1", duration_seconds=100, distance_km=2.5, total_readings=2)
db.add(m1)

r1 = Reading(mission_id="M-1", timestamp=datetime.utcnow(), latitude=10.0, longitude=20.0, aqi=50, pm25=10.0, pm10=20.0, temperature=25.0, humidity=50.0, speed=5.0, altitude=100.0)
r2 = Reading(mission_id="M-1", timestamp=datetime.utcnow(), latitude=10.1, longitude=20.1, aqi=150, pm25=50.0, pm10=60.0, temperature=30.0, humidity=60.0, speed=10.0, altitude=150.0)
db.add_all([r1, r2])

h1 = Hotspot(mission_id="M-1", latitude=10.1, longitude=20.1, average_aqi=100.0, peak_aqi=150, radius_meters=20.0, severity="High")
db.add(h1)

db.commit()

# Print directly from session to verify it is there
print(f"DB count missions: {db.query(Mission).count()}")
print(f"DB count readings: {db.query(Reading).count()}")

def override_get_db():
    try:
        db_session = TestingSessionLocal()
        yield db_session
    finally:
        db_session.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

response = client.get("/api/readings", params={"mission_id": "M-1"})
print(f"READINGS STATUS: {response.status_code}")
print(f"READINGS DATA: {response.json()}")

response = client.get("/api/missions")
print(f"MISSIONS STATUS: {response.status_code}")
print(f"MISSIONS DATA: {response.json()}")
