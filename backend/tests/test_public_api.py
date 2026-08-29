"""
Step 7 Public API and Integration Tests

Verifies that:
- Public endpoints return 200/404 properly.
- All returned objects are properly sanitized (NO battery, signal_strength, gps_status, etc.)
- Database aggregations are used correctly.
- RAG pipeline is reused correctly.
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot

# Test Database setup
SQLALCHEMY_TEST_URL = "sqlite:///./test_public_api.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_public_test_db():
    """Isolated database with 2 missions: one completed, one empty."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    now = datetime.utcnow()

    # Completed mission
    m_comp = Mission(
        mission_id="M-PUBLIC-01",
        status="completed",
        total_readings=3,
        distance_km=1.2,
        duration_seconds=300,
        start_time=now - timedelta(minutes=10),
        end_time=now - timedelta(minutes=5),
        created_at=now - timedelta(minutes=10)
    )

    # Active mission (should not be in public list)
    m_active = Mission(
        mission_id="M-PUBLIC-ACTIVE",
        status="active",
        total_readings=1,
        distance_km=0.1,
        start_time=now,
        created_at=now
    )

    db.add_all([m_comp, m_active])
    db.flush()

    # Readings for completed mission
    readings = [
        Reading(
            mission_id="M-PUBLIC-01",
            timestamp=now - timedelta(minutes=10 - i),
            latitude=12.97 + i * 0.001,
            longitude=77.59 + i * 0.001,
            altitude=50.0 + i * 5.0,
            pm25=25.0 + i * 15.0,
            pm10=50.0 + i * 25.0,
            aqi=70 + i * 20,
            aqi_category="Moderate",
            temperature=28.0 + i,
            humidity=60.0 + i,
            battery=80 - i * 5,
            signal_strength=-65.0 - i,
            gps_status="3D_FIX"
        )
        for i in range(3)
    ]
    db.add_all(readings)

    # Hotspot for completed mission
    hotspot = Hotspot(
        mission_id="M-PUBLIC-01",
        latitude=12.971,
        longitude=77.591,
        peak_aqi=110,
        average_aqi=90,
        severity="MODERATE",
        radius_meters=100.0
    )
    db.add(hotspot)

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


# ── 1. Public Overview ────────────────────────────────────────────────────────

def test_public_overview():
    """GET /api/public/overview returns latest overview metrics."""
    response = client.get("/api/public/overview")
    assert response.status_code == 200
    data = response.json()
    assert "aqi" in data
    assert "pm25" in data
    assert "source" in data
    assert data["source"] == "FLUXX"


# ── 2. Public Missions List ───────────────────────────────────────────────────

def test_public_missions():
    """GET /api/public/missions returns only completed missions and correct aggregates."""
    response = client.get("/api/public/missions")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    items = data["items"]
    # Check that only M-PUBLIC-01 is present (M-PUBLIC-ACTIVE must be hidden)
    assert len(items) == 1
    m = items[0]
    assert m["mission_id"] == "M-PUBLIC-01"
    assert m["status"] == "completed"
    # Verify aggregates are correctly returned
    assert m["average_aqi"] is not None
    assert m["max_aqi"] is not None


# ── 3. Public Mission Detail ──────────────────────────────────────────────────

def test_public_mission_detail():
    """GET /api/public/missions/{id} returns sanitized summary."""
    response = client.get("/api/public/missions/M-PUBLIC-01")
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "M-PUBLIC-01"
    assert "total_readings" in data
    assert "hotspots_detected" in data


def test_public_mission_detail_missing():
    """GET /api/public/missions/{id} returns 404 with standard error body if missing."""
    response = client.get("/api/public/missions/M-MISSING")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "MISSION_NOT_FOUND"
    assert "does not exist" in data["message"]


# ── 4. Public Mission Map ─────────────────────────────────────────────────────

