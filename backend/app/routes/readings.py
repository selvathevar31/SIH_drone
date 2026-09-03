from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.reading import Reading
from app.models.mission import Mission
from app.schemas.reading import ReadingCreate
from app.schemas.environmental import EnvironmentalRecordResponse
from app.services.aqi import calculate_aqi

router = APIRouter(tags=["Readings"])

def to_canonical_response(r: Reading) -> Dict[str, Any]:
    warnings = []
    
    # 1. Measurement availability check
    optional_measurements = [r.pm25, r.pm10, r.temperature, r.humidity]
    has_all_optional = all(m is not None for m in optional_measurements)
    
    # 2. Check for non-fatal quality warnings (e.g. extreme values)
    has_extreme_values = False
    if r.pm25 is not None and (r.pm25 > 500.0):
        warnings.append("PM2.5 value is exceptionally high (above 500 µg/m³).")
        has_extreme_values = True
    if r.temperature is not None and (r.temperature > 55.0 or r.temperature < -15.0):
        warnings.append("Temperature value is at extreme physical boundaries.")
        has_extreme_values = True
        
    if r.pm25 is None:
        warnings.append("PM2.5 sensor telemetry is missing.")
    if r.pm10 is None:
        warnings.append("PM10 sensor telemetry is missing.")
    if r.temperature is None:
        warnings.append("Temperature sensor telemetry is missing.")
    if r.humidity is None:
        warnings.append("Humidity sensor telemetry is missing.")

    # 3. Determine Quality Status
    if has_extreme_values:
        quality_status = "WARNING"
    elif has_all_optional:
        quality_status = "VALID"
    else:
        quality_status = "PARTIAL"

    return {
        # Canonical nested fields
        "timestamp": r.timestamp.isoformat(),
        "location": {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "altitude": r.altitude
        },
        "measurements": {
            "pm1": r.pm1,
            "pm25": r.pm25,
            "pm10": r.pm10,
            "temperature": r.temperature,
            "humidity": r.humidity
        },
        "derived": {
            "aqi": r.aqi,
            "aqi_category": r.aqi_category or "UNKNOWN",
            "pm25_aqi": r.pm25_aqi,
            "pm10_aqi": r.pm10_aqi
        },
        "metadata": {
            "source": r.data_source or "UNKNOWN",
            "mission_id": r.mission_id,
            "reading_id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "quality_status": quality_status,
            "validation_warnings": warnings
        },
        
        # Legacy flat fields at root level
        "id": r.id,
        "mission_id": r.mission_id,
        "data_source": r.data_source or "UNKNOWN",
        "latitude": r.latitude,
        "longitude": r.longitude,
        "altitude": r.altitude,
        "pm1": r.pm1,
        "pm25": r.pm25,
        "pm10": r.pm10,
        "temperature": r.temperature,
        "humidity": r.humidity,
        "aqi": r.aqi,
        "pm25_aqi": r.pm25_aqi,
        "pm10_aqi": r.pm10_aqi,
        "aqi_category": r.aqi_category or "UNKNOWN"
    }

# 1. Versioned Public API Namespace (Public / Consumable by Sid's App)
@router.get("/api/v1/readings", response_model=List[EnvironmentalRecordResponse])
def get_readings_v1(
    db: Session = Depends(get_db), 
    mission_id: str = None,
    limit: int = 100, 
    offset: int = 0
):
    """
    Public standardized readings endpoint. Consumable by public applications.
    Exposes canonical nested structures for clean consumption.
    """
    query = db.query(Reading)
    if mission_id:
        query = query.filter(Reading.mission_id == mission_id)
    items = query.order_by(Reading.timestamp.desc()).offset(offset).limit(limit).all()
    return [to_canonical_response(r) for r in items]

# 2. Internal Operator API Namespace (Retained for dashboard compatibility)
@router.get("/api/readings", response_model=List[EnvironmentalRecordResponse])
def get_readings_legacy(
    db: Session = Depends(get_db), 
    mission_id: str = None,
    limit: int = 100, 
    offset: int = 0
):
    """
    Operator internal readings endpoint. Maintains full backward compatibility with the dashboard.
    """
    query = db.query(Reading)
    if mission_id:
        query = query.filter(Reading.mission_id == mission_id)
    items = query.order_by(Reading.timestamp.desc()).offset(offset).limit(limit).all()
    return [to_canonical_response(r) for r in items]

@router.post("/api/readings", response_model=EnvironmentalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_reading(reading_in: ReadingCreate, db: Session = Depends(get_db)):
    # Validate coordinate boundaries
    if reading_in.latitude < -90 or reading_in.latitude > 90:
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if reading_in.longitude < -180 or reading_in.longitude > 180:
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    # Verify mission
    mission = db.query(Mission).filter(Mission.mission_id == reading_in.mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{reading_in.mission_id}' not found")
        
    # Calculate AQI
    aqi_data = calculate_aqi(pm25=reading_in.pm25, pm10=reading_in.pm10)
    
    new_reading = Reading(
        mission_id=reading_in.mission_id,
        data_source=reading_in.data_source,
        timestamp=reading_in.timestamp,
        latitude=reading_in.latitude,
        longitude=reading_in.longitude,
        altitude=reading_in.altitude,
        pm1=reading_in.pm1,
        pm25=reading_in.pm25,
        pm10=reading_in.pm10,
        temperature=reading_in.temperature,
        humidity=reading_in.humidity,
        speed=reading_in.speed,
        heading=reading_in.heading,
        battery=reading_in.battery,
        satellites=reading_in.satellites,
        gps_status=reading_in.gps_status,
        signal_strength=reading_in.signal_strength,
        aqi=aqi_data["aqi"],
        aqi_category=aqi_data["category"]
    )
    
    # Update mission stats
    mission.total_readings += 1
    mission.current_latitude = new_reading.latitude
    mission.current_longitude = new_reading.longitude
    if not mission.start_latitude:
        mission.start_latitude = new_reading.latitude
        mission.start_longitude = new_reading.longitude
        
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    return to_canonical_response(new_reading)
