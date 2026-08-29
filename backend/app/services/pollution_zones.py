import math
import numpy as np
from sklearn.cluster import DBSCAN
from app.schemas.zones import PollutionZone, Coordinates, ZoneMetric, ZonesResponse
from app.schemas.persistent import PersistentHotspot, PersistentHotspotsResponse
from app.services.aqi import get_category_from_aqi

EARTH_RADIUS_METERS = 6371000.0

def _get_severity(aqi: float) -> str:
    if aqi is None:
        return None
    if aqi <= 50: return "GOOD"
    if aqi <= 100: return "MODERATE"
    if aqi <= 200: return "POOR"
    if aqi <= 400: return "VERY_POOR"
    return "SEVERE"

def calculate_pollution_zones(mission_id: str, readings: list, settings) -> ZonesResponse:
    valid_readings = [r for r in readings if r.latitude is not None and r.longitude is not None and r.aqi is not None]
    
    if not valid_readings:
        return ZonesResponse(mission_id=mission_id, zones=[])
        
    coords = np.array([[math.radians(r.latitude), math.radians(r.longitude)] for r in valid_readings])
    eps = settings.ZONE_RADIUS_METERS / EARTH_RADIUS_METERS
    
    db = DBSCAN(eps=eps, min_samples=settings.ZONE_MIN_SAMPLES, algorithm='ball_tree', metric='haversine')
    labels = db.fit_predict(coords)
    
    zones = []
    unique_labels = set(labels)
    
    for label in unique_labels:
        if label == -1:
            continue # Noise
            
        cluster_indices = [i for i, l in enumerate(labels) if l == label]
        cluster_readings = [valid_readings[i] for i in cluster_indices]
        
        # Centroid
        avg_lat = sum(r.latitude for r in cluster_readings) / len(cluster_readings)
        avg_lon = sum(r.longitude for r in cluster_readings) / len(cluster_readings)
        
        # AQI Stats
        aqis = [r.aqi for r in cluster_readings if r.aqi is not None]
        avg_aqi = sum(aqis) / len(aqis)
        min_aqi = min(aqis)
        max_aqi = max(aqis)
        
        # PM2.5 Stats
        pm25s = [r.pm25 for r in cluster_readings if r.pm25 is not None]
        pm25_metric = None
        pm25_exceedance_pct = 0
        if pm25s:
            pm25_metric = ZoneMetric(
                average=sum(pm25s)/len(pm25s), 
                minimum=min(pm25s), 
                maximum=max(pm25s)
            )
            count = sum(1 for v in pm25s if v >= settings.PM25_THRESHOLD)
            pm25_exceedance_pct = (count / len(pm25s)) * 100
            
        # PM10 Stats
        pm10s = [r.pm10 for r in cluster_readings if r.pm10 is not None]
        pm10_metric = None
        pm10_exceedance_pct = 0
        if pm10s:
            pm10_metric = ZoneMetric(
                average=sum(pm10s)/len(pm10s), 
                minimum=min(pm10s), 
                maximum=max(pm10s)
            )
            count = sum(1 for v in pm10s if v >= settings.PM10_THRESHOLD)
            pm10_exceedance_pct = (count / len(pm10s)) * 100
            
        # Dominant Pollutant
        dominant = None
        if pm25s or pm10s:
            if pm25_exceedance_pct > pm10_exceedance_pct:
                dominant = "PM2.5"
            elif pm10_exceedance_pct > pm25_exceedance_pct:
                dominant = "PM10"
            elif pm25_exceedance_pct > 0:
                dominant = "PM2.5"
                
        # Altitude Stats
        altitudes = [r.altitude for r in cluster_readings if hasattr(r, 'altitude') and r.altitude is not None]
        altitude_intel = None
        if altitudes:
            from app.schemas.zones import AltitudeIntelligence
            altitude_intel = AltitudeIntelligence(
                min_meters=min(altitudes),
                max_meters=max(altitudes),
                average_meters=sum(altitudes)/len(altitudes)
            )
            
        # Priority Stats
        from app.services.intelligence import calculate_priority_score, classify_priority, get_recommendation
        from app.schemas.zones import PriorityIntelligence
        priority_score = calculate_priority_score(avg_aqi, 1, avg_aqi, max_aqi)
        priority_class = classify_priority(priority_score)
        priority_intel = PriorityIntelligence(
            score=priority_score,
            classification=priority_class,
            recommendation=get_recommendation(priority_class, "STABLE", False)
        )
                
        zones.append(PollutionZone(
            zone_id=f"ZONE-{len(zones)+1:02d}",
            centroid=Coordinates(latitude=avg_lat, longitude=avg_lon),
            radius_meters=settings.ZONE_RADIUS_METERS,
            measurement_count=len(cluster_readings),
            aqi=ZoneMetric(average=avg_aqi, minimum=min_aqi, maximum=max_aqi),
            pm25=pm25_metric,
            pm10=pm10_metric,
            dominant_pollutant=dominant,
            severity=_get_severity(avg_aqi),
            altitude=altitude_intel,
            priority=priority_intel
        ))
        
    # Rank primary by priority score desc, secondary by avg_aqi desc
    zones.sort(key=lambda z: (z.priority.score if z.priority else 0, z.aqi.average), reverse=True)
    
    # Re-assign IDs based on rank
    for i, z in enumerate(zones):
        z.zone_id = f"ZONE-{i+1:02d}"
        
    return ZonesResponse(mission_id=mission_id, zones=zones)


