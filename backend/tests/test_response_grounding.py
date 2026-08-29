import pytest
from app.services.ai_router import determine_intent, INTENT_SIMULATION

def test_ai_router_simulation_intent():
    """Verify router correctly identifies simulation intent."""
    
    query = "What is the projected effectiveness of this simulation?"
    intent, params = determine_intent(query)
    assert intent == INTENT_SIMULATION
    
    query2 = "Should we execute this response plan?"
    intent2, params2 = determine_intent(query2)
    assert intent2 == INTENT_SIMULATION
