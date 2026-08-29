import numpy as np
from sklearn.neighbors import BallTree
import math
from app.schemas.comparison import (
    ComparisonMetric, PeakComparisonMetric, OverallComparison,
    HotspotComparison, SpatialComparisonPoint, MetricChange,
    MatchingStats, ComparisonSummary, MissionComparisonResponse
)
from app.schemas.mission import MissionResponse

def _calc_change(current, previous):
    if current is None or previous is None:
        return None, None
    absolute = current - previous
    percentage = (absolute / previous * 100) if previous != 0 else None
    return absolute, percentage

def _make_metric(c_avg, p_avg):
    abs_c, pct_c = _calc_change(c_avg, p_avg)
    return ComparisonMetric(
        current_average=c_avg,
        previous_average=p_avg,
        absolute_change=abs_c,
        percentage_change=pct_c
    )

def _make_peak(c_peak, p_peak):
    abs_c, pct_c = _calc_change(c_peak, p_peak)
    return PeakComparisonMetric(
        current_peak=c_peak,
        previous_peak=p_peak,
        absolute_change=abs_c,
        percentage_change=pct_c
    )

def determine_direction(aqi_pct):
    if aqi_pct is None:
        return "UNKNOWN"
    
    # Negative AQI change means pollution decreased (IMPROVED)
    if aqi_pct < -5.0:
        return "IMPROVED"
    elif aqi_pct > 5.0:
        return "WORSENED"
    else:
        return "STABLE"

