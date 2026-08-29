import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Dict, Any
from app.core.config import settings

def detect_hotspots_for_readings(readings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detects spatial pollution hotspots using DBSCAN.
    
    Disclaimer: This identifies spatial clusters of elevated AQI, not necessarily 
    the exact physical source of the pollution.
    """
    if not readings:
        return []
        
    df = pd.DataFrame(readings)
    
    # Filter for valid AQI above threshold
    df_high = df[(df['aqi'].notnull()) & (df['aqi'] >= settings.HOTSPOT_MIN_AQI)].copy()
    
    if len(df_high) < settings.HOTSPOT_MIN_SAMPLES:
        return []

    # Prepare coordinates in radians for Haversine distance
    coords = np.radians(df_high[['latitude', 'longitude']].values)
    
    # eps is radius in radians (earth radius ~ 6371000 meters)
    eps_rad = settings.HOTSPOT_RADIUS_METERS / 6371000.0
    
    db = DBSCAN(eps=eps_rad, min_samples=settings.HOTSPOT_MIN_SAMPLES, algorithm='ball_tree', metric='haversine')
    df_high.loc[:, 'cluster'] = db.fit_predict(coords)
    
    # Exclude noise points (-1)
    clusters = df_high[df_high['cluster'] != -1]
    
    hotspots = []
    
    for cluster_id, group in clusters.groupby('cluster'):
        center_lat = group['latitude'].mean()
        center_lng = group['longitude'].mean()
        
        avg_aqi = group['aqi'].mean()
        peak_aqi = int(group['aqi'].max())
        
        avg_pm25 = group['pm25'].mean()
        peak_pm25 = group['pm25'].max()
        
        avg_pm10 = group['pm10'].mean()
        peak_pm10 = group['pm10'].max()
        
        count = len(group)
        
        from app.services.aqi import get_category_from_aqi
        severity = get_category_from_aqi(peak_aqi)
        
        # Altitude Intelligence
        min_altitude = None
        max_altitude = None
        avg_altitude = None
        if 'altitude' in group.columns:
            valid_altitudes = group['altitude'].dropna()
            if not valid_altitudes.empty:
                min_altitude = float(valid_altitudes.min())
                max_altitude = float(valid_altitudes.max())
                avg_altitude = float(valid_altitudes.mean())
        
        hotspots.append({
            "latitude": float(center_lat),
            "longitude": float(center_lng),
            "radius_meters": settings.HOTSPOT_RADIUS_METERS,
            "average_aqi": float(avg_aqi),
            "peak_aqi": peak_aqi,
            "average_pm25": float(avg_pm25),
            "peak_pm25": float(peak_pm25),
            "average_pm10": float(avg_pm10),
            "peak_pm10": float(peak_pm10),
            "severity": severity,
            "reading_count": count,
            "min_altitude": min_altitude,
            "max_altitude": max_altitude,
            "average_altitude": avg_altitude
        })
        
    return hotspots
