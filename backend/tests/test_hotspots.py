import pytest
from app.services.hotspot_detector import detect_hotspots_for_readings

def test_hotspot_detection():
    # Min samples is 5 by default, radius 75m, min AQI 100
    # Let's mock a cluster
    readings = []
    
    # 6 readings very close to each other with high AQI
    for i in range(6):
        readings.append({
            "latitude": 19.0215 + (i * 0.00001),
            "longitude": 73.1000 + (i * 0.00001),
            "aqi": 150 + i,
            "pm25": 80.0,
            "pm10": 120.0
        })
        
    # 1 reading far away (noise)
    readings.append({
        "latitude": 19.0300,
        "longitude": 73.1100,
        "aqi": 160,
        "pm25": 85.0,
        "pm10": 125.0
    })
    
    # 1 reading close but low AQI (filtered out)
    readings.append({
        "latitude": 19.0215,
        "longitude": 73.1000,
        "aqi": 50,
        "pm25": 20.0,
        "pm10": 40.0
    })

    hotspots = detect_hotspots_for_readings(readings)
    
    # Should detect exactly 1 hotspot
    assert len(hotspots) == 1
    h = hotspots[0]
    
    # Check severity
    assert h["severity"] == "Moderately Polluted" or h["severity"] == "Poor"
    assert h["reading_count"] == 6
    assert h["peak_aqi"] == 155
