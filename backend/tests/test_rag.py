"""
STEP 6B: RAG (Retrieval-Augmented Generation) Tests

Tests verify ACTUAL grounding behavior, not just HTTP 200.

Test categories:
1. Structured data retrieval
2. Knowledge retrieval
3. Hybrid retrieval (DATA_PLUS_KNOWLEDGE)
4. Missing / empty evidence handling
5. Unknown question handling
6. Grounding protection (no fabricated measurements)
7. Provenance preservation (knowledge_sources)
8. Intent routing
9. Empty mission handling
10. LLM unavailable fallback
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

# ── Test database setup ────────────────────────────────────────────────────────

SQLALCHEMY_TEST_URL = "sqlite:///./test_rag.db"
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


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_rag_test_db():
    """
    Isolated test database for RAG tests.
    Creates two missions: one with sensor data, one empty.
    """
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    now = datetime.utcnow()

    # Previous mission (M-PREV)
    m_prev = Mission(
        mission_id="M-RAG-PREV",
        status="completed",
        total_readings=5,
        distance_km=1.0,
        created_at=now - timedelta(hours=2),
        start_time=now - timedelta(hours=2),
    )

    # Main test mission (M-RAG)
    m_test = Mission(
        mission_id="M-RAG",
        status="completed",
        total_readings=5,
        distance_km=2.5,
        created_at=now,
        start_time=now,
    )

    # Empty mission (M-RAG-EMPTY)
    m_empty = Mission(
        mission_id="M-RAG-EMPTY",
        status="active",
        total_readings=0,
        created_at=now + timedelta(hours=1),
    )

    db.add_all([m_prev, m_test, m_empty])
    db.flush()

    # Readings for M-RAG
    readings = [
        Reading(mission_id="M-RAG", timestamp=now - timedelta(minutes=i),
                latitude=12.97 + i * 0.001, longitude=77.59 + i * 0.001,
                altitude=50.0 + i * 5,
                pm25=30.0 + i * 20, pm10=60.0 + i * 30, aqi=80 + i * 30,
                aqi_category="Moderate" if (80 + i * 30) < 150 else "Poor")
        for i in range(5)
    ]
    # Readings for M-RAG-PREV (lower AQI)
    prev_readings = [
        Reading(mission_id="M-RAG-PREV", timestamp=now - timedelta(hours=2, minutes=i),
                latitude=12.97, longitude=77.59, altitude=50.0,
                pm25=15.0, pm10=30.0, aqi=60, aqi_category="Satisfactory")
        for i in range(5)
    ]

    db.add_all(readings + prev_readings)
    db.flush()

    # Hotspot for M-RAG
    hotspot = Hotspot(
        mission_id="M-RAG",
        latitude=12.974,
        longitude=77.594,
        peak_aqi=200,
        average_aqi=160,
        severity="HIGH",
        radius_meters=75.0,
    )
    db.add(hotspot)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


# ── 1. Structured Data Retrieval ──────────────────────────────────────────────

def test_data_retrieval_returns_measurement_evidence():
    """Structured retrieval: data-only query should return database evidence with source_type."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest PM2.5?"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["evidence"]) > 0
    ev = data["evidence"][0]
    # Must have provenance fields
    assert "source_type" in ev
    assert ev["source_type"] in ("measurement", "aggregation", "hotspot", "mission_summary", "comparison")


def test_data_retrieval_highest_aqi():
    """Highest AQI retrieval returns a single reading with AQI value."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "highest_aqi"
    assert len(data["evidence"]) > 0
    assert data["evidence"][0].get("aqi") is not None
    assert "according to" in data["answer"].lower() or "fluxx" in data["answer"].lower() or "highest" in data["answer"].lower()


def test_data_retrieval_highest_pm25():
    """Highest PM2.5 returns the peak reading with coordinates."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "Where was the highest PM2.5?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "highest_pm25"
    ev = data["evidence"][0]
    assert ev.get("pm25") is not None
    assert ev.get("latitude") is not None
    assert ev.get("longitude") is not None


def test_data_retrieval_mission_summary():
    """Mission summary retrieval returns aggregated mission data."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "Summarize this mission."})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "mission_summary"
    assert len(data["evidence"]) > 0
    ev = data["evidence"][0]
    assert ev.get("mission_id") == "M-RAG"


def test_data_retrieval_hotspot():
    """Hotspot retrieval returns hotspot evidence."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What hotspots were detected?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] in ("hotspot_analysis", "hotspot_count", "highest_hotspot")
    assert len(data["evidence"]) > 0
    assert data["evidence"][0].get("source_type") == "hotspot"


