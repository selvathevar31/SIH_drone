import math
from typing import List, Dict, Any, Optional

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth."""
    R = 6371000.0 # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def is_valid_gps(lat: float, lon: float) -> bool:
    if lat is None or lon is None:
        return False
    if not (-90.0 <= lat <= 90.0):
        return False
    if not (-180.0 <= lon <= 180.0):
        return False
    return True

def calculate_mission_stats(readings: List[Any], hotspots: List[Any] = None) -> Dict[str, Any]:
    total_distance_m = 0.0
    
    speeds = []
    altitudes = []
    valid_points = []
    
    # Pollution tracking
    aqis, pm25s, pm10s, temps, hums = [], [], [], [], []
    highest_pollution = {"val": -1, "loc": None}
    
    # Sort readings by timestamp first
    sorted_readings = sorted(readings, key=lambda x: x.timestamp) if readings else []
    
    for r in sorted_readings:
        if is_valid_gps(r.latitude, r.longitude):
            valid_points.append(r)
            
        if r.speed is not None and r.speed >= 0:
            speeds.append(r.speed)
            
        if r.altitude is not None:
            altitudes.append(r.altitude)
            
        if r.aqi is not None:
            aqis.append(r.aqi)
            if is_valid_gps(r.latitude, r.longitude) and r.aqi > highest_pollution["val"]:
                highest_pollution["val"] = r.aqi
                highest_pollution["loc"] = {
                    "latitude": r.latitude,
                    "longitude": r.longitude,
                    "altitude": r.altitude,
                    "value": r.aqi,
                    "pollutant": "AQI"
                }
                
        if r.pm25 is not None:
            pm25s.append(r.pm25)
        if r.pm10 is not None:
            pm10s.append(r.pm10)
        if r.temperature is not None:
            temps.append(r.temperature)
        if r.humidity is not None:
            hums.append(r.humidity)
            
    for i in range(len(valid_points) - 1):
        lat1, lon1 = valid_points[i].latitude, valid_points[i].longitude
        lat2, lon2 = valid_points[i+1].latitude, valid_points[i+1].longitude
        dist = haversine(lat1, lon1, lat2, lon2)
        total_distance_m += dist
        
    duration_seconds = 0
    if valid_points:
        earliest = valid_points[0].timestamp
        latest = valid_points[-1].timestamp
        duration_seconds = int((latest - earliest).total_seconds())

    avg_pm25_val = sum(pm25s) / len(pm25s) if pm25s else None
    avg_pm10_val = sum(pm10s) / len(pm10s) if pm10s else None

    return {
        "total_distance_km": total_distance_m / 1000.0,
        "average_telemetry_speed_mps": (sum(speeds) / len(speeds)) if speeds else None,
        "average_ground_speed_mps": (total_distance_m / duration_seconds) if duration_seconds > 0 else None,
        "max_speed": max(speeds) if speeds else None,
        "max_altitude": max(altitudes) if altitudes else None,
        "min_altitude": min(altitudes) if altitudes else None,
        "avg_altitude": (sum(altitudes) / len(altitudes)) if altitudes else None,
        "duration_seconds": duration_seconds,
        "total_readings": len(readings),
        "max_aqi": max(aqis) if aqis else None,
        "min_aqi": min(aqis) if aqis else None,
        "avg_aqi": int(round(sum(aqis) / len(aqis))) if aqis else None,
        "max_pm25": max(pm25s) if pm25s else None,
        "min_pm25": min(pm25s) if pm25s else None,
        "avg_pm25": round(avg_pm25_val, 2) if avg_pm25_val else None,
        "max_pm10": max(pm10s) if pm10s else None,
        "min_pm10": min(pm10s) if pm10s else None,
        "avg_pm10": round(avg_pm10_val, 2) if avg_pm10_val else None,
        "max_temperature": max(temps) if temps else None,
        "min_temperature": min(temps) if temps else None,
        "avg_temperature": round(sum(temps) / len(temps), 1) if temps else None,
        "max_humidity": max(hums) if hums else None,
        "min_humidity": min(hums) if hums else None,
        "avg_humidity": round(sum(hums) / len(hums), 1) if hums else None,
        "highest_pollution_location": highest_pollution["loc"],
        "hotspot_count": len(hotspots) if hotspots else 0
    }
