from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.schemas.mission import MissionCreate, MissionResponse, MissionHistoryItem, MissionAnalytics, FlightAnalytics, EnvironmentalAnalytics, EnvMetric, HotspotAnalytics, MissionUpdate
from app.schemas.reading import PaginatedReadingsResponse, DataQualityStats, ReadingResponse
from datetime import datetime
from sqlalchemy import func
from fastapi.responses import StreamingResponse
import io
import csv

router = APIRouter(prefix="/api/missions", tags=["Missions"])

@router.get("/", response_model=List[MissionHistoryItem])
def get_missions(db: Session = Depends(get_db), limit: int = 100):
    missions = db.query(Mission).order_by(Mission.created_at.desc()).limit(limit).all()
    
    if not missions:
        return []
        
    mission_ids = [m.mission_id for m in missions]
    
    # 1. Fetch reading stats for these missions
    reading_stats_raw = db.query(
        Reading.mission_id,
        func.avg(Reading.aqi).label('average_aqi'),
        func.max(Reading.aqi).label('peak_aqi'),
        func.avg(Reading.pm25).label('average_pm25'),
        func.max(Reading.pm25).label('peak_pm25'),
        func.avg(Reading.pm10).label('average_pm10'),
        func.max(Reading.pm10).label('peak_pm10'),
        func.avg(Reading.temperature).label('average_temperature'),
        func.avg(Reading.humidity).label('average_humidity')
    ).filter(Reading.mission_id.in_(mission_ids)).group_by(Reading.mission_id).all()
    
    # Convert to dict for fast lookup
    stats_dict = {row.mission_id: row for row in reading_stats_raw}
    
    # 2. Fetch hotspot counts for these missions
    # Assuming Hotspot model exists, but we need to import it.
    from app.models.hotspot import Hotspot
    hotspot_stats_raw = db.query(
        Hotspot.mission_id,
        func.count(Hotspot.id).label('hotspot_count')
    ).filter(Hotspot.mission_id.in_(mission_ids)).group_by(Hotspot.mission_id).all()
    
    hotspots_dict = {row.mission_id: row.hotspot_count for row in hotspot_stats_raw}
    
    result = []
    for m in missions:
        stats = stats_dict.get(m.mission_id)
        hotspot_count = hotspots_dict.get(m.mission_id, 0)
        
        item = MissionHistoryItem.from_orm(m)
        if stats:
            item.average_aqi = stats.average_aqi
            item.peak_aqi = stats.peak_aqi
            item.average_pm25 = stats.average_pm25
            item.peak_pm25 = stats.peak_pm25
            item.average_pm10 = stats.average_pm10
            item.peak_pm10 = stats.peak_pm10
            item.average_temperature = stats.average_temperature
            item.average_humidity = stats.average_humidity
            
        item.hotspot_count = hotspot_count
        result.append(item)
        
    return result

@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found")
    return mission

