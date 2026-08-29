import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.routes.readings import to_canonical_response
from app.models.reading import Reading
from datetime import datetime

def test_data_quality_metadata_valid():
    r = Reading(
        id=101,
        mission_id="M-QUALITY-TEST",
        data_source="ESP32",
        timestamp=datetime.utcnow(),
        latitude=12.9716,
        longitude=77.5946,
        altitude=45.5,
        pm25=12.5,
        pm10=25.0,
        temperature=25.0, # Now specified
        humidity=60.0, # Now specified
        aqi=50,
        aqi_category="Good"
    )
    res = to_canonical_response(r)
    
    # Verify metadata fields
    assert res["metadata"]["source"] == "ESP32"
    assert res["metadata"]["quality_status"] == "VALID"
    assert len(res["metadata"]["validation_warnings"]) == 0
    
    # Verify derived vs measurements split
    assert res["measurements"]["pm25"] == 12.5
    assert res["derived"]["aqi"] == 50
    assert res["location"]["latitude"] == 12.9716

def test_data_quality_metadata_partial():
    r = Reading(
        id=102,
        mission_id="M-QUALITY-TEST",
        data_source="CSV",
        timestamp=datetime.utcnow(),
        latitude=12.9716,
        longitude=77.5946,
        altitude=45.5,
        pm25=None, # Missing PM2.5
        pm10=25.0,
        temperature=25.0,
        humidity=60.0,
        aqi=None,
        aqi_category=None
    )
    res = to_canonical_response(r)
    
    assert res["metadata"]["source"] == "CSV"
    assert res["metadata"]["quality_status"] == "PARTIAL"
    assert len(res["metadata"]["validation_warnings"]) > 0
    assert "PM2.5" in res["metadata"]["validation_warnings"][0]
    
    assert res["measurements"]["pm25"] is None
    assert res["derived"]["aqi"] is None

def test_data_quality_metadata_warning():
    r = Reading(
        id=103,
        mission_id="M-QUALITY-TEST",
        data_source="ESP32",
        timestamp=datetime.utcnow(),
        latitude=12.9716,
        longitude=77.5946,
        altitude=45.5,
        pm25=12.5,
        pm10=25.0,
        temperature=75.0, # Extreme temperature
        humidity=60.0,
        aqi=50,
        aqi_category="Good"
    )
    res = to_canonical_response(r)
    
    assert res["metadata"]["quality_status"] == "WARNING"
    assert len(res["metadata"]["validation_warnings"]) > 0
    assert "temperature" in res["metadata"]["validation_warnings"][0].lower()
