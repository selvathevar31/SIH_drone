import pytest
from unittest.mock import MagicMock
from app.routes.response import get_latest_simulation, create_simulation
from app.schemas.response import SimulationRequest
from fastapi import HTTPException

def test_get_latest_simulation_not_found():
    """Verify 404 is thrown when no simulation exists."""
    db_mock = MagicMock()
    db_mock.query().filter().order_by().first.return_value = None
    
    with pytest.raises(HTTPException) as excinfo:
        get_latest_simulation("MISS-01", db_mock)
        
    assert excinfo.value.status_code == 404

def test_create_simulation_mission_not_found():
    """Verify 404 is thrown when mission is missing."""
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = None
    
    req = SimulationRequest(drone_id="D-1", proposed_actions=[])
    with pytest.raises(HTTPException) as excinfo:
        create_simulation("MISS-01", req, db_mock)
        
    assert excinfo.value.status_code == 404
