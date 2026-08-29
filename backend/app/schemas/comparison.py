from pydantic import BaseModel
from typing import Optional, List, Dict
from app.schemas.mission import MissionResponse

class ComparisonMetric(BaseModel):
    current_average: Optional[float] = None
    previous_average: Optional[float] = None
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None

class PeakComparisonMetric(BaseModel):
    current_peak: Optional[float] = None
    previous_peak: Optional[float] = None
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None

class OverallComparison(BaseModel):
    aqi: ComparisonMetric
    pm25: ComparisonMetric
    pm10: ComparisonMetric
    temperature: ComparisonMetric
    humidity: ComparisonMetric
    peak_aqi: PeakComparisonMetric
    peak_pm25: PeakComparisonMetric
    peak_pm10: PeakComparisonMetric

class HotspotComparison(BaseModel):
    current_count: int
    previous_count: int
    count_change: int
    current_highest_aqi: Optional[float] = None
    previous_highest_aqi: Optional[float] = None
    highest_aqi_change: Optional[float] = None

class MetricChange(BaseModel):
    current: Optional[float] = None
    previous: Optional[float] = None
    change: Optional[float] = None

class SpatialComparisonPoint(BaseModel):
    latitude: float
    longitude: float
    aqi: MetricChange
    pm25: MetricChange
    pm10: MetricChange
    distance_meters: float

class MatchingStats(BaseModel):
    current_total: int
    previous_total: int
    matched: int
    current_unmatched: int
    previous_unmatched: int
    radius_meters: float

class ComparisonSummary(BaseModel):
    aqi_change_percent: Optional[float] = None
    pm25_change_percent: Optional[float] = None
    pm10_change_percent: Optional[float] = None
    hotspot_change: int
    overall_direction: str

class MissionComparisonResponse(BaseModel):
    current_mission: MissionResponse
    previous_mission: MissionResponse
    overall: OverallComparison
    hotspots: HotspotComparison
    spatial_data: List[SpatialComparisonPoint]
    matching: MatchingStats
    summary: ComparisonSummary
