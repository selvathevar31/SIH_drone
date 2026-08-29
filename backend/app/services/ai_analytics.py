import re
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer, String
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.services.comparison import compare_missions_data
from app.core.config import settings

def detect_intent(question: str) -> str:
    q = question.lower().strip()
    
    # 13. Comparison (check first to avoid matching individual metrics like average aqi)
    if any(k in q for k in ["compare", "comparison", "compared with the previous", "previous survey", "previous mission"]):
        return "mission_comparison"
        
    # 1. Highest PM2.5
    if "pm2.5" in q or "pm25" in q:
        if any(k in q for k in ["highest", "maximum", "max", "worst"]):
            return "highest_pm25"
        elif any(k in q for k in ["average", "avg", "mean"]):
            return "average_pm25"
            
    # 2. Highest PM10
    if "pm10" in q:
        if any(k in q for k in ["highest", "maximum", "max", "worst"]):
            return "highest_pm10"
        elif any(k in q for k in ["average", "avg", "mean"]):
            return "average_pm10"
            
    # 3. Highest AQI / Pollution
    if any(k in q for k in ["aqi", "pollution"]):
        if any(k in q for k in ["highest", "maximum", "max", "worst", "peak"]):
            return "highest_aqi"
        elif any(k in q for k in ["average", "avg", "mean"]):
            return "average_aqi"
            
    # 4. Average PM2.5 (catch-all if not caught by PM2.5 section)
    if ("pm2.5" in q or "pm25" in q) and any(k in q for k in ["average", "avg", "mean"]):
        return "average_pm25"
        
    # 5. Average PM10
    if "pm10" in q and any(k in q for k in ["average", "avg", "mean"]):
        return "average_pm10"
        
    # 6. Average AQI / Pollution
    if any(k in q for k in ["aqi", "pollution"]) and any(k in q for k in ["average", "avg", "mean"]):
        return "average_aqi"

    # 10. Highest Hotspot
    if "hotspot" in q and any(k in q for k in ["highest", "worst", "peak", "max"]):
        return "highest_hotspot"

    # 9. Hotspot count
    if "hotspot" in q:
        if any(k in q for k in ["how many", "number of", "count", "amount", "detected", "identified"]):
            return "hotspot_count"
            
    # 7. Temperature
    if "temp" in q or "temperature" in q:
        return "min_max_temp"
        
    # 8. Humidity
    if "humid" in q or "humidity" in q:
        return "min_max_hum"
        
    # 11. Trend
    if any(k in q for k in ["trend", "increase", "decrease", "change", "worse", "better"]):
        return "pollution_trend"
        
    # 12. Summary
    if any(k in q for k in ["summary", "summarize", "what happened", "overview"]):
        return "mission_summary"
        
    # 14. Altitude
    if any(k in q for k in ["altitude", "height", "vertical"]):
        return "pollution_by_altitude"
        
    # 15. Time Period / Time Analysis
    if any(k in q for k in ["time period", "time analysis", "hour", "morning", "afternoon", "evening", "time of day"]):
        if any(k in q for k in ["worst", "highest", "peak"]):
            return "worst_pollution_period"
        return "pollution_by_time_period"
        
    # 16. Worst Pollution Period
    if any(k in q for k in ["worst time", "worst window", "worst hour", "highest pollution time", "worst period"]):
        return "worst_pollution_period"
        
    # 17. Cleanest surveyed area
    if any(k in q for k in ["cleanest", "lowest", "minimum aqi", "minimum pollution", "min aqi", "min pollution"]):
        return "cleanest_surveyed_area"

    # Fallback to general high/highest/worst queries
    if any(k in q for k in ["highest", "maximum", "max", "worst", "peak"]):
        return "highest_aqi"

    return "unsupported"

