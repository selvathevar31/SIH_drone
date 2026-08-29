from pydantic import BaseModel
from typing import Optional, List, Dict

class AirQualityStats(BaseModel):
    average_aqi: Optional[float] = None
    minimum_aqi: Optional[float] = None
    maximum_aqi: Optional[float] = None
    readings_with_aqi: int

class ThresholdExceedance(BaseModel):
    threshold: float
    count: int
    percentage: float

class PollutantStats(BaseModel):
    average: Optional[float] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    readings: int
    thresholds: List[ThresholdExceedance]

class EnvStats(BaseModel):
    average: Optional[float] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None

class AqiDistribution(BaseModel):
    good: int = 0
    satisfactory: int = 0
    moderately_polluted: int = 0
    poor: int = 0
    very_poor: int = 0
    severe: int = 0

class DataCoverage(BaseModel):
    total_readings: int
    valid_aqi: int
    valid_pm25: int
    valid_pm10: int
    valid_temperature: int
    valid_humidity: int

class EnvironmentalAnalyticsResponse(BaseModel):
    mission_id: str
    overall_status: str
    dominant_pollutant: Optional[str] = None
    air_quality: AirQualityStats
    pm25: PollutantStats
    pm10: PollutantStats
    temperature: EnvStats
    humidity: EnvStats
    aqi_thresholds: List[ThresholdExceedance]
    aqi_distribution: AqiDistribution
    coverage: DataCoverage
    insights: List[str]