@router.post("/", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
def create_mission(mission_in: MissionCreate, db: Session = Depends(get_db)):
    db_mission = db.query(Mission).filter(Mission.mission_id == mission_in.mission_id).first()
    if db_mission:
        raise HTTPException(status_code=400, detail="Mission already exists")
    
    new_mission = Mission(
        mission_id=mission_in.mission_id,
        drone_id=mission_in.drone_id,
        status=mission_in.status,
        data_source=mission_in.data_source,
        start_time=mission_in.start_time or datetime.utcnow()
    )
    db.add(new_mission)
    db.commit()
    db.refresh(new_mission)
    return new_mission

@router.patch("/{mission_id}", response_model=MissionResponse)
def update_mission(mission_id: str, mission_in: MissionUpdate, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found")
    
    update_data = mission_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mission, field, value)
        
    db.commit()
    db.refresh(mission)
    return mission

@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found")
    
    db.delete(mission)
    db.commit()
    return None

def build_readings_query(db, mission_id, start_time, end_time, aqi_min, aqi_max, pm25_min, pm25_max):
    query = db.query(Reading).filter(Reading.mission_id == mission_id)
    if start_time:
        query = query.filter(Reading.timestamp >= start_time)
    if end_time:
        query = query.filter(Reading.timestamp <= end_time)
        if start_time and start_time > end_time:
            raise HTTPException(status_code=400, detail="start_time cannot be after end_time")
    if aqi_min is not None:
        query = query.filter(Reading.aqi >= aqi_min)
    if aqi_max is not None:
        query = query.filter(Reading.aqi <= aqi_max)
    if pm25_min is not None:
        query = query.filter(Reading.pm25 >= pm25_min)
    if pm25_max is not None:
        query = query.filter(Reading.pm25 <= pm25_max)
    return query

@router.get("/{mission_id}/readings", response_model=PaginatedReadingsResponse)
def get_mission_readings(
    mission_id: str,
    page: int = 1,
    limit: int = 50,
    start_time: str = None,
    end_time: str = None,
    aqi_min: int = None,
    aqi_max: int = None,
    pm25_min: float = None,
    pm25_max: float = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 1000")
        
    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time else None
    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if end_time else None
    
    base_query = build_readings_query(db, mission_id, start_dt, end_dt, aqi_min, aqi_max, pm25_min, pm25_max)
    
    total = base_query.count()
    pages = (total + limit - 1) // limit if total > 0 else 0
    
    if sort_by == "timestamp":
        order_col = Reading.timestamp
    elif sort_by == "aqi":
        order_col = Reading.aqi
    elif sort_by == "pm25":
        order_col = Reading.pm25
    else:
        raise HTTPException(status_code=400, detail="Invalid sort_by field")
        
    if sort_order == "asc":
        order_col = order_col.asc()
    else:
        order_col = order_col.desc()
        
    items = base_query.order_by(order_col).offset((page - 1) * limit).limit(limit).all()
    
    # Calculate data quality
    valid_gps = sum(1 for r in items if r.latitude is not None and r.longitude is not None and not (-1 > r.latitude or r.latitude > 1) and not (r.latitude == 0 and r.longitude == 0) and r.latitude != -90 and r.latitude != 90) # basic validity check
    missing_pm1 = sum(1 for r in items if r.pm1 is None)
    missing_pm25 = sum(1 for r in items if r.pm25 is None)
    missing_pm10 = sum(1 for r in items if r.pm10 is None)
    missing_temperature = sum(1 for r in items if r.temperature is None)
    missing_humidity = sum(1 for r in items if r.humidity is None)
    
    dq = DataQualityStats(
        total_readings=len(items),
        valid_gps=valid_gps,
        missing_pm1=missing_pm1,
        missing_pm25=missing_pm25,
        missing_pm10=missing_pm10,
        missing_temperature=missing_temperature,
        missing_humidity=missing_humidity
    )
    
    return PaginatedReadingsResponse(
        items=items,
        page=page,
        limit=limit,
        total=total,
        pages=pages,
        data_quality=dq
    )

@router.get("/{mission_id}/readings/export")
def export_mission_readings(
    mission_id: str,
    start_time: str = None,
    end_time: str = None,
    aqi_min: int = None,
    aqi_max: int = None,
    pm25_min: float = None,
    pm25_max: float = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    include_simulation: bool = False,
    db: Session = Depends(get_db)
):
    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time else None
    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if end_time else None
    
    base_query = build_readings_query(db, mission_id, start_dt, end_dt, aqi_min, aqi_max, pm25_min, pm25_max)
    
    if sort_by == "timestamp":
        order_col = Reading.timestamp
    elif sort_by == "aqi":
        order_col = Reading.aqi
    elif sort_by == "pm25":
        order_col = Reading.pm25
    else:
        raise HTTPException(status_code=400, detail="Invalid sort_by field")
        
    if sort_order == "asc":
        order_col = order_col.asc()
    else:
        order_col = order_col.desc()
        
    readings = base_query.order_by(order_col).all()
    
    if include_simulation:
        from app.models.simulation import ResponseSimulation
        latest_sim = db.query(ResponseSimulation).filter(ResponseSimulation.mission_id == mission_id).order_by(ResponseSimulation.created_at.desc()).first()
        if latest_sim:
            sim_readings = db.query(Reading).filter(Reading.mission_id == latest_sim.simulation_id).order_by(order_col).all()
            readings.extend(sim_readings)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = ["timestamp", "latitude", "longitude", "altitude", "pm1", "pm25", "pm10", "temperature", "humidity", "aqi", "aqi_category", "data_source"]
    writer.writerow(headers)
    
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat() if r.timestamp else "",
            r.latitude,
            r.longitude,
            r.altitude,
            r.pm1,
            r.pm25,
            r.pm10,
            r.temperature,
            r.humidity,
            r.aqi,
            r.aqi_category,
            r.data_source
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=readings_{mission_id}.csv"}
    )

@router.get("/{mission_id}/report")
def get_mission_report(mission_id: str, db: Session = Depends(get_db)):
    """Generate a comprehensive JSON mission report including replay events."""
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    from app.services.mission_replay import get_replay_events
    events = get_replay_events(mission_id, db)
    
    # Base analytics
    from app.services.stats import calculate_mission_stats
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp).all()
    stats = calculate_mission_stats(readings) if readings else {}
    
    return {
        "mission_id": mission.mission_id,
        "drone_id": mission.drone_id,
        "status": mission.status,
        "analytics": stats,
        "replay_timeline": events,
        "labels": {
            "real_data": "OBSERVED DATA",
            "inferences": "ANALYSIS",
            "recommendations": "RECOMMENDATION",
            "simulated_data": "SIMULATION"
        }
    }

