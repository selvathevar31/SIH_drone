import pytest
from app.services.adaptive_sampling import calculate_adaptive_sampling
from app.models.reading import Reading
from app.models.hotspot import Hotspot

def test_adaptive_sampling_empty():
    res = calculate_adaptive_sampling([], [])
    assert len(res["recommended_zones"]) == 0
    assert res["priority"] == "LOW"
    assert "no existing readings" in res["reason"].lower()

def test_adaptive_sampling_hotspot_trigger():
    readings = [Reading(latitude=10.0, longitude=20.0, aqi=50)]
    hotspots = [Hotspot(latitude=10.0, longitude=20.0, peak_aqi=180, radius_meters=50, reading_count=10)]
    
    res = calculate_adaptive_sampling(readings, hotspots)
    assert len(res["recommended_zones"]) == 1
    assert res["recommended_zones"][0]["priority"] == "HIGH"
    assert "gradient" in res["recommended_zones"][0]["reason"].lower() or "hotspot" in res["recommended_zones"][0]["reason"].lower()

def test_adaptive_sampling_gradient_trigger():
    # Insert 15 readings in cell (0,0) that are close together but with a high gradient
    readings = []
    for i in range(15):
        # Coordinates very close together
        readings.append(Reading(
            latitude=10.0 + (i * 0.00001),
            longitude=20.0 + (i * 0.00001),
            aqi=10 + (i * 10) # 10 to 150 -> gradient of 140
        ))
    res = calculate_adaptive_sampling(readings, [])
    assert len(res["recommended_zones"]) == 1
    assert res["recommended_zones"][0]["priority"] == "HIGH"
    assert "gradient" in res["recommended_zones"][0]["reason"].lower()
