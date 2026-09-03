import pytest
from unittest.mock import MagicMock
from app.routes.replay import get_mission_replay
from fastapi import HTTPException

def test_get_mission_replay_not_found():
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = None
    
    with pytest.raises(HTTPException) as excinfo:
        get_mission_replay("MISS-1", db=db_mock)
        
    assert excinfo.value.status_code == 404