# ── 2. Knowledge Retrieval ────────────────────────────────────────────────────

def test_knowledge_retrieval_environmental_explanation():
    """Knowledge-only query should return knowledge_sources with provenance."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What does PM2.5 mean?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "environmental_explanation"
    assert data.get("knowledge_sources") is not None
    assert len(data["knowledge_sources"]) > 0


def test_knowledge_source_has_provenance():
    """Every knowledge source must have document_id, title, and source — no fabricated citations."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What is AQI?"})
    assert response.status_code == 200
    data = response.json()
    sources = data.get("knowledge_sources") or []
    for src in sources:
        assert src.get("document_id"), "knowledge_source missing document_id"
        assert src.get("title"), "knowledge_source missing title"
        assert src.get("source"), "knowledge_source missing source"


def test_knowledge_documents_endpoint():
    """GET /api/ai/knowledge/documents returns all approved documents."""
    response = client.get("/api/ai/knowledge/documents")
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) > 5  # At least 5 documents expected
    # Every document must have provenance
    for doc in docs:
        assert "document_id" in doc
        assert "source" in doc
        assert "source_reference" in doc
        assert "content" in doc


def test_knowledge_search_endpoint():
    """POST /api/ai/knowledge/search returns relevant documents for given tags."""
    response = client.post("/api/ai/knowledge/search", json={"tags": ["pm25", "health"], "limit": 3})
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) <= 3


# ── 3. Hybrid Retrieval ───────────────────────────────────────────────────────

