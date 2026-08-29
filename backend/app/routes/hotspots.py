from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.hotspot import Hotspot
from app.models.mission import Mission
from app.models.reading import Reading
from app.schemas.hotspot import HotspotResponse
from app.services.hotspot_detector import detect_hotspots_for_readings

router = APIRouter(prefix="/api", tags=["Hotspots"])

@router.get("/hotspots", response_model=List[HotspotResponse])
def get_all_hotspots(db: Session = Depends(get_db), mission_id: str = None):
    query = db.query(Hotspot)
    if mission_id:
        query = query.filter(Hotspot.mission_id == mission_id)
    return query.order_by(Hotspot.detected_at.desc()).all()

@router.get("/missions/{mission_id}/hotspots", response_model=List[HotspotResponse])
def get_mission_hotspots(mission_id: str, db: Session = Depends(get_db)):
    return db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()

@router.post("/missions/{mission_id}/detect-hotspots", response_model=List[HotspotResponse])
def detect_hotspots(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # Get all readings for mission
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
    if not readings:
        return []
        
    # Convert to dicts for the service
    readings_dict = [
        {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "altitude": r.altitude if hasattr(r, 'altitude') else None,
            "aqi": r.aqi,
            "pm25": r.pm25,
            "pm10": r.pm10
        } for r in readings
    ]
    
    # Run detection
    detected = detect_hotspots_for_readings(readings_dict)
    
    # Delete old hotspots for this mission
    db.query(Hotspot).filter(Hotspot.mission_id == mission_id).delete()
    
    new_hotspots = []
    for h in detected:
        hotspot = Hotspot(
            mission_id=mission_id,
            latitude=h["latitude"],
            longitude=h["longitude"],
            radius_meters=h["radius_meters"],
            average_aqi=h["average_aqi"],
            peak_aqi=h["peak_aqi"],
            average_pm25=h["average_pm25"],
            peak_pm25=h["peak_pm25"],
            average_pm10=h["average_pm10"],
            peak_pm10=h["peak_pm10"],
            severity=h["severity"],
            reading_count=h["reading_count"],
            min_altitude=h.get("min_altitude"),
            max_altitude=h.get("max_altitude"),
            average_altitude=h.get("average_altitude")
        )
        db.add(hotspot)
        new_hotspots.append(hotspot)
        
    db.commit()
    for h in new_hotspots:
        db.refresh(h)
        
    return new_hotspots

from app.schemas.persistent import PersistentHotspotsResponse

@router.get("/hotspots/persistent", response_model=PersistentHotspotsResponse)
def get_persistent_hotspots(db: Session = Depends(get_db)):
    hotspots = db.query(Hotspot).all()
    total_missions = db.query(Mission).count()
    
    from app.services.pollution_zones import calculate_persistent_hotspots
    from app.core.config import settings
    
    return calculate_persistent_hotspots(hotspots, total_missions, settings)
