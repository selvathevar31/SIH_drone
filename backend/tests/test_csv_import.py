import pytest
from app.services.csv_importer import process_csv_upload

def test_valid_csv_import():
    csv_content = b"timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity\n2026-08-26T10:00:01,19.0215,73.1000,52,45.2,71.4,29.5,68\n2026-08-26T10:00:02,19.0216,73.1002,52,48.7,74.1,29.6,67"
    
    result = process_csv_upload(csv_content, "TEST-MISS-CSV")
    assert result["success"] == True
    assert result["rows_processed"] == 2
    assert result["rows_rejected"] == 0

def test_missing_column_import():
    # missing pm10
    csv_content = b"timestamp,latitude,longitude,altitude,pm25,temperature,humidity\n2026-08-26T10:00:01,19.0215,73.1000,52,45.2,29.5,68"
    
    result = process_csv_upload(csv_content, "TEST-MISS-CSV")
    assert result["success"] == False
    assert "Missing required columns" in result["error"]

def test_malformed_row():
    # negative pm25 should be rejected
    csv_content = b"timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity\n2026-08-26T10:00:01,19.0215,73.1000,52,-45.2,71.4,29.5,68\n2026-08-26T10:00:02,19.0216,73.1002,52,48.7,74.1,29.6,67"
    
    result = process_csv_upload(csv_content, "TEST-MISS-CSV")
    assert result["success"] == True
    assert result["rows_processed"] == 1
    assert result["rows_rejected"] == 1