@router.get("/{mission_id}/analytics", response_model=MissionAnalytics)
def get_mission_analytics(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found")
        
    # Recalculate distance if it's missing but we have readings
    if mission.distance_km == 0.0 and mission.total_readings > 0:
        # We can dynamically calculate it or leave it as 0.0 if not easily available.
        # However, step 1's stats service already handles this. 
        # But wait, we shouldn't modify the database unnecessarily in a GET request.
        # We'll just rely on the stored value for now, or dynamically calculate it if missing.
        from app.services.stats import calculate_mission_stats
        readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp).all()
        if readings:
            stats = calculate_mission_stats(readings)
            mission.distance_km = stats["total_distance_km"]
            mission.duration_seconds = stats["duration_seconds"]
            db.commit()
            
    reading_stats = db.query(
        func.avg(Reading.aqi).label('avg_aqi'),
        func.min(Reading.aqi).label('min_aqi'),
        func.max(Reading.aqi).label('max_aqi'),
        func.avg(Reading.pm1).label('avg_pm1'),
        func.min(Reading.pm1).label('min_pm1'),
        func.max(Reading.pm1).label('max_pm1'),
        func.avg(Reading.pm25).label('avg_pm25'),
        func.min(Reading.pm25).label('min_pm25'),
        func.max(Reading.pm25).label('max_pm25'),
        func.avg(Reading.pm10).label('avg_pm10'),
        func.min(Reading.pm10).label('min_pm10'),
        func.max(Reading.pm10).label('max_pm10'),
        func.avg(Reading.temperature).label('avg_temperature'),
        func.min(Reading.temperature).label('min_temperature'),
        func.max(Reading.temperature).label('max_temperature'),
        func.avg(Reading.humidity).label('avg_humidity'),
        func.min(Reading.humidity).label('min_humidity'),
        func.max(Reading.humidity).label('max_humidity'),
        func.min(Reading.altitude).label('min_altitude'),
        func.max(Reading.altitude).label('max_altitude'),
        func.avg(Reading.speed).label('avg_speed'),
        func.max(Reading.speed).label('max_speed')
    ).filter(Reading.mission_id == mission_id).first()

    from app.models.hotspot import Hotspot
    hotspot_stats = db.query(
        func.count(Hotspot.id).label('count'),
        func.max(Hotspot.peak_aqi).label('highest_aqi'),
        func.avg(Hotspot.average_aqi).label('average_aqi')
    ).filter(Hotspot.mission_id == mission_id).first()
    
    return MissionAnalytics(
        mission=MissionResponse.from_orm(mission),
        flight=FlightAnalytics(
            duration_seconds=mission.duration_seconds,
            distance_km=mission.distance_km,
            total_readings=mission.total_readings,
            max_altitude=reading_stats.max_altitude if reading_stats else None,
            min_altitude=reading_stats.min_altitude if reading_stats else None,
            average_speed=reading_stats.avg_speed if reading_stats else None,
            max_speed=reading_stats.max_speed if reading_stats else None
        ),
        environment=EnvironmentalAnalytics(
            aqi=EnvMetric(average=reading_stats.avg_aqi, minimum=reading_stats.min_aqi, maximum=reading_stats.max_aqi) if reading_stats else EnvMetric(),
            pm1=EnvMetric(average=reading_stats.avg_pm1, minimum=reading_stats.min_pm1, maximum=reading_stats.max_pm1) if reading_stats else EnvMetric(),
            pm25=EnvMetric(average=reading_stats.avg_pm25, minimum=reading_stats.min_pm25, maximum=reading_stats.max_pm25) if reading_stats else EnvMetric(),
            pm10=EnvMetric(average=reading_stats.avg_pm10, minimum=reading_stats.min_pm10, maximum=reading_stats.max_pm10) if reading_stats else EnvMetric(),
            temperature=EnvMetric(average=reading_stats.avg_temperature, minimum=reading_stats.min_temperature, maximum=reading_stats.max_temperature) if reading_stats else EnvMetric(),
            humidity=EnvMetric(average=reading_stats.avg_humidity, minimum=reading_stats.min_humidity, maximum=reading_stats.max_humidity) if reading_stats else EnvMetric()
        ),
        hotspots=HotspotAnalytics(
            count=hotspot_stats.count if hotspot_stats and hotspot_stats.count else 0,
            highest_aqi=hotspot_stats.highest_aqi if hotspot_stats else None,
            average_aqi=hotspot_stats.average_aqi if hotspot_stats else None
        )
    )