def calculate_persistent_hotspots(hotspots: list, total_missions_count: int, settings) -> PersistentHotspotsResponse:
    if total_missions_count < 2:
        return PersistentHotspotsResponse(
            persistent_hotspots=[],
            total=0,
            status="INSUFFICIENT_DATA",
            message="At least two surveys are required."
        )
        
    valid_hotspots = [h for h in hotspots if h.latitude is not None and h.longitude is not None]
    
    if not valid_hotspots:
        return PersistentHotspotsResponse(persistent_hotspots=[], total=0)
        
    coords = np.array([[math.radians(h.latitude), math.radians(h.longitude)] for h in valid_hotspots])
    eps = settings.PERSISTENT_HOTSPOT_RADIUS_METERS / EARTH_RADIUS_METERS
    
    # DBSCAN clusters based on spatial distance, min_samples=2 since we need at least 2 surveys
    db = DBSCAN(eps=eps, min_samples=2, algorithm='ball_tree', metric='haversine')
    labels = db.fit_predict(coords)
    
    persistent_list = []
    unique_labels = set(labels)
    
    for label in unique_labels:
        if label == -1:
            continue # Noise
            
        cluster_indices = [i for i, l in enumerate(labels) if l == label]
        cluster_hotspots = [valid_hotspots[i] for i in cluster_indices]
        
        # Persistence check: must be from at least PERSISTENT_HOTSPOT_MIN_SURVEYS distinct missions
        distinct_missions = set(h.mission_id for h in cluster_hotspots)
        if len(distinct_missions) < settings.PERSISTENT_HOTSPOT_MIN_SURVEYS:
            continue
            
        # We found a persistent hotspot
        avg_lat = sum(h.latitude for h in cluster_hotspots) / len(cluster_hotspots)
        avg_lon = sum(h.longitude for h in cluster_hotspots) / len(cluster_hotspots)
        
        aqis = [h.peak_aqi for h in cluster_hotspots if h.peak_aqi is not None]
        avg_aqis = [h.average_aqi for h in cluster_hotspots if h.average_aqi is not None]
        
        pm25s = [h.peak_pm25 for h in cluster_hotspots if h.peak_pm25 is not None]
        avg_pm25s = [h.average_pm25 for h in cluster_hotspots if h.average_pm25 is not None]
        
        pm10s = [h.peak_pm10 for h in cluster_hotspots if h.peak_pm10 is not None]
        avg_pm10s = [h.average_pm10 for h in cluster_hotspots if h.average_pm10 is not None]
        
        timestamps = []
        for h in cluster_hotspots:
            # Assuming hotspot creation or mission creation time, but hotspot model doesn't have timestamp. 
            # We can use mission.created_at. Let's assume hotspots are fetched joined with mission, 
            # or we fetch missions separately. Let's safely extract if available, else just use a placeholder
            if hasattr(h, 'mission') and h.mission and h.mission.created_at:
                timestamps.append(h.mission.created_at)
            
        first_detected = min(timestamps) if timestamps else datetime.utcnow()
        last_detected = max(timestamps) if timestamps else datetime.utcnow()
        
        # Altitude Intelligence
        min_alts = [h.min_altitude for h in cluster_hotspots if hasattr(h, 'min_altitude') and h.min_altitude is not None]
        max_alts = [h.max_altitude for h in cluster_hotspots if hasattr(h, 'max_altitude') and h.max_altitude is not None]
        avg_alts = [h.average_altitude for h in cluster_hotspots if hasattr(h, 'average_altitude') and h.average_altitude is not None]
        
        altitude_intel = None
        if min_alts and max_alts and avg_alts:
            from app.schemas.persistent import AltitudeIntelligence
            altitude_intel = AltitudeIntelligence(
                min_meters=min(min_alts),
                max_meters=max(max_alts),
                average_meters=sum(avg_alts)/len(avg_alts)
            )
            
        # Chronological sorting for trend
        cluster_hotspots.sort(key=lambda x: (x.mission.created_at if hasattr(x, 'mission') and x.mission and x.mission.created_at else datetime.utcnow()))
        historical_aqis = [h.average_aqi for h in cluster_hotspots if h.average_aqi is not None]
        
        from app.services.intelligence import analyze_trend, calculate_priority_score, classify_priority, get_recommendation
        from app.schemas.persistent import TrendIntelligence, PriorityIntelligence
        
        trend_dict = analyze_trend(historical_aqis)
        trend_intel = TrendIntelligence(trend=trend_dict["trend"], percentage=trend_dict["trend_percentage"])
        
        # Priority
        avg_overall_aqi = sum(avg_aqis)/len(avg_aqis) if avg_aqis else 0.0
        peak_overall_aqi = max(aqis) if aqis else 0.0
        
        priority_score = calculate_priority_score(
            aqi=peak_overall_aqi, 
            distinct_surveys=len(distinct_missions), 
            average_aqi=avg_overall_aqi, 
            peak_aqi=peak_overall_aqi
        )
        priority_class = classify_priority(priority_score)
        
        priority_intel = PriorityIntelligence(
            score=priority_score,
            classification=priority_class,
            recommendation=get_recommendation(priority_class, trend_dict["trend"], is_persistent=True)
        )
        
        persistent_list.append(PersistentHotspot(
            hotspot_id=f"PH-{len(persistent_list)+1:03d}",
            latitude=avg_lat,
            longitude=avg_lon,
            surveys_detected=len(distinct_missions),
            first_detected=first_detected,
            last_detected=last_detected,
            average_aqi=avg_overall_aqi,
            peak_aqi=peak_overall_aqi,
            average_pm25=sum(avg_pm25s)/len(avg_pm25s) if avg_pm25s else None,
            peak_pm25=max(pm25s) if pm25s else None,
            average_pm10=sum(avg_pm10s)/len(avg_pm10s) if avg_pm10s else None,
            peak_pm10=max(pm10s) if pm10s else None,
            surveys=list(distinct_missions),
            trend_analysis=trend_intel,
            altitude=altitude_intel,
            priority=priority_intel
        ))
        
    persistent_list.sort(key=lambda p: (p.surveys_detected, p.peak_aqi), reverse=True)
    for i, p in enumerate(persistent_list):
        p.hotspot_id = f"PH-{i+1:03d}"
        
    return PersistentHotspotsResponse(
        persistent_hotspots=persistent_list,
        total=len(persistent_list)
    )
