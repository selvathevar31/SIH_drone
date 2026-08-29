from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.reading import Reading
from app.models.mission import Mission
from app.models.hotspot import Hotspot
from app.services.comparison import compare_missions_data
from app.core.config import settings

def get_highest_aqi(db: Session, mission_id: str) -> Dict[str, Any]:
    r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.aqi != None).order_by(Reading.aqi.desc()).first()
    if r:
        return {
            "evidence": [{
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "altitude": r.altitude,
                "pm25": r.pm25,
                "pm10": r.pm10,
                "aqi": r.aqi,
                "aqi_category": r.aqi_category
            }]
        }
    return {"evidence": []}

def get_highest_pm25(db: Session, mission_id: str) -> Dict[str, Any]:
    r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.pm25 != None).order_by(Reading.pm25.desc()).first()
    if r:
        return {
            "evidence": [{
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "altitude": r.altitude,
                "pm25": r.pm25,
                "pm10": r.pm10,
                "aqi": r.aqi
            }]
        }
    return {"evidence": []}

def get_highest_pm10(db: Session, mission_id: str) -> Dict[str, Any]:
    r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.pm10 != None).order_by(Reading.pm10.desc()).first()
    if r:
        return {
            "evidence": [{
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "altitude": r.altitude,
                "pm25": r.pm25,
                "pm10": r.pm10,
                "aqi": r.aqi
            }]
        }
    return {"evidence": []}

def get_average_pollution(db: Session, mission_id: str, pollutant: str) -> Dict[str, Any]:
    if pollutant == "pm25":
        val = db.query(func.avg(Reading.pm25)).filter(Reading.mission_id == mission_id).scalar()
        col = "pm25"
    elif pollutant == "pm10":
        val = db.query(func.avg(Reading.pm10)).filter(Reading.mission_id == mission_id).scalar()
        col = "pm10"
    else:
        val = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == mission_id).scalar()
        col = "aqi"
        
    if val is not None:
        count = db.query(func.count(Reading.id)).filter(Reading.mission_id == mission_id).scalar()
        evidence_item = {"average_value": round(val, 2), "metric": col, "readings_used": count}
        return {"evidence": [evidence_item]}
    return {"evidence": []}

def get_pollution_by_altitude(db: Session, mission_id: str) -> Dict[str, Any]:
    readings = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.altitude != None).all()
    if not readings:
        return {"evidence": []}
        
    bins = {}
    for r in readings:
        alt_bin = int(r.altitude // 10) * 10
        if alt_bin not in bins:
            bins[alt_bin] = {"pm25_sum": 0, "aqi_sum": 0, "count": 0}
        bins[alt_bin]["pm25_sum"] += r.pm25 or 0
        bins[alt_bin]["aqi_sum"] += r.aqi or 0
        bins[alt_bin]["count"] += 1
        
    evidence = []
    for alt, data in bins.items():
        evidence.append({
            "altitude_range": f"{alt}-{alt+10}m",
            "average_pm25": round(data["pm25_sum"] / data["count"], 2) if data["count"] > 0 else 0,
            "average_aqi": round(data["aqi_sum"] / data["count"], 2) if data["count"] > 0 else 0,
            "readings_used": data["count"]
        })
    
    # Sort and pick the worst bin to simplify
    if evidence:
        evidence.sort(key=lambda x: x["average_aqi"], reverse=True)
        return {"evidence": evidence[:3]}  # Return top 3 worst altitude bins
        
    return {"evidence": []}

def get_pollution_trend(db: Session, mission_id: str) -> Dict[str, Any]:
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    if len(readings) < 10:
        return {"evidence": []}
        
    first_half = readings[:len(readings)//2]
    second_half = readings[len(readings)//2:]
    
    avg_aqi_first = sum(r.aqi for r in first_half if r.aqi is not None) / max(len(first_half), 1)
    avg_aqi_second = sum(r.aqi for r in second_half if r.aqi is not None) / max(len(second_half), 1)
    avg_pm25_first = sum(r.pm25 for r in first_half if r.pm25 is not None) / max(len(first_half), 1)
    avg_pm25_second = sum(r.pm25 for r in second_half if r.pm25 is not None) / max(len(second_half), 1)
    
    return {
        "evidence": [{
            "metric": "trend",
            "initial_half_average_aqi": round(avg_aqi_first, 2),
            "second_half_average_aqi": round(avg_aqi_second, 2),
            "initial_half_average_pm25": round(avg_pm25_first, 2),
            "second_half_average_pm25": round(avg_pm25_second, 2),
            "readings_used": len(readings)
        }]
    }

def get_hotspot_summary(db: Session, mission_id: str) -> Dict[str, Any]:
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    evidence = []
    for h in hotspots:
        evidence.append({
            "latitude": h.latitude,
            "longitude": h.longitude,
            "peak_aqi": h.peak_aqi,
            "average_aqi": h.average_aqi,
            "severity": h.severity,
            "radius_meters": h.radius_meters
        })
    return {"evidence": evidence, "total_hotspots": len(evidence)}

def get_mission_summary(db: Session, mission_id: str) -> Dict[str, Any]:
    m = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not m:
        return {"evidence": []}
        
    avg_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == mission_id).scalar()
    hotspots_count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar()
    
    return {
        "evidence": [{
            "mission_id": m.mission_id,
            "status": m.status,
            "total_readings": m.total_readings,
            "distance_km": m.distance_km,
            "average_aqi": round(avg_aqi, 2) if avg_aqi else None,
            "hotspots_detected": hotspots_count
        }]
    }

def get_mission_comparison(db: Session, current_mission_id: str, previous_mission_id: Optional[str] = None) -> Dict[str, Any]:
    current_mission = db.query(Mission).filter(Mission.mission_id == current_mission_id).first()
    
    if not current_mission:
        return {"evidence": []}
    
    if not previous_mission_id:
        # Find the mission that was created immediately BEFORE the current one
        reference_time = current_mission.start_time or current_mission.created_at
        if reference_time is None:
            return {"evidence": []}
        previous_mission = db.query(Mission).filter(
            Mission.mission_id != current_mission_id,
            Mission.created_at < reference_time
        ).order_by(Mission.created_at.desc()).first()
    else:
        previous_mission = db.query(Mission).filter(Mission.mission_id == previous_mission_id).first()
        
    if not previous_mission:
        return {"evidence": []}
        
    current_avg_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == current_mission.mission_id).scalar()
    previous_avg_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == previous_mission.mission_id).scalar()
    
    return {
        "evidence": [{
            "current_mission_id": current_mission.mission_id,
            "previous_mission_id": previous_mission.mission_id,
            "current_average_aqi": round(current_avg_aqi, 2) if current_avg_aqi else None,
            "previous_average_aqi": round(previous_avg_aqi, 2) if previous_avg_aqi else None,
            "percentage_change": round(((current_avg_aqi - previous_avg_aqi) / max(previous_avg_aqi, 1)) * 100, 2) if current_avg_aqi and previous_avg_aqi else None
        }]
    }