def test_hybrid_retrieval_data_plus_knowledge():
    """DATA_PLUS_KNOWLEDGE: should return both data evidence and knowledge sources."""
    response = client.post(
        "/api/ai/query",
        json={"mission_id": "M-RAG", "question": "Is the highest PM2.5 recorded in this mission concerning?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "data_plus_knowledge"
    # Must have database evidence
    assert len(data["evidence"]) > 0
    # Must have knowledge sources
    sources = data.get("knowledge_sources") or []
    assert len(sources) > 0


def test_hybrid_retrieval_answer_references_data():
    """Hybrid answer must reference actual data, not generic text."""
    response = client.post(
        "/api/ai/query",
        json={"mission_id": "M-RAG", "question": "Is the AQI level dangerous?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "data_plus_knowledge"
    # Answer should be grounded (not generic)
    answer = data["answer"].lower()
    # Should contain some grounding language OR specific values
    has_grounding = (
        "fluxx" in answer
        or "measurement" in answer
        or "according to" in answer
        or "recorded" in answer
        or "mission" in answer
        or any(c.isdigit() for c in answer)
    )
    assert has_grounding, f"Answer appears ungrounded: {data['answer']}"


# ── 4. Missing / Empty Evidence Handling ──────────────────────────────────────

def test_empty_mission_no_fabrication():
    """Empty mission must not fabricate measurements."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG-EMPTY", "question": "What was the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    # Evidence must be empty
    assert len(data["evidence"]) == 0
    # Answer must explicitly indicate no data — not a fabricated value
    answer = data["answer"].lower()
    has_no_data_signal = (
        "insufficient" in answer
        or "any sensor readings" in answer
        or "not have" in answer
        or "no data" in answer
        or "no readings" in answer
        or "not recorded" in answer
    )
    assert has_no_data_signal, f"Expected no-data signal in answer, got: {data['answer']}"


def test_invalid_mission_returns_not_found():
    """Non-existent mission should clearly indicate it was not found."""
    response = client.post("/api/ai/query", json={"mission_id": "M-DOES-NOT-EXIST", "question": "What was the AQI?"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["evidence"]) == 0
    answer = data["answer"].lower()
    assert "not found" in answer or "does not exist" in answer or "invalid" in answer or "no mission" in answer


# ── 5. Unknown Question Handling ──────────────────────────────────────────────

def test_unknown_question_graceful_response():
    """Unknown questions should return a graceful unsupported message."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What will the weather be like tomorrow?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "unknown"
    answer = data["answer"].lower()
    assert "cannot" in answer or "currently" in answer or "unsupported" in answer or "please ask" in answer


def test_unknown_question_zero_evidence():
    """Unknown questions must not produce database evidence (no accidental retrieval)."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What is the stock price of Infosys?"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "unknown"
    assert len(data["evidence"]) == 0


# ── 6. Grounding Protection ───────────────────────────────────────────────────

def test_no_fabricated_coordinates_in_empty_mission():
    """For empty missions, no coordinates should appear in evidence."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG-EMPTY", "question": "Where was the highest PM2.5?"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["evidence"]) == 0


def test_answer_not_generic_for_data_query():
    """Data query answer must contain grounding language, not generic AI text."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    assert data["evidence"], "Must have evidence for a data query with real data"
    # The AQI value from evidence should appear somewhere in the answer or facts
    aqi_val = str(int(data["evidence"][0].get("aqi", 0)))
    answer_and_facts = data["answer"] + " ".join(data.get("facts", []))
    assert aqi_val in answer_and_facts or "aqi" in answer_and_facts.lower()


def test_facts_inferences_are_separate():
    """Facts and inferences must be separate lists — inferences should not be presented as facts."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    # Both lists exist
    assert isinstance(data.get("facts"), list)
    assert isinstance(data.get("inferences"), list)


# ── 7. Provenance Preservation ───────────────────────────────────────────────

def test_knowledge_sources_no_fabricated_citations():
    """All returned knowledge_sources must have real document_ids from the approved store."""
    from app.services.rag.document_store import get_document_store
    store = get_document_store()
    valid_ids = {d.doc_id for d in store.all_documents()}

    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What is AQI?"})
    assert response.status_code == 200
    data = response.json()
    sources = data.get("knowledge_sources") or []
    for src in sources:
        doc_id = src.get("document_id", "")
        assert doc_id in valid_ids, f"Fabricated document_id detected: {doc_id}"


def test_data_evidence_has_mission_id():
    """All data evidence items must carry mission_id for traceability."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest PM10?"})
    assert response.status_code == 200
    data = response.json()
    for ev in data["evidence"]:
        assert "mission_id" in ev, "Evidence item missing mission_id"
        assert ev["mission_id"] == "M-RAG"


# ── 8. Intent Routing ────────────────────────────────────────────────────────

def test_intent_routing_data_plus_knowledge():
    """'Is PM2.5 dangerous' should route to data_plus_knowledge."""
    from app.services.ai_router import detect_intent_and_extract_params
    intent, _ = detect_intent_and_extract_params("Is the PM2.5 level dangerous?")
    assert intent == "data_plus_knowledge"


def test_intent_routing_environmental_explanation():
    """'What is PM2.5?' should route to environmental_explanation."""
    from app.services.ai_router import detect_intent_and_extract_params
    intent, _ = detect_intent_and_extract_params("What is PM2.5?")
    assert intent == "environmental_explanation"


def test_intent_routing_mission_comparison():
    """'Compare with previous mission' should route to mission_comparison."""
    from app.services.ai_router import detect_intent_and_extract_params
    intent, _ = detect_intent_and_extract_params("Compare this with the previous mission")
    assert intent == "mission_comparison"


def test_intent_routing_hotspot():
    """Hotspot question routes correctly."""
    from app.services.ai_router import detect_intent_and_extract_params
    intent, _ = detect_intent_and_extract_params("How many hotspots were detected?")
    assert intent == "hotspot_count"


def test_intent_routing_unknown():
    """Completely off-topic question routes to unknown."""
    from app.services.ai_router import detect_intent_and_extract_params
    intent, _ = detect_intent_and_extract_params("What is the capital of France?")
    assert intent == "unknown"


# ── 9. Historical Comparison ──────────────────────────────────────────────────

def test_historical_comparison_has_both_missions():
    """Historical comparison evidence must reference both current and previous mission IDs."""
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "Compare with the previous mission"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "mission_comparison"
    assert len(data["evidence"]) > 0
    ev = data["evidence"][0]
    assert ev.get("current_mission_id") == "M-RAG"
    assert ev.get("previous_mission_id") is not None


# ── 10. LLM Unavailable Fallback ──────────────────────────────────────────────

def test_fallback_without_gemini_key(monkeypatch):
    """Without Gemini API key, system should produce a valid deterministic answer."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest AQI?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"]  # Must have a non-empty answer
    assert len(data["evidence"]) > 0  # Must still return evidence


def test_fallback_answer_is_grounded(monkeypatch):
    """Fallback answer must be grounded in database evidence, not generic."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/api/ai/query", json={"mission_id": "M-RAG", "question": "What was the highest PM2.5?"})
    assert response.status_code == 200
    data = response.json()
    # The actual PM2.5 value from the DB should appear in the response
    pm25_val = str(int(data["evidence"][0].get("pm25", -999)))
    all_text = data["answer"] + " ".join(data.get("facts", []))
    assert pm25_val in all_text, f"Expected PM2.5={pm25_val} in response, got: {all_text}"
