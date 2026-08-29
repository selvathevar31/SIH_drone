import pandas as pd
from typing import Dict, Any, List
from io import BytesIO
from app.services.aqi import calculate_aqi
from app.schemas.reading import ReadingCreate
import math

REQUIRED_COLUMNS = ['timestamp', 'latitude', 'longitude', 'altitude', 'pm25', 'pm10', 'temperature', 'humidity']

def process_csv_upload(file_content: bytes, mission_id: str, data_source: str = "CSV") -> Dict[str, Any]:
    try:
        df = pd.read_csv(BytesIO(file_content))
    except Exception as e:
        return {"success": False, "error": f"Failed to parse CSV: {str(e)}"}
        
    # Check columns
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        return {"success": False, "error": f"Missing required columns: {', '.join(missing_cols)}"}
        
    # Clean data: drop rows with missing essential spatial/time data
    df = df.dropna(subset=['timestamp', 'latitude', 'longitude'])
    
    valid_readings = []
    rejected_count = 0
    
    for _, row in df.iterrows():
        try:
            lat = float(row['latitude'])
            lon = float(row['longitude'])
            
            # Validate GPS bounds
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                rejected_count += 1
                continue
                
            pm25 = float(row['pm25']) if not pd.isna(row['pm25']) else None
            pm10 = float(row['pm10']) if not pd.isna(row['pm10']) else None
            
            # Reject negative values
            if (pm25 is not None and pm25 < 0) or (pm10 is not None and pm10 < 0):
                rejected_count += 1
                continue
                
            reading = ReadingCreate(
                mission_id=mission_id,
                data_source=data_source,
                timestamp=row['timestamp'],
                latitude=lat,
                longitude=lon,
                altitude=float(row['altitude']) if not pd.isna(row['altitude']) else None,
                altitude_reference=str(row['altitude_reference']) if 'altitude_reference' in df.columns and not pd.isna(row['altitude_reference']) else "RELATIVE_HOME",
                pm25=pm25,
                pm10=pm10,
                temperature=float(row['temperature']) if 'temperature' in df.columns and not pd.isna(row['temperature']) else None,
                humidity=float(row['humidity']) if 'humidity' in df.columns and not pd.isna(row['humidity']) else None,
                speed=float(row['speed']) if 'speed' in df.columns and not pd.isna(row['speed']) else None,
                heading=float(row['heading']) if 'heading' in df.columns and not pd.isna(row['heading']) else None,
                battery=int(row['battery']) if 'battery' in df.columns and not pd.isna(row['battery']) else None,
                satellites=int(row['satellites']) if 'satellites' in df.columns and not pd.isna(row['satellites']) else None,
                gps_status=str(row['gps_status']) if 'gps_status' in df.columns and not pd.isna(row['gps_status']) else None,
                signal_strength=float(row['signal_strength']) if 'signal_strength' in df.columns and not pd.isna(row['signal_strength']) else None
            )
            valid_readings.append(reading)
        except Exception:
            rejected_count += 1
            
    return {
        "success": True,
        "readings": valid_readings,
        "rows_processed": len(valid_readings),
        "rows_rejected": rejected_count
    }