def compare_missions_data(current_mission, previous_mission, current_readings, previous_readings, current_hotspots, previous_hotspots, settings):
    # 1. Overall Environmental
    c_aqi_avg = sum(r.aqi for r in current_readings if r.aqi is not None) / sum(1 for r in current_readings if r.aqi is not None) if sum(1 for r in current_readings if r.aqi is not None) else None
    p_aqi_avg = sum(r.aqi for r in previous_readings if r.aqi is not None) / sum(1 for r in previous_readings if r.aqi is not None) if sum(1 for r in previous_readings if r.aqi is not None) else None
    
    c_pm25_avg = sum(r.pm25 for r in current_readings if r.pm25 is not None) / sum(1 for r in current_readings if r.pm25 is not None) if sum(1 for r in current_readings if r.pm25 is not None) else None
    p_pm25_avg = sum(r.pm25 for r in previous_readings if r.pm25 is not None) / sum(1 for r in previous_readings if r.pm25 is not None) if sum(1 for r in previous_readings if r.pm25 is not None) else None

    c_pm10_avg = sum(r.pm10 for r in current_readings if r.pm10 is not None) / sum(1 for r in current_readings if r.pm10 is not None) if sum(1 for r in current_readings if r.pm10 is not None) else None
    p_pm10_avg = sum(r.pm10 for r in previous_readings if r.pm10 is not None) / sum(1 for r in previous_readings if r.pm10 is not None) if sum(1 for r in previous_readings if r.pm10 is not None) else None

    c_temp_avg = sum(r.temperature for r in current_readings if r.temperature is not None) / sum(1 for r in current_readings if r.temperature is not None) if sum(1 for r in current_readings if r.temperature is not None) else None
    p_temp_avg = sum(r.temperature for r in previous_readings if r.temperature is not None) / sum(1 for r in previous_readings if r.temperature is not None) if sum(1 for r in previous_readings if r.temperature is not None) else None

    c_hum_avg = sum(r.humidity for r in current_readings if r.humidity is not None) / sum(1 for r in current_readings if r.humidity is not None) if sum(1 for r in current_readings if r.humidity is not None) else None
    p_hum_avg = sum(r.humidity for r in previous_readings if r.humidity is not None) / sum(1 for r in previous_readings if r.humidity is not None) if sum(1 for r in previous_readings if r.humidity is not None) else None

    # Peaks
    c_aqi_peak = max([r.aqi for r in current_readings if r.aqi is not None], default=None)
    p_aqi_peak = max([r.aqi for r in previous_readings if r.aqi is not None], default=None)
    
    c_pm25_peak = max([r.pm25 for r in current_readings if r.pm25 is not None], default=None)
    p_pm25_peak = max([r.pm25 for r in previous_readings if r.pm25 is not None], default=None)

    c_pm10_peak = max([r.pm10 for r in current_readings if r.pm10 is not None], default=None)
    p_pm10_peak = max([r.pm10 for r in previous_readings if r.pm10 is not None], default=None)

    overall = OverallComparison(
        aqi=_make_metric(c_aqi_avg, p_aqi_avg),
        pm25=_make_metric(c_pm25_avg, p_pm25_avg),
        pm10=_make_metric(c_pm10_avg, p_pm10_avg),
        temperature=_make_metric(c_temp_avg, p_temp_avg),
        humidity=_make_metric(c_hum_avg, p_hum_avg),
        peak_aqi=_make_peak(c_aqi_peak, p_aqi_peak),
        peak_pm25=_make_peak(c_pm25_peak, p_pm25_peak),
        peak_pm10=_make_peak(c_pm10_peak, p_pm10_peak)
    )

    # 2. Hotspots
    c_hotspot_count = len(current_hotspots)
    p_hotspot_count = len(previous_hotspots)
    
    c_hotspot_peak = max([h.peak_aqi for h in current_hotspots if h.peak_aqi is not None], default=None)
    p_hotspot_peak = max([h.peak_aqi for h in previous_hotspots if h.peak_aqi is not None], default=None)
    h_abs, _ = _calc_change(c_hotspot_peak, p_hotspot_peak)

    hotspots = HotspotComparison(
        current_count=c_hotspot_count,
        previous_count=p_hotspot_count,
        count_change=c_hotspot_count - p_hotspot_count,
        current_highest_aqi=c_hotspot_peak,
        previous_highest_aqi=p_hotspot_peak,
        highest_aqi_change=h_abs
    )

    # 3. Spatial Matching
    spatial_data = []
    
    # Filter readings with valid GPS
    c_valid = [r for r in current_readings if r.latitude is not None and r.longitude is not None]
    p_valid = [r for r in previous_readings if r.latitude is not None and r.longitude is not None]
    
    matched_count = 0
    p_matched_indices = set()
    
    if c_valid and p_valid:
        # Convert to radians for BallTree haversine metric
        p_coords = np.radians([[r.latitude, r.longitude] for r in p_valid])
        c_coords = np.radians([[r.latitude, r.longitude] for r in c_valid])
        
        # Earth radius in meters
        EARTH_RADIUS = 6371000.0
        
        tree = BallTree(p_coords, metric='haversine')
        
        # We query the 1 nearest neighbor for each point in current mission
        distances, indices = tree.query(c_coords, k=1)
        
        for i, c_r in enumerate(c_valid):
            dist_meters = distances[i][0] * EARTH_RADIUS
            
            if dist_meters <= settings.COMPARISON_RADIUS_METERS:
                p_idx = indices[i][0]
                # Avoid many-to-one duplication. First come first serve for simplicity.
                if p_idx not in p_matched_indices:
                    p_matched_indices.add(p_idx)
                    p_r = p_valid[p_idx]
                    
                    aqi_abs, _ = _calc_change(c_r.aqi, p_r.aqi)
                    pm25_abs, _ = _calc_change(c_r.pm25, p_r.pm25)
                    pm10_abs, _ = _calc_change(c_r.pm10, p_r.pm10)
                    
                    spatial_data.append(SpatialComparisonPoint(
                        latitude=c_r.latitude,
                        longitude=c_r.longitude,
                        aqi=MetricChange(current=c_r.aqi, previous=p_r.aqi, change=aqi_abs),
                        pm25=MetricChange(current=c_r.pm25, previous=p_r.pm25, change=pm25_abs),
                        pm10=MetricChange(current=c_r.pm10, previous=p_r.pm10, change=pm10_abs),
                        distance_meters=round(dist_meters, 2)
                    ))
                    matched_count += 1

    matching = MatchingStats(
        current_total=len(current_readings),
        previous_total=len(previous_readings),
        matched=matched_count,
        current_unmatched=len(current_readings) - matched_count,
        previous_unmatched=len(previous_readings) - len(p_matched_indices),
        radius_meters=settings.COMPARISON_RADIUS_METERS
    )

    summary = ComparisonSummary(
        aqi_change_percent=overall.aqi.percentage_change,
        pm25_change_percent=overall.pm25.percentage_change,
        pm10_change_percent=overall.pm10.percentage_change,
        hotspot_change=hotspots.count_change,
        overall_direction=determine_direction(overall.aqi.percentage_change)
    )

    return MissionComparisonResponse(
        current_mission=MissionResponse.from_orm(current_mission),
        previous_mission=MissionResponse.from_orm(previous_mission),
        overall=overall,
        hotspots=hotspots,
        spatial_data=spatial_data,
        matching=matching,
        summary=summary
    )
