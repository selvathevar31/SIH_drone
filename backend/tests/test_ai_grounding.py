import pytest
from app.services.ai_assistant import generate_grounded_response

def test_grounded_response_no_evidence():
    # If no evidence is provided, response must indicate insufficient data (grounding rule)
    ans, facts, inf, rec = generate_grounded_response(
        question="Where is the highest AQI?",
        mission_id="M-TEST",
        intent="highest_aqi",
        evidence=[],
        knowledge=""
    )
    assert "insufficient sensor data" in ans.lower()
    assert len(facts) == 0
    assert len(inf) == 0
    assert len(rec) == 0

def test_grounded_response_with_evidence():
    evidence = [{
        "timestamp": "2023-10-01T10:00:10Z",
        "latitude": 10.25,
        "longitude": 20.25,
        "altitude": 60.0,
        "pm25": 85.5,
        "aqi": 150,
        "aqi_category": "Poor"
    }]
    ans, facts, inf, rec = generate_grounded_response(
        question="Where is the highest PM2.5?",
        mission_id="M-TEST",
        intent="highest_pm25",
        evidence=evidence,
        knowledge=""
    )
    # The answer MUST contain the real data and NO fabricated values
    assert "85.5" in ans or "85" in ans
    assert "10.25" in ans
    
    # Check facts and inferences splits
    assert len(facts) == 1
    assert "85.5" in facts[0] or "85" in facts[0]
    assert len(inf) == 1
    assert len(rec) == 1
