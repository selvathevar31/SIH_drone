from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.schemas.dashboard import DashboardResponse, FlightPathPoint, TrendPoint, EnvironmentMapPoint
from app.services.stats import calculate_mission_stats, is_valid_gps

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard/{mission_id}", response_model=DashboardResponse)
def get_dashboard(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # Get latest reading for current environment & telemetry
    latest_reading = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.desc()).first()
    
    # Get hotspots
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    
    # Downsample flight path and trend (simple slice downsampling for prototype)
    all_readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    step = max(1, len(all_readings) // 50) if all_readings else 1
    sampled_readings = all_readings[::step]
    
    flight_path = [
        FlightPathPoint(
            timestamp=r.timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
            latitude=r.latitude,
            longitude=r.longitude,
            altitude=r.altitude
        ) for r in sampled_readings
    ]
    
    trend = []
    # Find timestamp of worst hotspot to mark on trend
    hotspot_time = None
    if hotspots:
        worst_hotspot = max(hotspots, key=lambda x: x.peak_aqi or 0)
        # Find closest reading to hotspot center
        closest_reading = min(all_readings, key=lambda x: (x.latitude - worst_hotspot.latitude)**2 + (x.longitude - worst_hotspot.longitude)**2) if all_readings else None
        if closest_reading:
            hotspot_time = closest_reading.timestamp
            
    for r in sampled_readings:
        is_hotspot = False
        if hotspot_time and abs((r.timestamp - hotspot_time).total_seconds()) < 30: # 30 sec window
            is_hotspot = True
            
        trend.append(
            TrendPoint(
                timestamp=r.timestamp.strftime("%H:%M:%S"),
                aqi=r.aqi,
                pm25=r.pm25,
                pm10=r.pm10,
                isHotspot=is_hotspot
            )
        )

    stats = calculate_mission_stats(all_readings)
    duration = stats["duration_seconds"] or mission.duration_seconds
    if not duration and mission.start_time and latest_reading:
        duration = int((latest_reading.timestamp - mission.start_time).total_seconds())
        
    dashboard_data = {
        "mission": {
            "id": mission.id,
            "mission_id": mission.mission_id,
            "drone_id": mission.drone_id,
            "status": mission.status,
            "data_source": mission.data_source,
            "start_time": mission.start_time,
            "end_time": mission.end_time,
            "duration_seconds": duration,
            "distance_km": stats["total_distance_km"],
            "total_readings": stats["total_readings"],
            "start_latitude": mission.start_latitude,
            "start_longitude": mission.start_longitude,
            "current_latitude": mission.current_latitude,
            "current_longitude": mission.current_longitude,
            "average_telemetry_speed_mps": stats["average_telemetry_speed_mps"],
            "average_ground_speed_mps": stats["average_ground_speed_mps"],
            "max_speed": stats["max_speed"],
            "max_altitude": stats["max_altitude"]
        },
        "current_environment": {
            "aqi": latest_reading.aqi if latest_reading else None,
            "aqi_category": latest_reading.aqi_category if latest_reading else None,
            "pm25": latest_reading.pm25 if latest_reading else None,
            "pm10": latest_reading.pm10 if latest_reading else None,
            "temperature": latest_reading.temperature if latest_reading else None,
            "humidity": latest_reading.humidity if latest_reading else None,
        },
        "telemetry": {
            "altitude": latest_reading.altitude if latest_reading else None,
            "speed": latest_reading.speed if latest_reading else None,
            "heading": latest_reading.heading if latest_reading else None,
            "gps_status": latest_reading.gps_status if latest_reading else "NO_SIGNAL",
            "satellites": latest_reading.satellites if latest_reading else None,
            "battery": latest_reading.battery if latest_reading else None,
            "signal_strength": latest_reading.signal_strength if latest_reading else None
        },
        "current_location": {
            "latitude": latest_reading.latitude if latest_reading else None,
            "longitude": latest_reading.longitude if latest_reading else None,
        },
        "flight_path": flight_path,
        "hotspots": hotspots,
        "trend": trend,
        "recent_events": [
            # Mocking recent events, this would normally query an Events table
            {"id": 1, "time": datetime.utcnow().strftime("%H:%M:%S"), "message": "Mission data fetched", "type": "info"}
        ]
    }
    
    return dashboard_data

@router.get("/missions/{mission_id}/flight-path", response_model=List[FlightPathPoint])
def get_flight_path(mission_id: str, db: Session = Depends(get_db)):
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    step = max(1, len(readings) // 100) # downsample
    sampled = readings[::step]
    return [
        FlightPathPoint(
            timestamp=r.timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
            latitude=r.latitude,
            longitude=r.longitude,
            altitude=r.altitude
        ) for r in sampled
    ]

@router.get("/missions/{mission_id}/trend", response_model=List[TrendPoint])
def get_trend(mission_id: str, db: Session = Depends(get_db)):
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    step = max(1, len(readings) // 50)
    sampled = readings[::step]
    return [
        TrendPoint(
            timestamp=r.timestamp.strftime("%H:%M"),
            aqi=r.aqi,
            pm25=r.pm25,
            pm10=r.pm10,
            isHotspot=False
        ) for r in sampled
    ]

@router.get("/missions/{mission_id}/environment-map", response_model=List[EnvironmentMapPoint])
def get_environment_map(mission_id: str, db: Session = Depends(get_db)):
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    points = []
    for r in readings:
        if is_valid_gps(r.latitude, r.longitude):
            points.append(
                EnvironmentMapPoint(
                    timestamp=r.timestamp,
                    latitude=r.latitude,
                    longitude=r.longitude,
                    altitude=r.altitude,
                    pm1=getattr(r, 'pm1', None),
                    pm25=r.pm25,
                    pm10=r.pm10,
                    temperature=r.temperature,
                    humidity=r.humidity,
                    aqi=r.aqi,
                    aqi_category=r.aqi_category
                )
            )
    return points