def query_ai_intelligence(db: Session, mission_id: str, question: str) -> Dict[str, Any]:
    timestamp_str = datetime.utcnow().isoformat()
    
    # Verify mission exists
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return {
            "query_type": "unsupported",
            "answer": f"Mission '{mission_id}' not found.",
            "confidence": "low",
            "data_source": "N/A",
            "mission_id": mission_id,
            "supporting_values": {},
            "locations": [],
            "timestamp": timestamp_str
        }
        
    # Grounding details
    source_type = "historical CSV file" if mission.data_source == "CSV" else "live telemetry stream" if mission.data_source == "ESP32" else "simulated demo data"
    start_time_str = mission.start_time.strftime("%H:%M:%S") if mission.start_time else "N/A"
    end_time_str = mission.end_time.strftime("%H:%M:%S") if mission.end_time else "N/A"
    
    data_source_grounded = f"FLUXX Mission {mission_id} ({source_type}, {mission.total_readings} points, {start_time_str} - {end_time_str})"
    
    # Helper to check if mission has readings
    readings_count = db.query(func.count(Reading.id)).filter(Reading.mission_id == mission_id).scalar()
    if readings_count == 0:
        return {
            "query_type": "unsupported",
            "answer": "This mission does not have any sensor readings recorded yet.",
            "confidence": "low",
            "data_source": data_source_grounded,
            "mission_id": mission_id,
            "supporting_values": {},
            "locations": [],
            "timestamp": timestamp_str
        }

    intent = detect_intent(question)
    
    if intent == "unsupported":
        return {
            "query_type": "unsupported",
            "answer": "I can currently answer questions about pollution levels, hotspots, mission statistics, trends, altitude and historical comparisons.",
            "confidence": "low",
            "data_source": data_source_grounded,
            "mission_id": mission_id,
            "supporting_values": {},
            "locations": [],
            "timestamp": timestamp_str
        }

    ans = ""
    supporting = {}
    locations = []
    confidence = "high"

    # 1. Highest PM2.5
    if intent == "highest_pm25":
        r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.pm25 != None).order_by(Reading.pm25.desc()).first()
        if r:
            ans = f"The highest PM2.5 concentration was {r.pm25:.1f} µg/m³."
            supporting = {"pm25": r.pm25, "aqi": r.aqi, "latitude": r.latitude, "longitude": r.longitude}
            locations = [{"latitude": r.latitude, "longitude": r.longitude}]
        else:
            ans = "No PM2.5 measurements are available for this mission."
            confidence = "medium"

    # 2. Highest PM10
    elif intent == "highest_pm10":
        r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.pm10 != None).order_by(Reading.pm10.desc()).first()
        if r:
            ans = f"The highest PM10 concentration was {r.pm10:.1f} µg/m³."
            supporting = {"pm10": r.pm10, "aqi": r.aqi, "latitude": r.latitude, "longitude": r.longitude}
            locations = [{"latitude": r.latitude, "longitude": r.longitude}]
        else:
            ans = "No PM10 measurements are available for this mission."
            confidence = "medium"

    # 3. Highest AQI
    elif intent == "highest_aqi":
        r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.aqi != None).order_by(Reading.aqi.desc()).first()
        if r:
            ans = f"The highest AQI was {r.aqi} ({r.aqi_category}) detected near {r.latitude:.5f}, {r.longitude:.5f}."
            supporting = {"aqi": r.aqi, "pm25": r.pm25, "pm10": r.pm10, "latitude": r.latitude, "longitude": r.longitude}
            locations = [{"latitude": r.latitude, "longitude": r.longitude}]
        else:
            ans = "No AQI calculations are available for this mission."
            confidence = "medium"

    # 4. Average PM2.5
    elif intent == "average_pm25":
        val = db.query(func.avg(Reading.pm25)).filter(Reading.mission_id == mission_id, Reading.pm25 != None).scalar()
        if val is not None:
            ans = f"The average PM2.5 concentration was {val:.1f} µg/m³."
            supporting = {"average_pm25": round(val, 2)}
        else:
            ans = "No PM2.5 data available to calculate average."
            confidence = "medium"

    # 5. Average PM10
    elif intent == "average_pm10":
        val = db.query(func.avg(Reading.pm10)).filter(Reading.mission_id == mission_id, Reading.pm10 != None).scalar()
        if val is not None:
            ans = f"The average PM10 concentration was {val:.1f} µg/m³."
            supporting = {"average_pm10": round(val, 2)}
        else:
            ans = "No PM10 data available to calculate average."
            confidence = "medium"

    # 6. Average AQI
    elif intent == "average_aqi":
        val = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == mission_id, Reading.aqi != None).scalar()
        if val is not None:
            ans = f"The average AQI was {val:.1f}."
            supporting = {"average_aqi": round(val, 2)}
        else:
            ans = "No AQI data available to calculate average."
            confidence = "medium"

    # 7. Temp Min/Max
    elif intent == "min_max_temp":
        r = db.query(func.min(Reading.temperature), func.max(Reading.temperature)).filter(Reading.mission_id == mission_id, Reading.temperature != None).first()
        if r and r[0] is not None:
            ans = f"The temperature ranged from {r[0]:.1f}°C to {r[1]:.1f}°C."
            supporting = {"min_temperature": r[0], "max_temperature": r[1]}
        else:
            ans = "No temperature records found for this mission."
            confidence = "medium"

    # 8. Humidity Min/Max
    elif intent == "min_max_hum":
        r = db.query(func.min(Reading.humidity), func.max(Reading.humidity)).filter(Reading.mission_id == mission_id, Reading.humidity != None).first()
        if r and r[0] is not None:
            ans = f"The humidity ranged from {r[0]:.1f}% to {r[1]:.1f}%."
            supporting = {"min_humidity": r[0], "max_humidity": r[1]}
        else:
            ans = "No humidity records found for this mission."
            confidence = "medium"

    # 9. Hotspot Count
    elif intent == "hotspot_count":
        count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar()
        ans = f"There were {count} pollution hotspots identified during this mission."
        supporting = {"hotspot_count": count}

    # 10. Highest Hotspot
    elif intent == "highest_hotspot":
        h = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).order_by(Hotspot.peak_aqi.desc()).first()
        if h:
            ans = f"The highest hotspot had a peak AQI of {h.peak_aqi} (Severity: {h.severity}) located at {h.latitude:.5f}, {h.longitude:.5f}."
            supporting = {"peak_aqi": h.peak_aqi, "average_aqi": h.average_aqi, "latitude": h.latitude, "longitude": h.longitude}
            locations = [{"latitude": h.latitude, "longitude": h.longitude}]
        else:
            ans = "No hotspots detected on this mission."
            confidence = "medium"

    # 11. Pollution Trend
    elif intent == "pollution_trend":
        readings = db.query(Reading.pm25).filter(Reading.mission_id == mission_id, Reading.pm25 != None).order_by(Reading.timestamp.asc()).all()
        pm25_vals = [r[0] for r in readings]
        if len(pm25_vals) >= 10:
            first_chunk = pm25_vals[:max(1, len(pm25_vals)//10)]
            last_chunk = pm25_vals[-max(1, len(pm25_vals)//10):]
            first_avg = sum(first_chunk) / len(first_chunk)
            last_avg = sum(last_chunk) / len(last_chunk)
            if first_avg > 0:
                change_pct = ((last_avg - first_avg) / first_avg) * 100
                direction = "increased" if change_pct >= 0 else "decreased"
                ans = f"PM2.5 {direction} {abs(change_pct):.1f}% during the survey (from an initial avg of {first_avg:.1f} µg/m³ to a final avg of {last_avg:.1f} µg/m³)."
                supporting = {"initial_pm25": round(first_avg, 2), "final_pm25": round(last_avg, 2), "change_percentage": round(change_pct, 2)}
            else:
                ans = "Pollution values were stable at zero during the mission."
        else:
            ans = "Insufficient telemetry timeline to determine chronological trend."
            confidence = "medium"

    # 12. Mission Summary
    elif intent == "mission_summary":
        avg_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == mission_id, Reading.aqi != None).scalar()
        h_count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar()
        avg_aqi_val = avg_aqi if avg_aqi is not None else 0.0
        
        ans = f"Mission {mission_id} ({mission.status}) captured {mission.total_readings} points over {mission.distance_km:.2f} km. Average AQI was {avg_aqi_val:.1f} with {h_count} hotspots detected."
        supporting = {"total_readings": mission.total_readings, "distance_km": mission.distance_km, "average_aqi": round(avg_aqi_val, 2), "hotspot_count": h_count}

    # 13. Mission Comparison
    elif intent == "mission_comparison":
        # Find the previous mission chronologically
        prev_m = db.query(Mission).filter(Mission.created_at < mission.created_at).order_by(Mission.created_at.desc()).first()
        if prev_m:
            c_readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
            p_readings = db.query(Reading).filter(Reading.mission_id == prev_m.mission_id).all()
            c_hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
            p_hotspots = db.query(Hotspot).filter(Hotspot.mission_id == prev_m.mission_id).all()
            
            comp = compare_missions_data(mission, prev_m, c_readings, p_readings, c_hotspots, p_hotspots, settings)
            dir_verb = "increased" if comp.summary.overall_direction == "WORSENED" else "decreased" if comp.summary.overall_direction == "IMPROVED" else "remained stable"
            
            change_pct = comp.summary.aqi_change_percent or 0.0
            ans = f"Compared to the previous survey ({prev_m.mission_id}), pollution overall {dir_verb} (AQI changed by {change_pct:.1f}%). Current average AQI is {comp.overall.aqi.current_average:.1f} vs previous {comp.overall.aqi.previous_average:.1f}."
            supporting = {
                "previous_mission_id": prev_m.mission_id,
                "current_average_aqi": comp.overall.aqi.current_average,
                "previous_average_aqi": comp.overall.aqi.previous_average,
                "aqi_change_percentage": change_pct
            }
        else:
            ans = "This is the first recorded mission. No previous mission is available for historical comparison."
            confidence = "medium"

    # 14. Pollution Concentration by Altitude
    elif intent == "pollution_by_altitude":
        # Bucket by 10m intervals
        bucket_expr = cast(Reading.altitude / 10, Integer) * 10
        bucket_data = db.query(
            bucket_expr.label('bucket'),
            func.avg(Reading.pm25).label('avg_pm25'),
            func.avg(Reading.aqi).label('avg_aqi'),
            func.count(Reading.id).label('count')
        ).filter(Reading.mission_id == mission_id, Reading.altitude != None)\
         .group_by('bucket').all()
         
        if bucket_data:
            worst_bucket = max(bucket_data, key=lambda x: x.avg_pm25 or 0)
            ans = f"The highest PM2.5 concentration occurred between {worst_bucket.bucket}m and {worst_bucket.bucket + 10}m with an average PM2.5 of {worst_bucket.avg_pm25:.1f} µg/m³."
            supporting = {
                "worst_altitude_min": worst_bucket.bucket,
                "worst_altitude_max": worst_bucket.bucket + 10,
                "average_pm25": round(worst_bucket.avg_pm25, 2),
                "average_aqi": round(worst_bucket.avg_aqi or 0, 1),
                "samples_at_altitude": worst_bucket.count
            }
        else:
            ans = "No altitude readings found to calculate vertical pollution profile."
            confidence = "medium"

    # 15. Pollution Concentration by Time Period
    elif intent == "pollution_by_time_period":
        # Let's divide the mission readings chronologically into 4 quarters
        readings = db.query(Reading.timestamp, Reading.aqi).filter(Reading.mission_id == mission_id, Reading.aqi != None).order_by(Reading.timestamp.asc()).all()
        if len(readings) >= 4:
            chunk_size = len(readings) // 4
            quarters = []
            for i in range(4):
                chunk = readings[i*chunk_size : (i+1)*chunk_size]
                avg_aqi = sum(r[1] for r in chunk) / len(chunk)
                start_t = chunk[0][0].strftime("%H:%M:%S")
                end_t = chunk[-1][0].strftime("%H:%M:%S")
                quarters.append({"period": f"Period {i+1} ({start_t} - {end_t})", "avg_aqi": avg_aqi})
                
            worst = max(quarters, key=lambda x: x["avg_aqi"])
            ans = f"Analysis shows {worst['period']} was the most polluted phase, averaging an AQI of {worst['avg_aqi']:.1f}."
            supporting = {"periods": quarters, "worst_period": worst["period"], "worst_period_aqi": round(worst["avg_aqi"], 2)}
        else:
            ans = "Insufficient time duration for sub-period temporal analysis."
            confidence = "medium"

    # 16. Worst Pollution Period
    elif intent == "worst_pollution_period":
        # Group by 5-minute sliding or tumbling windows
        # Let's tumble group by 5-min intervals in python for safety and speed
        readings = db.query(Reading.timestamp, Reading.aqi, Reading.pm25).filter(Reading.mission_id == mission_id, Reading.aqi != None).order_by(Reading.timestamp.asc()).all()
        if len(readings) >= 10:
            windows = {}
            for r in readings:
                # 5 minute bucket key
                minute_bucket = (r[0].minute // 5) * 5
                bucket_key = r[0].replace(minute=minute_bucket, second=0, microsecond=0)
                if bucket_key not in windows:
                    windows[bucket_key] = {"aqi_sum": 0, "count": 0, "pm25_sum": 0}
                windows[bucket_key]["aqi_sum"] += r[1]
                windows[bucket_key]["pm25_sum"] += r[2] or 0
                windows[bucket_key]["count"] += 1
                
            averages = []
            for k, v in windows.items():
                averages.append({
                    "time": k.strftime("%H:%M"),
                    "avg_aqi": v["aqi_sum"] / v["count"],
                    "avg_pm25": v["pm25_sum"] / v["count"],
                    "count": v["count"]
                })
                
            worst_w = max(averages, key=lambda x: x["avg_aqi"])
            ans = f"The worst 5-minute window occurred at {worst_w['time']} with an average AQI of {worst_w['avg_aqi']:.1f}."
            supporting = {"worst_window_time": worst_w["time"], "worst_window_aqi": round(worst_w["avg_aqi"], 2), "worst_window_pm25": round(worst_w["avg_pm25"], 2)}
        else:
            ans = "Timeline is too short to calculate a reliable 5-minute pollution window."
            confidence = "medium"

    # 17. Cleanest Surveyed Area
    elif intent == "cleanest_surveyed_area":
        r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.aqi != None).order_by(Reading.aqi.asc()).first()
        if r:
            ans = f"The cleanest surveyed area was detected at {r.latitude:.5f}, {r.longitude:.5f} with an AQI of {r.aqi} ({r.aqi_category})."
            supporting = {"aqi": r.aqi, "pm25": r.pm25, "pm10": r.pm10, "latitude": r.latitude, "longitude": r.longitude}
            locations = [{"latitude": r.latitude, "longitude": r.longitude}]
        else:
            ans = "No readings found to calculate cleanest surveyed area."
            confidence = "medium"

    return {
        "query_type": intent,
        "answer": ans,
        "confidence": confidence,
        "data_source": data_source_grounded,
        "mission_id": mission_id,
        "supporting_values": supporting,
        "locations": locations,
        "timestamp": timestamp_str
    }

def get_mission_insights(db: Session, mission_id: str) -> List[Dict[str, Any]]:
    # 1. Pollution Trend
    trend_insight = "No PM2.5 timeline data to analyze trend."
    readings = db.query(Reading.pm25).filter(Reading.mission_id == mission_id, Reading.pm25 != None).order_by(Reading.timestamp.asc()).all()
    pm25_vals = [r[0] for r in readings]
    if len(pm25_vals) >= 10:
        first_chunk = pm25_vals[:max(1, len(pm25_vals)//10)]
        last_chunk = pm25_vals[-max(1, len(pm25_vals)//10):]
        first_avg = sum(first_chunk) / len(first_chunk)
        last_avg = sum(last_chunk) / len(last_chunk)
        if first_avg > 0:
            change_pct = ((last_avg - first_avg) / first_avg) * 100
            dir_str = "increased" if change_pct >= 0 else "decreased"
            trend_insight = f"PM2.5 {dir_str} {abs(change_pct):.1f}% during the survey."
        else:
            trend_insight = "PM2.5 concentration remained stable at 0."
            
    # 2. Highest Concentration
    max_r = db.query(Reading).filter(Reading.mission_id == mission_id, Reading.pm25 != None).order_by(Reading.pm25.desc()).first()
    if max_r:
        highest_insight = f"{max_r.pm25:.1f} µg/m³ detected near {max_r.latitude:.5f}, {max_r.longitude:.5f}."
    else:
        highest_insight = "No PM2.5 peak detected."
        
    # 3. Hotspots
    h_count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar()
    hotspot_insight = f"{h_count} pollution hotspots identified."
    
    # 4. Altitude
    bucket_expr = cast(Reading.altitude / 10, Integer) * 10
    bucket_data = db.query(
        bucket_expr.label('bucket'),
        func.avg(Reading.pm25).label('avg_pm25')
    ).filter(Reading.mission_id == mission_id, Reading.altitude != None)\
     .group_by('bucket').all()
    if bucket_data:
        worst_bucket = max(bucket_data, key=lambda x: x.avg_pm25 or 0)
        altitude_insight = f"Highest PM2.5 concentration occurred between {worst_bucket.bucket}–{worst_bucket.bucket + 10} m."
    else:
        altitude_insight = "No altitude data available to determine vertical concentration."
        
    return [
        {"title": "Pollution Trend", "description": trend_insight},
        {"title": "Highest Concentration", "description": highest_insight},
        {"title": "Hotspots", "description": hotspot_insight},
        {"title": "Altitude", "description": altitude_insight}
    ]
