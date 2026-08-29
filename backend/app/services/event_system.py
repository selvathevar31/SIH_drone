from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.models.mission import Mission
from app.core.config import settings

def generate_events(mission_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Dynamically scan the database telemetry, hotspots, and transitions for a mission
    to construct a timeline of operational and environmental events.
    Returns events sorted newest-first.
    """
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return []
        
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    
    events = []
    
    if not readings:
        # If the mission has just been created but has no readings yet
        events.append({
            "event_id": f"event-{mission_id}-init",
            "timestamp": mission.start_time.isoformat() if mission.start_time else datetime.utcnow().isoformat(),
            "type": "MISSION_STARTED",
            "severity": "INFO",
            "title": "Mission Initiated",
            "message": f"Mission {mission_id} is registered in Ground Station. Waiting for drone link..."
        })
        return events
        
    # 1. MISSION_STARTED
    first_reading = readings[0]
    events.append({
        "event_id": f"event-{mission_id}-start",
        "timestamp": first_reading.timestamp.isoformat(),
        "type": "MISSION_STARTED",
        "severity": "INFO",
        "title": "Mission Started",
        "message": f"Drone link established. Recording flight telemetry for mission {mission_id}."
    })
    
    # 2. MISSION_COMPLETED
    if mission.status == "COMPLETED":
        last_reading = readings[-1]
        events.append({
            "event_id": f"event-{mission_id}-complete",
            "timestamp": last_reading.timestamp.isoformat(),
            "type": "MISSION_COMPLETED",
            "severity": "INFO",
            "title": "Mission Completed",
            "message": f"Drone completed survey of {mission.distance_km:.2f} km. Telemetry download complete."
        })
    elif mission.status == "FAILED":
        last_reading = readings[-1]
        events.append({
            "event_id": f"event-{mission_id}-failed",
            "timestamp": last_reading.timestamp.isoformat(),
            "type": "MISSION_ERROR",
            "severity": "CRITICAL",
            "title": "Mission Aborted / Failed",
            "message": "Drone connection terminated unexpectedly. Safety return-to-home initiated."
        })

    # 3. MISSION_PAUSED / MISSION_RESUMED & GPS_STATUS_CHANGE
    for i in range(1, len(readings)):
        prev = readings[i - 1]
        curr = readings[i]
        
        # Telemetry gaps indicating potential pause/resume
        gap = (curr.timestamp - prev.timestamp).total_seconds()
        if gap > 30.0:
            events.append({
                "event_id": f"event-{mission_id}-pause-{i}",
                "timestamp": prev.timestamp.isoformat(),
                "type": "MISSION_PAUSED",
                "severity": "WARNING",
                "title": "Connection Lost / Mission Paused",
                "message": f"Telemetry link offline. Gap of {gap:.0f} seconds observed."
            })
            events.append({
                "event_id": f"event-{mission_id}-resume-{i}",
                "timestamp": curr.timestamp.isoformat(),
                "type": "MISSION_RESUMED",
                "severity": "INFO",
                "title": "Telemetry Link Restored",
                "message": f"Mission active again. Drone resuming survey flight path."
            })
            
        # GPS Fix transitions
        if prev.gps_status != curr.gps_status and curr.gps_status:
            events.append({
                "event_id": f"event-{mission_id}-gps-{i}",
                "timestamp": curr.timestamp.isoformat(),
                "type": "GPS_STATUS_CHANGE",
                "severity": "WARNING" if "Fix" not in curr.gps_status else "INFO",
                "title": "GPS Status Shifted",
                "message": f"GPS signal transitioned from '{prev.gps_status}' to '{curr.gps_status}' ({curr.satellites or 0} satellites).",
                "latitude": curr.latitude,
                "longitude": curr.longitude
            })

    # 4. HIGH_POLLUTION Detections
    for r in readings:
        if r.aqi is not None and r.aqi > settings.HOTSPOT_MIN_AQI:
            events.append({
                "event_id": f"event-{mission_id}-pollution-{r.id}",
                "timestamp": r.timestamp.isoformat(),
                "type": "HIGH_POLLUTION",
                "severity": "HIGH",
                "title": "Elevated Pollution Level",
                "message": f"AQI reached {r.aqi} ({r.aqi_category or 'Unhealthy'}) near coordinates {r.latitude:.4f}, {r.longitude:.4f}.",
                "latitude": r.latitude,
                "longitude": r.longitude,
                "related_reading_id": r.id
            })

    # 5. HOTSPOT_DETECTED
    for idx, h in enumerate(hotspots):
        events.append({
            "event_id": f"event-{mission_id}-hotspot-{h.id or idx}",
            "timestamp": first_reading.timestamp.isoformat(), # mock to first reading or approximate timestamp
            "type": "HOTSPOT_DETECTED",
            "severity": "CRITICAL" if h.severity == "CRITICAL" else "HIGH",
            "title": f"New Hotspot Identified",
            "message": f"A {h.severity} severity hotspot was successfully clustered near ({h.latitude:.4f}, {h.longitude:.4f}). Peak AQI: {h.peak_aqi}.",
            "latitude": h.latitude,
            "longitude": h.longitude
        })

    # 6. SAMPLING_RECOMMENDED
    from app.services.adaptive_sampling import calculate_adaptive_sampling
    sampling_res = calculate_adaptive_sampling(readings, hotspots)
    recommended_zones = sampling_res.get("recommended_zones", [])
    for idx, zone in enumerate(recommended_zones):
        events.append({
            "event_id": f"event-{mission_id}-sampling-{idx}",
            "timestamp": readings[-1].timestamp.isoformat(), # recommend at the latest time
            "type": "SAMPLING_RECOMMENDED",
            "severity": "INFO",
            "title": "Sampling Recommendation Generated",
            "message": f"Adaptive sampling recommended at ({zone['latitude']:.4f}, {zone['longitude']:.4f}) due to: {zone['reason']}",
            "latitude": zone["latitude"],
            "longitude": zone["longitude"]
        })

    # De-duplicate events to keep timeline readable
    seen_keys = set()
    unique_events = []
    # Sort descending (newest first)
    for ev in sorted(events, key=lambda x: x["timestamp"], reverse=True):
        key = (ev["type"], ev["message"])
        if key not in seen_keys:
            seen_keys.add(key)
            unique_events.append(ev)

    return unique_events
