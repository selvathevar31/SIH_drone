import numpy as np
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.models.mission import Mission
from app.core.config import settings

def analyze_pollution_level(readings: List[Reading]) -> Dict[str, Any]:
    if not readings:
        return {"facts": [], "inferences": [], "risk_level": "LOW", "confidence": 0.0}
        
    aqis = [r.aqi for r in readings if r.aqi is not None]
    if not aqis:
        return {"facts": [], "inferences": [], "risk_level": "LOW", "confidence": 0.0}
        
    max_aqi = max(aqis)
    avg_aqi = sum(aqis) / len(aqis)
    
    # Classify overall risk level
    if max_aqi > 200:
        risk_level = "CRITICAL"
    elif max_aqi > 100:
        risk_level = "HIGH"
    elif max_aqi > 50:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
        
    facts = [
        f"Maximum AQI recorded during this mission was {max_aqi}.",
        f"Average AQI for the surveyed area was {avg_aqi:.1f}."
    ]
    
    inferences = []
    if max_aqi > 100:
        inferences.append("Measurements indicate a localized high-pollution zone.")
    else:
        inferences.append("Overall air quality remains within safe limits.")
        
    return {
        "facts": facts,
        "inferences": inferences,
        "risk_level": risk_level,
        "confidence": 0.9 if len(readings) >= 10 else 0.5
    }

def analyze_pollution_trend(readings: List[Reading]) -> Dict[str, Any]:
    # Sort readings by timestamp
    sorted_readings = sorted([r for r in readings if r.timestamp is not None and r.aqi is not None], key=lambda x: x.timestamp)
    
    if len(sorted_readings) < 10:
        return {
            "pollutant": "aqi",
            "trend": "insufficient_data",
            "change_percent": 0.0,
            "sample_count": len(sorted_readings)
        }
        
    # Split into first 1/3 and last 1/3 to find trends
    n = len(sorted_readings)
    first_third = sorted_readings[:n//3]
    last_third = sorted_readings[-n//3:]
    
    avg_first = sum(r.aqi for r in first_third) / len(first_third)
    avg_last = sum(r.aqi for r in last_third) / len(last_third)
    
    if avg_first == 0:
        change_pct = 0.0
    else:
        change_pct = ((avg_last - avg_first) / avg_first) * 100
        
    # Threshold for trend: 10% change
    if change_pct > 10.0:
        trend = "increasing"
    elif change_pct < -10.0:
        trend = "decreasing"
    else:
        trend = "stable"
        
    return {
        "pollutant": "aqi",
        "trend": trend,
        "change_percent": round(change_pct, 1),
        "sample_count": n
    }

def analyze_spatial_concentration(readings: List[Reading]) -> Dict[str, Any]:
    if not readings:
        return {"high_concentration_zones": [], "low_concentration_zones": []}
        
    valid_readings = [r for r in readings if r.latitude is not None and r.longitude is not None and r.aqi is not None]
    if not valid_readings:
        return {"high_concentration_zones": [], "low_concentration_zones": []}
        
    # Find highest and lowest AQI areas
    sorted_by_aqi = sorted(valid_readings, key=lambda x: x.aqi, reverse=True)
    
    high_zones = []
    low_zones = []
    
    # Take top 3 as high concentration coordinates
    for r in sorted_by_aqi[:3]:
        if r.aqi > 100:
            high_zones.append({"latitude": r.latitude, "longitude": r.longitude, "aqi": r.aqi})
            
    # Take bottom 3 as low concentration coordinates
    for r in sorted_by_aqi[-3:]:
        low_zones.append({"latitude": r.latitude, "longitude": r.longitude, "aqi": r.aqi})
        
    return {
        "high_concentration_zones": high_zones,
        "low_concentration_zones": low_zones,
        "spatial_gradient": sorted_by_aqi[0].aqi - sorted_by_aqi[-1].aqi if sorted_by_aqi else 0
    }

def analyze_altitude_behavior(readings: List[Reading]) -> Dict[str, Any]:
    valid_readings = [r for r in readings if r.altitude is not None and r.aqi is not None]
    if not valid_readings:
        return {"altitude_trend": "insufficient_evidence", "bands": []}
        
    # Standard bands: 0-20, 20-40, 40-60, 60-80, 80-100
    bands_config = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 100)]
    bands_data = []
    
    for low, high in bands_config:
        band_readings = [r for r in valid_readings if low <= r.altitude < high]
        if not band_readings:
            continue
        avg_aqi = sum(r.aqi for r in band_readings) / len(band_readings)
        avg_pm25 = sum(r.pm25 for r in band_readings if r.pm25 is not None) / max(len([r for r in band_readings if r.pm25 is not None]), 1)
        avg_pm10 = sum(r.pm10 for r in band_readings if r.pm10 is not None) / max(len([r for r in band_readings if r.pm10 is not None]), 1)
        
        bands_data.append({
            "range": f"{low}-{high}m",
            "average_aqi": round(avg_aqi, 1),
            "average_pm25": round(avg_pm25, 1),
            "average_pm10": round(avg_pm10, 1),
            "observations": len(band_readings)
        })
        
    if len(bands_data) < 2:
        return {"altitude_trend": "insufficient_evidence", "bands": bands_data}
        
    # Analyze trend with altitude
    # Sort bands by height range
    sorted_bands = sorted(bands_data, key=lambda x: int(x["range"].split("-")[0]))
    aqis = [b["average_aqi"] for b in sorted_bands]
    
    # simple linear regression slope sign
    x = np.arange(len(aqis))
    slope = np.polyfit(x, aqis, 1)[0] if len(aqis) > 1 else 0
    
    if slope > 5.0:
        altitude_trend = "increases_with_altitude"
    elif slope < -5.0:
        altitude_trend = "decreases_with_altitude"
    else:
        altitude_trend = "remains_stable"
        
    return {
        "altitude_trend": altitude_trend,
        "bands": sorted_bands
    }

