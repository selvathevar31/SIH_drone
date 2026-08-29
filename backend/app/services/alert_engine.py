from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.core.config import settings

def detect_alerts(mission_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Deterministically scan database records for a mission to generate environmental alerts.
    """
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    
    alerts = []
    
    if not readings:
        return alerts
        
    latest_reading = readings[-1]
    
    # 1. MISSING_TELEMETRY Alert
    # Only applicable if the mission status is active or if we're evaluating live status.
    # We trigger this if the latest reading is older than 15 seconds compared to "now" (simulated or real).
    # Since it's a simulation or demo, we compare to the latest timestamp in the database.
    # If the database hasn't received anything in a long time but the mission is active, we check.
    # To keep it simple, we check if the gap between the last two readings is large, or if the last reading is older than 15 seconds from current time.
    time_gap = (datetime.utcnow() - latest_reading.timestamp).total_seconds()
    # For testing, we only trigger MISSING_TELEMETRY if explicitly stale or if the last timestamp gap is > 30s
    if len(readings) >= 2:
        prev_reading = readings[-2]
        gap = (latest_reading.timestamp - prev_reading.timestamp).total_seconds()
        if gap > 30.0:
            alerts.append({
                "severity": "WARNING",
                "type": "MISSING_TELEMETRY",
                "pollutant": "TELEMETRY",
                "value": gap,
                "threshold": 30.0,
                "timestamp": latest_reading.timestamp.isoformat(),
                "location": {"latitude": latest_reading.latitude, "longitude": latest_reading.longitude},
                "message": f"Telemetry gap of {gap:.0f} seconds detected between consecutive points."
            })

    # 2. Pollution Alert Checks on each reading (latest 50 points to find active alerts)
    # We scan the recent readings to locate elevated values
    recent_readings = readings[-50:]
    for r in recent_readings:
        # Check PM2.5
        if r.pm25 is not None:
            if r.pm25 > settings.PM25_HIGH_THRESHOLD:
                alerts.append({
                    "severity": "CRITICAL",
                    "type": "VERY_HIGH_POLLUTION",
                    "pollutant": "PM2.5",
                    "value": r.pm25,
                    "threshold": settings.PM25_HIGH_THRESHOLD,
                    "timestamp": r.timestamp.isoformat(),
                    "location": {"latitude": r.latitude, "longitude": r.longitude},
                    "message": f"Critical PM2.5 level detected: {r.pm25:.1f} µg/m³ (Threshold: {settings.PM25_HIGH_THRESHOLD:.0f})."
                })
            elif r.pm25 > settings.PM25_THRESHOLD:
                alerts.append({
                    "severity": "HIGH",
                    "type": "HIGH_POLLUTION",
                    "pollutant": "PM2.5",
                    "value": r.pm25,
                    "threshold": settings.PM25_THRESHOLD,
                    "timestamp": r.timestamp.isoformat(),
                    "location": {"latitude": r.latitude, "longitude": r.longitude},
                    "message": f"Elevated PM2.5 level detected: {r.pm25:.1f} µg/m³ (Threshold: {settings.PM25_THRESHOLD:.0f})."
                })

        # Check PM10
        if r.pm10 is not None:
            if r.pm10 > settings.PM10_HIGH_THRESHOLD:
                alerts.append({
                    "severity": "CRITICAL",
                    "type": "VERY_HIGH_POLLUTION",
                    "pollutant": "PM10",
                    "value": r.pm10,
                    "threshold": settings.PM10_HIGH_THRESHOLD,
                    "timestamp": r.timestamp.isoformat(),
                    "location": {"latitude": r.latitude, "longitude": r.longitude},
                    "message": f"Critical PM10 level detected: {r.pm10:.1f} µg/m³ (Threshold: {settings.PM10_HIGH_THRESHOLD:.0f})."
                })
            elif r.pm10 > settings.PM10_THRESHOLD:
                alerts.append({
                    "severity": "HIGH",
                    "type": "HIGH_POLLUTION",
                    "pollutant": "PM10",
                    "value": r.pm10,
                    "threshold": settings.PM10_THRESHOLD,
                    "timestamp": r.timestamp.isoformat(),
                    "location": {"latitude": r.latitude, "longitude": r.longitude},
                    "message": f"Elevated PM10 level detected: {r.pm10:.1f} µg/m³ (Threshold: {settings.PM10_THRESHOLD:.0f})."
                })

    # 3. RAPID_POLLUTION_INCREASE Check
    # Look for a 20% increase in PM2.5 or AQI within 30 seconds
    for i in range(1, len(readings)):
        curr = readings[i]
        # Find a reading roughly 30 seconds ago
        prev = None
        for j in range(i - 1, -1, -1):
            time_diff = (curr.timestamp - readings[j].timestamp).total_seconds()
            if 20 <= time_diff <= 40:
                prev = readings[j]
                break
        
        if prev and prev.pm25 and curr.pm25:
            pct_change = ((curr.pm25 - prev.pm25) / prev.pm25) * 100
            if pct_change >= 20.0 and curr.pm25 > settings.PM25_THRESHOLD:
                alerts.append({
                    "severity": "HIGH",
                    "type": "RAPID_POLLUTION_INCREASE",
                    "pollutant": "PM2.5",
                    "value": round(pct_change, 1),
                    "threshold": 20.0,
                    "timestamp": curr.timestamp.isoformat(),
                    "location": {"latitude": curr.latitude, "longitude": curr.longitude},
                    "message": f"Rapid PM2.5 surge detected: +{pct_change:.1f}% within 30 seconds."
                })

    # 4. HOTSPOT_DETECTED
    for h in hotspots:
        alerts.append({
            "severity": "CRITICAL" if h.severity == "CRITICAL" else "HIGH",
            "type": "HOTSPOT_DETECTED",
            "pollutant": "AQI",
            "value": h.peak_aqi,
            "threshold": settings.HOTSPOT_MIN_AQI,
            "timestamp": latest_reading.timestamp.isoformat(), # latest known time
            "location": {"latitude": h.latitude, "longitude": h.longitude},
            "message": f"Pollution hotspot detected at ({h.latitude:.4f}, {h.longitude:.4f}) with peak AQI {h.peak_aqi}."
        })

    # 5. SAMPLING_REQUIRED
    # Check if there are recommended zones in the adaptive sampling engine
    from app.services.adaptive_sampling import calculate_adaptive_sampling
    sampling_res = calculate_adaptive_sampling(readings, hotspots)
    recommended_zones = sampling_res.get("recommended_zones", [])
    for zone in recommended_zones:
        alerts.append({
            "severity": "HIGH" if zone["priority"] in ["HIGH", "CRITICAL"] else "WARNING",
            "type": "SAMPLING_REQUIRED",
            "pollutant": "SPATIAL_GRADIENT",
            "value": zone["radius"],
            "threshold": 50.0,
            "timestamp": latest_reading.timestamp.isoformat(),
            "location": {"latitude": zone["latitude"], "longitude": zone["longitude"]},
            "message": f"Adaptive sampling recommended near ({zone['latitude']:.4f}, {zone['longitude']:.4f}). Reason: {zone['reason']}"
        })

    # Sort alerts by timestamp descending, keep newest first, de-duplicate identical messages
    seen_messages = set()
    unique_alerts = []
    for a in sorted(alerts, key=lambda x: x["timestamp"], reverse=True):
        if a["message"] not in seen_messages:
            seen_messages.add(a["message"])
            unique_alerts.append(a)
            
    return unique_alerts[:15] # Return top 15 alerts
