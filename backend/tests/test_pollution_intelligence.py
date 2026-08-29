import pytest
from datetime import datetime, timedelta
from app.services.pollution_intelligence import (
    analyze_pollution_level,
    analyze_pollution_trend,
    analyze_altitude_behavior,
    analyze_hotspots
)
from app.models.reading import Reading
from app.models.hotspot import Hotspot

def test_pollution_level_critical():
    readings = [Reading(aqi=250), Reading(aqi=80)]
    res = analyze_pollution_level(readings)
    assert res["risk_level"] == "CRITICAL"
    assert "250" in res["facts"][0]

def test_pollution_trend_increasing():
    # Make 12 readings with increasing AQI
    readings = []
    base_time = datetime.utcnow()
    for i in range(12):
        readings.append(Reading(
            timestamp=base_time + timedelta(minutes=i),
            aqi=50 + (i * 10) # 50 to 160
        ))
    res = analyze_pollution_trend(readings)
    assert res["trend"] == "increasing"
    assert res["sample_count"] == 12

def test_pollution_trend_decreasing():
    readings = []
    base_time = datetime.utcnow()
    for i in range(12):
        readings.append(Reading(
            timestamp=base_time + timedelta(minutes=i),
            aqi=160 - (i * 10) # 160 to 50
        ))
    res = analyze_pollution_trend(readings)
    assert res["trend"] == "decreasing"

def test_pollution_trend_stable():
    readings = []
    base_time = datetime.utcnow()
    for i in range(12):
        readings.append(Reading(
            timestamp=base_time + timedelta(minutes=i),
            aqi=100
        ))
    res = analyze_pollution_trend(readings)
    assert res["trend"] == "stable"

def test_pollution_trend_insufficient_data():
    readings = [Reading(aqi=100)] * 5
    res = analyze_pollution_trend(readings)
    assert res["trend"] == "insufficient_data"

def test_altitude_behavior():
    readings = [
        Reading(altitude=10, aqi=50),
        Reading(altitude=15, aqi=60),
        Reading(altitude=30, aqi=120),
        Reading(altitude=35, aqi=130),
    ]
    res = analyze_altitude_behavior(readings)
    # 0-20m band should have avg 55
    # 20-40m band should have avg 125
    bands = {b["range"]: b["average_aqi"] for b in res["bands"]}
    assert bands["0-20m"] == 55.0
    assert bands["20-40m"] == 125.0
    assert res["altitude_trend"] == "increases_with_altitude"

def test_hotspot_severity_mapping():
    hotspots = [
        Hotspot(peak_aqi=250, average_aqi=200, latitude=10.0, longitude=20.0, radius_meters=75),
        Hotspot(peak_aqi=80, average_aqi=70, latitude=10.0, longitude=20.0, radius_meters=75)
    ]
    res = analyze_hotspots(hotspots)
    assert res[0]["severity"] == "CRITICAL"
    assert res[1]["severity"] == "MODERATE"