def analyze_hotspots(hotspots: List[Hotspot]) -> List[Dict[str, Any]]:
    analyzed = []
    for h in hotspots:
        # Classify severity
        if h.peak_aqi > 200:
            severity_class = "CRITICAL"
        elif h.peak_aqi > 100:
            severity_class = "HIGH"
        elif h.peak_aqi > 50:
            severity_class = "MODERATE"
        else:
            severity_class = "LOW"
            
        analyzed.append({
            "id": h.id,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "radius_meters": h.radius_meters,
            "average_aqi": h.average_aqi,
            "peak_aqi": h.peak_aqi,
            "severity": severity_class,
            "confidence": 0.85
        })
    return analyzed

def analyze_sampling_coverage(readings: List[Reading]) -> Dict[str, Any]:
    if len(readings) < 10:
        return {"coverage_status": "insufficient_data", "gaps_detected": False}
        
    # Find bounding box
    lats = [r.latitude for r in readings if r.latitude is not None]
    lons = [r.longitude for r in readings if r.longitude is not None]
    
    if not lats or not lons:
        return {"coverage_status": "insufficient_data", "gaps_detected": False}
        
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    lat_span = max_lat - min_lat
    lon_span = max_lon - min_lon
    
    # If the span is very small, we assume limited spatial spread
    if lat_span < 0.0001 and lon_span < 0.0001:
        return {"coverage_status": "highly_localized", "gaps_detected": True}
        
    return {"coverage_status": "adequate", "gaps_detected": False}

def generate_pollution_summary(mission_id: str, db: Session) -> Dict[str, Any]:
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).all()
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    
    level_analysis = analyze_pollution_level(readings)
    trend_analysis = analyze_pollution_trend(readings)
    spatial_analysis = analyze_spatial_concentration(readings)
    altitude_analysis = analyze_altitude_behavior(readings)
    hotspots_analysis = analyze_hotspots(hotspots)
    coverage_analysis = analyze_sampling_coverage(readings)
    
    # Adaptive sampling recommendations logic
    # Will be populated properly by adaptive_sampling service
    from app.services.adaptive_sampling import calculate_adaptive_sampling
    adaptive_recommendations = calculate_adaptive_sampling(readings, hotspots)
    
    # Collect facts, inferences, recommendations
    facts = list(level_analysis["facts"])
    inferences = list(level_analysis["inferences"])
    recommendations = []
    
    # Add wind / plume direction
    # Try to find wind/plume details. 
    # Check if there is wind speed and wind direction (which aren't in standard DB but let's implement checks)
    plume_analysis = {"wind_direction": None, "estimated_plume_direction": None, "confidence": 0.0, "status": "Plume direction unavailable: wind telemetry is missing."}
    
    # Compile trends
    if trend_analysis["trend"] == "increasing":
        inferences.append(f"Pollution values show an upward trend ({trend_analysis['change_percent']}% change).")
        recommendations.append("Increase monitoring frequency or extend mission duration to observe if the pollution trend continues upward.")
    elif trend_analysis["trend"] == "decreasing":
        inferences.append(f"Pollution values show a downward trend ({trend_analysis['change_percent']}% change).")
    
    # Compile altitude
    if altitude_analysis["altitude_trend"] == "increases_with_altitude":
        inferences.append("Pollution concentration increases at higher altitude bands.")
        recommendations.append("Perform vertical profiling to locate the inversion boundary.")
        
    # Compile hotspots
    critical_hotspots = [h for h in hotspots_analysis if h["severity"] == "CRITICAL"]
    if critical_hotspots:
        inferences.append(f"Detected {len(critical_hotspots)} critical hotspots with severe AQI (>200).")
        recommendations.append(f"Investigate the critical hotspot zone near {critical_hotspots[0]['latitude']:.5f}, {critical_hotspots[0]['longitude']:.5f} first.")
        
    # Merge adaptive sampling recommendations
    for zone in adaptive_recommendations.get("recommended_zones", []):
        recommendations.append(f"Increase sampling density near ({zone['latitude']:.5f}, {zone['longitude']:.5f}) - Priority: {zone['priority']}. Reason: {zone['reason']}")

    return {
        "mission_id": mission_id,
        "summary": {
            "risk_level": level_analysis["risk_level"],
            "overall_trend": trend_analysis["trend"],
            "hotspot_count": len(hotspots)
        },
        "facts": facts,
        "inferences": inferences,
        "recommendations": recommendations,
        "hotspots": hotspots_analysis,
        "altitude_analysis": altitude_analysis,
        "spatial_analysis": spatial_analysis,
        "adaptive_sampling": adaptive_recommendations,
        "plume_analysis": plume_analysis,
        "confidence": level_analysis["confidence"],
        "data_source": "FLUXX mission database"
    }
