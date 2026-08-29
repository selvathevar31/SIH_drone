import pytest
from unittest.mock import MagicMock
from app.services.response_simulator import simulate_response
from app.schemas.response import SimulationRequest, ResponseAction, TargetZone
from app.models.reading import Reading
from datetime import datetime

def test_response_simulator_no_readings():
    """Verify simulator handles empty database gracefully."""
    db_mock = MagicMock()
    db_mock.query().filter().order_by().all.return_value = []
    
    req = SimulationRequest(
        drone_id="DRONE-01",
        proposed_actions=[]
    )
    
    with pytest.raises(Exception) as excinfo:
        simulate_response("MISS-01", req, db_mock)
        
    assert "No readings found" in str(excinfo.value)

def test_response_simulator_with_readings():
    """Verify simulator applies logic to generate readings correctly."""
    db_mock = MagicMock()
    
    # Mock some baseline readings
    mock_readings = [
        Reading(
            timestamp=datetime.utcnow(),
            latitude=12.971, longitude=77.594, altitude=50,
            pm25=45.0, pm10=60.0, aqi=100
        ),
        Reading(
            timestamp=datetime.utcnow(),
            latitude=12.972, longitude=77.595, altitude=50,
            pm25=120.0, pm10=150.0, aqi=200
        )
    ]
    
    db_mock.query().filter().order_by().all.return_value = mock_readings
    db_mock.query().filter().first.return_value = None # No existing sim
    
    req = SimulationRequest(
        drone_id="DRONE-01",
        proposed_actions=[
            ResponseAction(
                action="Increase Sampling Density",
                target_zone=TargetZone(latitude=12.972, longitude=77.595, radius=50),
                priority="HIGH"
            )
        ]
    )
    
    result = simulate_response("MISS-01", req, db_mock)
    
    assert result.mission_id == "MISS-01"
    assert result.status == "SIMULATION_ONLY"
    assert len(result.simulated_readings) > len(mock_readings) # Should be denser near hotspot
    assert result.effectiveness.classification in ["EFFECTIVE", "HIGHLY EFFECTIVE", "INEFFECTIVE", "MARGINAL"]
