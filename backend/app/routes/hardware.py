import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.reading import Reading
from app.models.mission import Mission
from app.schemas.reading import ReadingCreate
from app.schemas.environmental import EnvironmentalRecordResponse
from app.services.aqi import calculate_aqi
from app.routes.readings import to_canonical_response

router = APIRouter(tags=["Hardware Ingestion"])

# The hardware authentication token. In a real environment this should be set in .env
HARDWARE_TOKEN = os.getenv("HARDWARE_TOKEN", "qudracopter-hardware-secret")

def verify_hardware_token(x_hardware_token: str = Header(None)):
    if not x_hardware_token or x_hardware_token != HARDWARE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing hardware authentication token."
        )
    return x_hardware_token

@router.post("/api/telemetry/hardware", response_model=EnvironmentalRecordResponse, status_code=status.HTTP_201_CREATED)
def ingest_hardware_telemetry(
    reading_in: ReadingCreate, 
    db: Session = Depends(get_db),
    token: str = Depends(verify_hardware_token)
):
    """
    Authenticated ingestion endpoint specifically for physical hardware.
    Strictly isolates incoming data as 'hardware' to prevent masquerading.
    """
    
    # 1. Enforce Source Identity
    if reading_in.data_source != "hardware":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Payload data_source must strictly be 'hardware'."
        )

    # 2. Validate Coordinate Boundaries (Reject packets without GPS fix)
    if reading_in.latitude < -90.0 or reading_in.latitude > 90.0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Latitude must be between -90 and 90")
    if reading_in.longitude < -180.0 or reading_in.longitude > 180.0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Longitude must be between -180 and 180")
    if reading_in.latitude == 0.0 and reading_in.longitude == 0.0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid GPS coordinates (0.0, 0.0). Hardware must acquire fix.")

    # 3. Validate Environmental Bounds (Reject impossible values rather than corrupting DB)
    if reading_in.pm25 is not None and reading_in.pm25 < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="PM2.5 cannot be negative.")
    if reading_in.pm10 is not None and reading_in.pm10 < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="PM10 cannot be negative.")

    # 4. Mission Verification
    mission = db.query(Mission).filter(Mission.mission_id == reading_in.mission_id).first()
    if not mission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Mission '{reading_in.mission_id}' not found.")
        
    # 5. Calculate AQI dynamically based on hardware readings
    aqi_data = calculate_aqi(pm25=reading_in.pm25, pm10=reading_in.pm10)
    
    # 6. Database Insertion
    new_reading = Reading(
        mission_id=reading_in.mission_id,
        data_source="hardware", # Forcibly set regardless of payload injection attempts
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
    
    # Update mission cursor
    mission.total_readings += 1
    mission.current_latitude = new_reading.latitude
    mission.current_longitude = new_reading.longitude
    if not mission.start_latitude:
        mission.start_latitude = new_reading.latitude
        mission.start_longitude = new_reading.longitude
        
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    
    # Re-use existing canonical response generation to ensure uniform API shape
    return to_canonical_response(new_reading)
