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

def calculate_mission_stats(readings: List[Any]) -> Dict[str, Any]:
    total_distance_m = 0.0
    
    speeds = []
    altitudes = []
    valid_points = []
    
    # Sort readings by timestamp first
    sorted_readings = sorted(readings, key=lambda x: x.timestamp) if readings else []
    
    for r in sorted_readings:
        if is_valid_gps(r.latitude, r.longitude):
            valid_points.append(r)
            
        if r.speed is not None and r.speed >= 0:
            speeds.append(r.speed)
            
        if r.altitude is not None:
            altitudes.append(r.altitude)
            
    for i in range(len(valid_points) - 1):
        lat1, lon1 = valid_points[i].latitude, valid_points[i].longitude
        lat2, lon2 = valid_points[i+1].latitude, valid_points[i+1].longitude
        
        # Calculate distance for consecutive valid points
        dist = haversine(lat1, lon1, lat2, lon2)
        
        # Optional check for extreme jumps could be added here,
        # but conservative logic means we accept valid coordinate jumps.
        total_distance_m += dist
        
    duration_seconds = 0
    if valid_points:
        earliest = valid_points[0].timestamp
        latest = valid_points[-1].timestamp
        duration_seconds = int((latest - earliest).total_seconds())

    average_telemetry_speed = (sum(speeds) / len(speeds)) if speeds else None
    
    average_ground_speed = None
    if duration_seconds and duration_seconds > 0:
        average_ground_speed = total_distance_m / duration_seconds
        
    max_speed = max(speeds) if speeds else None
    max_altitude = max(altitudes) if altitudes else None
    
    return {
        "total_distance_km": total_distance_m / 1000.0,
        "average_telemetry_speed_mps": average_telemetry_speed,
        "average_ground_speed_mps": average_ground_speed,
        "max_speed": max_speed,
        "max_altitude": max_altitude,
        "duration_seconds": duration_seconds,
        "total_readings": len(readings)
    }
