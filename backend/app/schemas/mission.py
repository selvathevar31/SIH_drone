from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MissionBase(BaseModel):
    mission_id: str
    drone_id: Optional[str] = "UNKNOWN"
    status: Optional[str] = "PLANNED"
    data_source: Optional[str] = "UNKNOWN"

class MissionCreate(MissionBase):
    start_time: Optional[datetime] = None

class MissionResponse(MissionBase):
    id: int
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_seconds: int
    distance_km: float
    total_readings: int
    start_latitude: Optional[float]
    start_longitude: Optional[float]
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    average_telemetry_speed_mps: Optional[float] = None
    average_ground_speed_mps: Optional[float] = None
    max_speed: Optional[float] = None
    max_altitude: Optional[float] = None

    class Config:
        orm_mode = True
        from_attributes = True

class MissionHistoryItem(MissionResponse):
    average_aqi: Optional[float] = None
    peak_aqi: Optional[int] = None
    average_pm25: Optional[float] = None
    peak_pm25: Optional[float] = None
    average_pm10: Optional[float] = None
    peak_pm10: Optional[float] = None
    average_temperature: Optional[float] = None
    average_humidity: Optional[float] = None
    hotspot_count: int = 0

class EnvMetric(BaseModel):
    average: Optional[float] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None

class EnvironmentalAnalytics(BaseModel):
    aqi: EnvMetric
    pm1: EnvMetric
    pm25: EnvMetric
    pm10: EnvMetric
    temperature: EnvMetric
    humidity: EnvMetric

class FlightAnalytics(BaseModel):
    duration_seconds: int
    distance_km: float
    total_readings: int
    max_altitude: Optional[float] = None
    min_altitude: Optional[float] = None
    average_speed: Optional[float] = None
    max_speed: Optional[float] = None

class HotspotAnalytics(BaseModel):
    count: int
    highest_aqi: Optional[int] = None
    average_aqi: Optional[float] = None

class MissionAnalytics(BaseModel):
    mission: MissionResponse
    flight: FlightAnalytics
    environment: EnvironmentalAnalytics
    hotspots: HotspotAnalytics

class MissionUpdate(BaseModel):
    status: Optional[str] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    distance_km: Optional[float] = None

