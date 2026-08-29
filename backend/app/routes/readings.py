from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.reading import Reading
from app.models.mission import Mission
from app.schemas.reading import ReadingCreate, ReadingResponse
from app.services.aqi import calculate_aqi

router = APIRouter(prefix="/api/readings", tags=["Readings"])

@router.get("/", response_model=List[ReadingResponse])
def get_readings(
    db: Session = Depends(get_db), 
    mission_id: str = None,
    limit: int = 100, 
    offset: int = 0
):
    query = db.query(Reading)
    if mission_id:
        query = query.filter(Reading.mission_id == mission_id)
    return query.order_by(Reading.timestamp.desc()).offset(offset).limit(limit).all()

@router.post("/", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
def create_reading(reading_in: ReadingCreate, db: Session = Depends(get_db)):
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
    
    # Update mission stats (simple approach for single reading)
    mission.total_readings += 1
    mission.current_latitude = new_reading.latitude
    mission.current_longitude = new_reading.longitude
    if not mission.start_latitude:
        mission.start_latitude = new_reading.latitude
        mission.start_longitude = new_reading.longitude
        
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    return new_reading
