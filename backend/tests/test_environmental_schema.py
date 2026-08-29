import pytest
from datetime import datetime
from pydantic import ValidationError
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.schemas.environmental import EnvironmentalRecord

def test_valid_canonical_record():
    record = EnvironmentalRecord(
        timestamp=datetime.utcnow(),
        latitude=12.9716,
        longitude=77.5946,
        altitude=45.5,
        pm1=12.0,
        pm25=25.5,
        pm10=35.0,
        temperature=28.5,
        humidity=65.0
    )
    assert record.latitude == 12.9716
    assert record.pm25 == 25.5

def test_invalid_latitude():
    with pytest.raises(ValidationError):
        EnvironmentalRecord(
            timestamp=datetime.utcnow(),
            latitude=120.0, # Out of bounds
            longitude=77.5946,
            pm25=10.0
        )

def test_invalid_longitude():
    with pytest.raises(ValidationError):
        EnvironmentalRecord(
            timestamp=datetime.utcnow(),
            latitude=12.9716,
            longitude=-200.0, # Out of bounds
            pm25=10.0
        )

def test_missing_optional_sensors():
    # pm1, pm25, pm10, temperature, and humidity are optional
    record = EnvironmentalRecord(
        timestamp=datetime.utcnow(),
        latitude=12.9716,
        longitude=77.5946
    )
    assert record.pm25 is None
    assert record.temperature is None

def test_negative_particulate_values():
    with pytest.raises(ValidationError):
        EnvironmentalRecord(
            timestamp=datetime.utcnow(),
            latitude=12.9716,
            longitude=77.5946,
            pm25=-5.0 # Negative not allowed
        )