from app.schemas.comparison import MissionComparisonResponse

@router.get("/{mission_id}/compare/{previous_mission_id}", response_model=MissionComparisonResponse)
def compare_historical_missions(mission_id: str, previous_mission_id: str, db: Session = Depends(get_db)):
    if mission_id == previous_mission_id:
        raise HTTPException(status_code=400, detail="Cannot compare a mission to itself")

    current_mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not current_mission:
        raise HTTPException(status_code=404, detail=f"Current mission '{mission_id}' not found")
        
    previous_mission = db.query(Mission).filter(Mission.mission_id == previous_mission_id).first()
    if not previous_mission:
        raise HTTPException(status_code=404, detail=f"Previous mission '{previous_mission_id}' not found")
        
    current_readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
    previous_readings = db.query(Reading).filter(Reading.mission_id == previous_mission_id).all()
    
    from app.models.hotspot import Hotspot
    current_hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    previous_hotspots = db.query(Hotspot).filter(Hotspot.mission_id == previous_mission_id).all()
    
    from app.services.comparison import compare_missions_data
    from app.core.config import settings
    
    return compare_missions_data(
        current_mission, 
        previous_mission, 
        current_readings, 
        previous_readings, 
        current_hotspots, 
        previous_hotspots,
        settings
    )

from app.schemas.kpi import EnvironmentalAnalyticsResponse

@router.get("/{mission_id}/environmental-analytics", response_model=EnvironmentalAnalyticsResponse)
def get_environmental_kpi(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
    
    from app.services.kpi import calculate_environmental_kpi
    from app.core.config import settings
    
    return calculate_environmental_kpi(mission_id, readings, settings)

from app.schemas.zones import ZonesResponse

@router.get("/{mission_id}/zones", response_model=ZonesResponse)
def get_mission_zones(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
    
    from app.services.pollution_zones import calculate_pollution_zones
    from app.core.config import settings
    
    return calculate_pollution_zones(mission_id, readings, settings)

@router.get("/{mission_id}/intelligence")
def get_mission_intelligence(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    from app.services.pollution_intelligence import generate_pollution_summary
    try:
        return generate_pollution_summary(mission_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{mission_id}/live-state")
def get_mission_live_state(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    latest_reading = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.desc()).first()
    
    from app.services.alert_engine import detect_alerts
    from app.services.event_system import generate_events
    
    active_alerts = detect_alerts(mission_id, db)
    events = generate_events(mission_id, db)
    latest_event = events[0] if events else None
    
    return {
        "mission_id": mission.mission_id,
        "status": mission.status,
        "drone_id": mission.drone_id,
        "latest_timestamp": latest_reading.timestamp.isoformat() if latest_reading else None,
        "current_location": {
            "latitude": latest_reading.latitude if latest_reading else None,
            "longitude": latest_reading.longitude if latest_reading else None
        },
        "current_altitude": latest_reading.altitude if latest_reading else None,
        "current_speed": latest_reading.speed if latest_reading else None,
        "current_heading": latest_reading.heading if latest_reading else None,
        "battery": latest_reading.battery if latest_reading else None,
        "gps_status": latest_reading.gps_status if latest_reading else "NO_SIGNAL",
        "latest_environment": {
            "aqi": latest_reading.aqi if latest_reading else None,
            "aqi_category": latest_reading.aqi_category if latest_reading else "UNKNOWN",
            "pm25": latest_reading.pm25 if latest_reading else None,
            "pm10": latest_reading.pm10 if latest_reading else None,
            "temperature": latest_reading.temperature if latest_reading else None,
            "humidity": latest_reading.humidity if latest_reading else None
        },
        "active_alerts": active_alerts,
        "latest_event": latest_event
    }

@router.get("/{mission_id}/events")
def get_mission_events(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    from app.services.event_system import generate_events
    return generate_events(mission_id, db)

from app.schemas.decision import EnvironmentalDecisionResponse

@router.get("/{mission_id}/decision", response_model=EnvironmentalDecisionResponse)
def get_mission_decision(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    from app.services.environmental_decision import generate_environmental_decision
    from app.core.config import settings
    return generate_environmental_decision(mission_id, db, settings)


