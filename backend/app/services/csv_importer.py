import pandas as pd
from typing import Dict, Any, List
from io import BytesIO
from app.schemas.reading import ReadingCreate
import math
from datetime import datetime

def process_csv_upload(file_content: bytes, mission_id: str, data_source: str = "CSV") -> Dict[str, Any]:
    """
    Hardened CSV importer implementing canonical validation contracts, alias resolution,
    and row-by-row error/warning reporting.
    """
    try:
        df = pd.read_csv(BytesIO(file_content))
    except Exception as e:
        return {
            "success": False, 
            "error": f"Failed to parse CSV: {str(e)}",
            "total_rows": 0,
            "accepted_rows": 0,
            "rejected_rows": 0,
            "warnings": [],
            "errors": [{"row": 0, "field": "file", "reason": f"Corrupt file layout: {str(e)}"}]
        }
        
    # 1. Alias Resolution
    alias_map = {
        'lat': 'latitude',
        'lon': 'longitude',
        'temp': 'temperature',
        'humid': 'humidity',
        'pm2.5': 'pm25',
        'pm 2.5': 'pm25',
        'pm 10': 'pm10',
        'pm1.0': 'pm1'
    }
    
    # Rename matching columns
    columns_to_rename = {}
    for col in df.columns:
        clean_col = col.lower().strip()
        if clean_col in alias_map:
            columns_to_rename[col] = alias_map[clean_col]
        elif clean_col in ['timestamp', 'latitude', 'longitude', 'altitude', 'pm1', 'pm25', 'pm10', 'temperature', 'humidity']:
            columns_to_rename[col] = clean_col # force lowercase normalized
            
    df = df.rename(columns=columns_to_rename)
    
    # Debug output for development
    print(f"Detected columns: {', '.join(df.columns.tolist())}")
    
    # Required core checks
    required_cols = ['timestamp', 'latitude', 'longitude', 'altitude', 'pm25', 'pm10', 'temperature', 'humidity']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        return {
            "success": False, 
            "error": f"Missing required columns: {', '.join(missing_cols)}",
            "total_rows": len(df),
            "accepted_rows": 0,
            "rejected_rows": len(df),
            "rows_processed": 0,
            "rows_rejected": len(df),
            "warnings": [],
            "errors": [{"row": 0, "field": "columns", "reason": f"Missing columns: {missing_cols}"}]
        }
        
    valid_readings = []
    errors = []
    warnings = []
    
    total_rows = len(df)
    
    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-indexed header offset
        
        # Check null essentials
        if pd.isna(row['timestamp']) or pd.isna(row['latitude']) or pd.isna(row['longitude']):
            errors.append({
                "row": row_num,
                "field": "essential",
                "reason": "Missing one or more required spatial/temporal coordinates (timestamp, latitude, longitude)."
            })
            continue
            
        # Parse timestamp
        try:
            ts_str = str(row['timestamp']).strip()
            # Try parsing ISO 8601 or similar formats
            timestamp_val = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        except Exception:
            errors.append({
                "row": row_num,
                "field": "timestamp",
                "reason": f"Malformed timestamp '{row['timestamp']}'. Must be valid ISO 8601 datetime."
            })
            continue

        # Parse and Validate Coordinates
        try:
            lat = float(row['latitude'])
            lon = float(row['longitude'])
        except ValueError:
            errors.append({
                "row": row_num,
                "field": "coordinates",
                "reason": "Latitude and longitude must be valid floating point values."
            })
            continue
            
        if not (-90.0 <= lat <= 90.0):
            errors.append({
                "row": row_num,
                "field": "latitude",
                "reason": f"Latitude {lat} falls outside legal range [-90.0, 90.0]."
            })
            continue
            
        if not (-180.0 <= lon <= 180.0):
            errors.append({
                "row": row_num,
                "field": "longitude",
                "reason": f"Longitude {lon} falls outside legal range [-180.0, 180.0]."
            })
            continue

        # Parse optional parameters with range checks
        pm1 = None
        pm25 = None
        pm10 = None
        temp = None
        humid = None
        alt = None
        
        # Helper float parsers with boundaries
        try:
            if 'pm1' in df.columns and not pd.isna(row['pm1']):
                val = float(row['pm1'])
                if val < 0:
                    errors.append({"row": row_num, "field": "pm1", "reason": f"PM1.0 concentration {val} µg/m³ cannot be negative."})
                    continue
                pm1 = val
                
            if 'pm25' in df.columns and not pd.isna(row['pm25']):
                val = float(row['pm25'])
                if val < 0:
                    errors.append({"row": row_num, "field": "pm25", "reason": f"PM2.5 concentration {val} µg/m³ cannot be negative."})
                    continue
                pm25 = val
                
            if 'pm10' in df.columns and not pd.isna(row['pm10']):
                val = float(row['pm10'])
                if val < 0:
                    errors.append({"row": row_num, "field": "pm10", "reason": f"PM10 concentration {val} µg/m³ cannot be negative."})
                    continue
                pm10 = val
                
            if 'temperature' in df.columns and not pd.isna(row['temperature']):
                val = float(row['temperature'])
                if not (-50.0 <= val <= 100.0):
                    errors.append({"row": row_num, "field": "temperature", "reason": f"Temperature {val}°C falls outside range [-50, 100]."})
                    continue
                temp = val
                
            if 'humidity' in df.columns and not pd.isna(row['humidity']):
                val = float(row['humidity'])
                if not (0.0 <= val <= 100.0):
                    errors.append({"row": row_num, "field": "humidity", "reason": f"Humidity {val}% falls outside range [0, 100]."})
                    continue
                humid = val
                
            if 'altitude' in df.columns and not pd.isna(row['altitude']):
                alt = float(row['altitude'])
                
        except ValueError as ex:
            errors.append({"row": row_num, "field": "sensor", "reason": f"Sensor parameters failed type coercion: {str(ex)}"})
            continue

        # Warnings for missing sensor telemetry (non-fatal)
        if pm25 is None:
            warnings.append(f"Row {row_num}: PM2.5 sensor telemetry is missing (stored as NULL).")
        if pm10 is None:
            warnings.append(f"Row {row_num}: PM10 sensor telemetry is missing (stored as NULL).")
            
        reading = ReadingCreate(
            mission_id=mission_id,
            data_source=data_source,
            timestamp=timestamp_val,
            latitude=lat,
            longitude=lon,
            altitude=alt,
            altitude_reference=str(row['altitude_reference']) if 'altitude_reference' in df.columns and not pd.isna(row['altitude_reference']) else "RELATIVE_HOME",
            pm1=pm1,
            pm25=pm25,
            pm10=pm10,
            temperature=temp,
            humidity=humid,
            speed=float(row['speed']) if 'speed' in df.columns and not pd.isna(row['speed']) else None,
            heading=float(row['heading']) if 'heading' in df.columns and not pd.isna(row['heading']) else None,
            battery=int(row['battery']) if 'battery' in df.columns and not pd.isna(row['battery']) else None,
            satellites=int(row['satellites']) if 'satellites' in df.columns and not pd.isna(row['satellites']) else None,
            gps_status=str(row['gps_status']) if 'gps_status' in df.columns and not pd.isna(row['gps_status']) else None,
            signal_strength=float(row['signal_strength']) if 'signal_strength' in df.columns and not pd.isna(row['signal_strength']) else None
        )
        valid_readings.append(reading)
        
    accepted_rows = len(valid_readings)
    rejected_rows = total_rows - accepted_rows
    
    return {
        "success": True if accepted_rows > 0 else False,
        "readings": valid_readings,
        "total_rows": total_rows,
        "accepted_rows": accepted_rows,
        "rejected_rows": rejected_rows,
        "rows_processed": accepted_rows,
        "rows_rejected": rejected_rows,
        "warnings": warnings,
        "errors": errors
    }