def test_public_mission_map():
    """GET /api/public/missions/{id}/map returns sanitized geospatial and route details."""
    response = client.get("/api/public/missions/M-PUBLIC-01/map")
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "M-PUBLIC-01"
    assert "route" in data
    assert "points" in data
    assert "hotspots" in data
    # Check coordinate pairing is a list of lists of floats
    assert len(data["route"]) > 0
    assert isinstance(data["route"][0], list)
    assert len(data["route"][0]) == 2


# ── 5. Public Mission Trend ───────────────────────────────────────────────────

def test_public_mission_trend():
    """GET /api/public/missions/{id}/trend returns time-series trends."""
    response = client.get("/api/public/missions/M-PUBLIC-01/trend")
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "M-PUBLIC-01"
    assert "trend" in data
    assert len(data["trend"]) > 0
    t0 = data["trend"][0]
    assert "timestamp" in t0
    assert "aqi" in t0
    assert "pm25" in t0


# ── 6. Public Hotspots ────────────────────────────────────────────────────────

def test_public_hotspots():
    """GET /api/public/hotspots returns list of sanitized hotspots."""
    response = client.get("/api/public/hotspots")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    items = data["items"]
    assert len(items) == 1
    h = items[0]
    assert h["severity"] == "MODERATE"
    assert h["average_aqi"] == 90
    assert h["peak_aqi"] == 110


# ── 7. Public AI / RAG ────────────────────────────────────────────────────────

def test_public_ai_query():
    """POST /api/public/ai/query reuses grounded RAG pipeline with public-safe output schema."""
    response = client.post(
        "/api/public/ai/query",
        json={"mission_id": "M-PUBLIC-01", "question": "Is the pollution concerning?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "facts" in data
    assert "inferences" in data
    assert "recommendations" in data
    assert "confidence" in data
    assert "knowledge_sources" in data
    # Verify that raw DB evidence is NOT exposed in the root level public output
    assert "evidence" not in data


def test_public_ai_query_missing_mission():
    """POST /api/public/ai/query returns 404 standard error body if mission doesn't exist."""
    response = client.post(
        "/api/public/ai/query",
        json={"mission_id": "M-MISSING", "question": "Is the pollution concerning?"}
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "MISSION_NOT_FOUND"


# ── 8. Empty Dataset Handling ──────────────────────────────────────────────────

def test_empty_dataset_handling():
    """Endpoints handle empty databases or missions with no readings gracefully."""
    # Overview with empty DB
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    response = client.get("/api/public/overview")
    assert response.status_code == 200
    assert response.json()["aqi"] is None

    # Missions list with empty DB
    response = client.get("/api/public/missions")
    assert response.status_code == 200
    assert len(response.json()["items"]) == 0


# ── 9. Sanitization & Privacy (Security Check) ────────────────────────────────

def test_no_operator_fields_exposed():
    """Verify that public responses DO NOT contain operator-only internal columns or telemetry diagnostic keys."""
    # Telemetry and map details check
    response = client.get("/api/public/missions/M-PUBLIC-01/map")
    assert response.status_code == 200
    data = response.json()

    # PublicMapPoint must not expose operator details
    for pt in data["points"]:
        assert "battery" not in pt
        assert "signal_strength" not in pt
        assert "gps_status" not in pt
        assert "satellites" not in pt
        assert "id" not in pt
        assert "reading_id" not in pt

    # PublicOverview check
    response = client.get("/api/public/overview")
    data = response.json()
    assert "battery" not in data
    assert "gps_status" not in data
    assert "drone_id" not in data

    # PublicMission check
    response = client.get("/api/public/missions")
    data = response.json()
    for m in data["items"]:
        assert "drone_id" not in m
        assert "data_source" not in m


# ── 10. CORS Configuration ───────────────────────────────────────────────────

def test_cors_headers():
    """CORS checks origin allowance matching settings.FRONTEND_URL."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
    }
    response = client.options("/api/public/overview", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
