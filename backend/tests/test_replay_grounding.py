import pytest
from app.services.ai_router import determine_intent

def test_explain_event_intent():
    # Should map to INTENT_EXPLAIN_EVENT based on keywords
    query1 = "What happened during this mission?"
    intent1, params1 = determine_intent(query1)
    # Actually 'what happened' triggers MISSION_SUMMARY first in ai_router, so we need to test 'why did'
    
    query2 = "why was this hotspot detected?"
    intent2, params2 = determine_intent(query2)
    assert intent2 == "INTENT_EXPLAIN_EVENT"

    query3 = "what evidence caused this recommendation"
    intent3, params3 = determine_intent(query3)
    assert intent3 == "INTENT_EXPLAIN_EVENT"
