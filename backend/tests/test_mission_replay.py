import pytest
from unittest.mock import MagicMock
from app.services.mission_replay import get_replay_events, generate_replay_summary
from datetime import datetime

def test_get_replay_events_no_mission():
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = None
    
    events = get_replay_events("MISS-1", db_mock)
    assert events == []

def test_replay_summary():
    events = [
        {"timestamp": "2023-01-01T10:00:00Z", "type": "MISSION_STARTED"},
        {"timestamp": "2023-01-01T10:05:00Z", "type": "HOTSPOT_DETECTED"},
        {"timestamp": "2023-01-01T10:10:00Z", "type": "SIMULATION_COMPLETED"}
    ]
    summary = generate_replay_summary("MISS-1", events, None)
    
    assert summary["mission_id"] == "MISS-1"
    assert summary["total_events"] == 3
    assert summary["hotspots_detected"] == 1
    assert summary["simulations_run"] == 1
    assert summary["start_time"] == "2023-01-01T10:00:00Z"
    assert summary["end_time"] == "2023-01-01T10:10:00Z"
