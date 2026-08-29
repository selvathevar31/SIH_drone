import math
from datetime import datetime
import pytest
from unittest.mock import patch, MagicMock

# Import helper functions from simulator
from scripts.mission_simulator import (
    calculate_distance,
    generate_lawnmower_points
)

def test_deterministic_lawnmower_points():
    """Verify coordinate generation is deterministic and consistent."""
    start_lat, start_lon = 12.971598, 77.594562
    pts1 = generate_lawnmower_points(start_lat, start_lon, 50)
    pts2 = generate_lawnmower_points(start_lat, start_lon, 50)
    
    assert len(pts1) == 50
    assert len(pts2) == 50
    assert pts1 == pts2

def test_geographic_coordinate_bounds():
    """Verify coordinate sweeps stay within reasonable bounds around starting point."""
    start_lat, start_lon = 12.971598, 77.594562
    points = generate_lawnmower_points(start_lat, start_lon, 100)
    
    for lat, lon in points:
        # Distance should be within ~500 meters of start point
        dist = calculate_distance(start_lat, start_lon, lat, lon)
        assert dist <= 600.0  # meters
        
        # Verify valid latitude and longitude ranges
        assert -90.0 <= lat <= 90.0
        assert -180.0 <= lon <= 180.0

@patch("scripts.mission_simulator.httpx")
def test_mission_simulation_flow(mock_httpx):
    """Verify simulated mission flow, state machine, and data profiles."""
    
    # Mock health check and POST/PATCH responses
    mock_health = MagicMock()
    mock_health.status_code = 200
    mock_health.json.return_value = {"backend": "ONLINE"}
    
    mock_create = MagicMock()
    mock_create.status_code = 201
    mock_create.json.return_value = {"mission_id": "SIM-TEST-01"}
    
    mock_post_reading = MagicMock()
    mock_post_reading.status_code = 201
    
    mock_patch = MagicMock()
    mock_patch.status_code = 200
    
    mock_live_state = MagicMock()
    mock_live_state.status_code = 200
    mock_live_state.json.return_value = {"status": "SURVEYING"}
    
    mock_requests = mock_httpx
    mock_requests.get.side_effect = lambda url, **kwargs: (
        mock_health if "health" in url else mock_live_state
    )
    mock_requests.post.side_effect = lambda url, **kwargs: (
        mock_create if "missions" in url else mock_post_reading
    )
    mock_requests.patch.return_value = mock_patch

    # Run simulator's main block under custom args
    import sys
    from scripts.mission_simulator import main
    
    test_args = [
        "mission_simulator.py",
        "--readings", "40",
        "--speed", "100",  # very fast run for tests
        "--mission-name", "SIM-UNIT-TEST",
        "--seed", "1234"
    ]
    
    with patch.object(sys, 'argv', test_args):
        main()
        
    # Verify health check was hit
    mock_requests.get.assert_any_call("http://localhost:8000/api/health")
    
    # Collect all posted reading payloads to assert properties
    reading_posts = [
        call.kwargs["json"] for call in mock_requests.post.call_args_list 
        if "readings" in call.args[0]
    ]
    
    assert len(reading_posts) == 40
    
    # 1. Monotonic timestamps check
    timestamps = [datetime.fromisoformat(p["timestamp"].replace("Z", "")) for p in reading_posts]
    for idx in range(1, len(timestamps)):
        assert timestamps[idx] > timestamps[idx - 1]
        
    # 2. Monotonic battery decrease check
    batteries = [p["battery"] for p in reading_posts]
    assert batteries[0] == 100
    for idx in range(1, len(batteries)):
        assert batteries[idx] <= batteries[idx - 1]
    assert batteries[-1] < 80
    
    # 3. Altitude profiles: takeoff altitude climbs, landing altitude desc
    altitudes = [p["altitude"] for p in reading_posts]
    assert altitudes[0] < altitudes[5]  # Takeoff climbs
    assert altitudes[-1] == 0.0         # Landing finishes at 0
    for idx in range(1, len(altitudes)):
        # Realistic jumps (no massive physics breaks)
        assert abs(altitudes[idx] - altitudes[idx-1]) <= 15.0
        
    # 4. Heading vectors derived from movement
    # Check intermediate active flight readings
    for idx in range(12, 24):
        prev = reading_posts[idx - 1]
        curr = reading_posts[idx]
        lat_diff = curr["latitude"] - prev["latitude"]
        lon_diff = curr["longitude"] - prev["longitude"]
        expected_heading = math.degrees(math.atan2(lon_diff, lat_diff)) % 360.0
        assert abs(curr["heading"] - expected_heading) < 0.1
        
    # 5. Hotspot correlation check
    # Check that points near (start_lat + 0.0015, start_lon + 0.0015) have elevated PM values
    start_lat, start_lon = 12.971598, 77.594562
    hotspot_lat = start_lat + 0.0015
    hotspot_lon = start_lon + 0.0015
    
    for p in reading_posts:
        dist = calculate_distance(p["latitude"], p["longitude"], hotspot_lat, hotspot_lon)
        # Verify no negative pollutant values
        assert p["pm25"] >= 0
        assert p["pm10"] >= 0
        assert p["pm1"] >= 0
        
        if dist <= 30:
            # Right near center: PM2.5 must be very high
            assert p["pm25"] > 100.0
        elif dist > 200:
            # Far away: PM2.5 stays near baseline
            assert p["pm25"] < 60.0

    # 6. Mission state transitions: check patch requests
    patch_calls = [call.kwargs["json"]["status"] for call in mock_requests.patch.call_args_list]
    assert "TAKEOFF" in patch_calls
    assert "SURVEYING" in patch_calls
    assert "RETURNING" in patch_calls
    assert "LANDING" in patch_calls
    assert "COMPLETED" in patch_calls

@patch("scripts.mission_simulator.httpx")
def test_simulation_error_injection(mock_httpx):
    """Verify simulator properly injects errors when the flag is enabled."""
    mock_health = MagicMock()
    mock_health.status_code = 200
    mock_health.json.return_value = {"backend": "ONLINE"}
    
    mock_create = MagicMock()
    mock_create.status_code = 201
    
    mock_post_reading = MagicMock()
    mock_post_reading.status_code = 201
    
    mock_requests = mock_httpx
    mock_requests.get.return_value = mock_health
    mock_requests.post.side_effect = lambda url, **kwargs: (
        mock_create if "missions" in url else mock_post_reading
    )

    import sys
    from scripts.mission_simulator import main
    
    test_args = [
        "mission_simulator.py",
        "--readings", "40",
        "--speed", "100",
        "--inject-errors"
    ]
    
    with patch.object(sys, 'argv', test_args):
        main()
        
    reading_posts = [
        call.kwargs["json"] for call in mock_requests.post.call_args_list 
        if "readings" in call.args[0]
    ]
    
    # 25th reading should have injected error (i = 25)
    errored_payload = reading_posts[25]
    
    # In check, i = 25 -> err_type = 25 % 3 = 1 -> missing PM2.5
    assert errored_payload["pm25"] is None
