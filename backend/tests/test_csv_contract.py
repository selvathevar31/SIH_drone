import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.csv_importer import process_csv_upload

def test_csv_alias_normalization():
    # CSV using alias headers instead of canonical ones
    csv_data = """timestamp,lat,lon,altitude,pm25,pm10,temp,humid
2023-10-01T10:00:00Z,12.9716,77.5946,50.0,15.5,25.0,27.5,60.0
"""
    result = process_csv_upload(csv_data.encode('utf-8'), "M-ALIAS-TEST")
    assert result["success"] is True
    assert result["accepted_rows"] == 1
    
    reading = result["readings"][0]
    # Check that aliases normalized correctly
    assert reading.latitude == 12.9716
    assert reading.longitude == 77.5946
    assert reading.temperature == 27.5
    assert reading.humidity == 60.0

def test_csv_rejections_and_reporting():
    # CSV containing some invalid rows
    csv_data = """timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity
2023-10-01T10:00:00Z,12.9716,77.5946,50.0,15.5,25.0,27.5,60.0
2023-10-01T10:00:10Z,195.0,77.5946,50.0,15.5,25.0,27.5,60.0
2023-10-01T10:00:20Z,12.9716,77.5946,50.0,-5.0,25.0,27.5,60.0
"""
    result = process_csv_upload(csv_data.encode('utf-8'), "M-REJECT-TEST")
    assert result["success"] is True
    assert result["accepted_rows"] == 1
    assert result["rejected_rows"] == 2
    assert len(result["errors"]) == 2
    
    # Check reasons
    assert "latitude" in result["errors"][0]["field"]
    assert "range" in result["errors"][0]["reason"].lower()
    
    assert "pm25" in result["errors"][1]["field"]
    assert "negative" in result["errors"][1]["reason"].lower()

def test_real_demo_csv_import():
    import os
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "demo", "qudracopter_demo_mission.csv"))
    assert os.path.exists(csv_path), f"Demo CSV file not found at {csv_path}"
    
    with open(csv_path, 'rb') as f:
        file_content = f.read()
        
    result = process_csv_upload(file_content, "M-REAL-DEMO-TEST")
    assert result["success"] is True
    assert result["accepted_rows"] > 0
    assert result["rejected_rows"] == 0
    assert len(result["errors"]) == 0

