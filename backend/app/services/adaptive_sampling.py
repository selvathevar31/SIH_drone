from typing import List, Dict, Any
from app.models.reading import Reading
from app.models.hotspot import Hotspot

def calculate_adaptive_sampling(readings: List[Reading], hotspots: List[Hotspot]) -> Dict[str, Any]:
    """
    Calculate recommended sampling zones where additional measurements would add value.
    This generates recommendations only and does NOT command flight control.
    """
    if not readings:
        return {
            "recommended_zones": [],
            "reason": "No existing readings available to perform adaptive profiling.",
            "priority": "LOW",
            "confidence": 0.0
        }
        
    valid_readings = [r for r in readings if r.latitude is not None and r.longitude is not None]
    if not valid_readings:
        return {
            "recommended_zones": [],
            "reason": "No readings with valid GPS coordinates found.",
            "priority": "LOW",
            "confidence": 0.0
        }
        
    # Get bounding box
    lats = [r.latitude for r in valid_readings]
    lons = [r.longitude for r in valid_readings]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    # Divide into a 3x3 grid
    lat_step = (max_lat - min_lat) / 3 if max_lat != min_lat else 0.001
    lon_step = (max_lon - min_lon) / 3 if max_lon != min_lon else 0.001
    
    recommended_zones = []
    
    # 1. Recommend based on Hotspots
    # If we have hotspots, recommend collecting more samples around their boundaries to define the shape/gradient
    for idx, h in enumerate(hotspots):
        # Recommend sampling slightly offset from the hotspot center to map the gradient
        recommended_zones.append({
            "latitude": h.latitude + 0.0002, 
            "longitude": h.longitude + 0.0002,
            "radius": h.radius_meters * 1.5,
            "priority": "HIGH" if h.peak_aqi > 150 else "MEDIUM",
            "reason": f"Verify spatial pollution gradient and boundaries of Hotspot #{h.id or idx+1}.",
            "supporting_measurements": h.reading_count
        })
        
    # 2. Recommend based on High Pollution + Low Density Grid Cells
    # Iterate through the grid cells
    for i in range(3):
        for j in range(3):
            cell_min_lat = min_lat + i * lat_step
            cell_max_lat = min_lat + (i + 1) * lat_step
            cell_min_lon = min_lon + j * lon_step
            cell_max_lon = min_lon + (j + 1) * lon_step
            
            cell_readings = [
                r for r in valid_readings 
                if cell_min_lat <= r.latitude <= cell_max_lat and cell_min_lon <= r.longitude <= cell_max_lon
            ]
            
            if not cell_readings:
                continue
                
            cell_aqis = [r.aqi for r in cell_readings if r.aqi is not None]
            if not cell_aqis:
                continue
                
            avg_aqi = sum(cell_aqis) / len(cell_aqis)
            max_aqi = max(cell_aqis)
            min_aqi = min(cell_aqis)
            gradient = max_aqi - min_aqi
            
            # If the cell has high pollution or high gradient but sparse sampling, recommend more
            if (avg_aqi > 100 or gradient > 50) and len(cell_readings) < 30:
                cell_center_lat = (cell_min_lat + cell_max_lat) / 2
                cell_center_lon = (cell_min_lon + cell_max_lon) / 2
                
                recommended_zones.append({
                    "latitude": cell_center_lat,
                    "longitude": cell_center_lon,
                    "radius": 100.0,
                    "priority": "HIGH" if (avg_aqi > 150 or gradient > 30) else "MEDIUM",
                    "reason": f"Increase sampling density due to high local gradient (gradient={gradient:.0f}) and sparse readings ({len(cell_readings)} points).",
                    "supporting_measurements": len(cell_readings)
                })

    # Sort recommended zones so highest priority is first
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recommended_zones.sort(key=lambda x: priority_order.get(x["priority"], 4))
    
    # De-duplicate recommended zones that are extremely close
    unique_zones = []
    for z in recommended_zones:
        is_dup = False
        for uz in unique_zones:
            dist = abs(z["latitude"] - uz["latitude"]) + abs(z["longitude"] - uz["longitude"])
            if dist < 0.0005:  # ~50 meters
                is_dup = True
                break
        if not is_dup:
            unique_zones.append(z)

    # Primary reason for the summary response
    if unique_zones:
        primary_reason = f"Identified {len(unique_zones)} region(s) requiring denser sampling to resolve pollution boundaries and gradients."
        top_priority = unique_zones[0]["priority"]
    else:
        primary_reason = "Sampling density is currently adequate across all surveyed grids."
        top_priority = "LOW"
        
    return {
        "recommended_zones": unique_zones,
        "reason": primary_reason,
        "priority": top_priority,
        "confidence": 0.8 if unique_zones else 0.9
    }
