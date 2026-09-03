from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.mission import MissionResponse
from app.schemas.hotspot import HotspotResponse

class CurrentEnvironment(BaseModel):
    aqi: Optional[int]
    aqi_category: Optional[str]
    pm25: Optional[float]
    pm10: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]

class Telemetry(BaseModel):
    altitude: Optional[float]
    speed: Optional[float]
    heading: Optional[float]
    gps_status: Optional[str]
    satellites: Optional[int]
    battery: Optional[int]
    signal_strength: Optional[float]

class CurrentLocation(BaseModel):
    latitude: Optional[float]
    longitude: Optional[float]

class FlightPathPoint(BaseModel):
    timestamp: str
    latitude: float
    longitude: float
    altitude: Optional[float]

class TrendPoint(BaseModel):
    timestamp: str
    aqi: Optional[int]
    pm25: Optional[float]
    pm10: Optional[float]
    isHotspot: bool = False

class RecentEvent(BaseModel):
    id: int
    time: str
    message: str
    type: str

class EnvironmentMapPoint(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: Optional[float]
    pm1: Optional[float]
    pm25: Optional[float]
    pm10: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    aqi: Optional[int]
    aqi_category: Optional[str]

class LocationData(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float]
    value: float
    pollutant: str

class MissionStats(BaseModel):
    total_readings: int
    duration_seconds: int
    max_aqi: Optional[int]
    min_aqi: Optional[int]
    avg_aqi: Optional[int]
    max_pm25: Optional[float]
    min_pm25: Optional[float]
    avg_pm25: Optional[float]
    max_pm10: Optional[float]
    min_pm10: Optional[float]
    avg_pm10: Optional[float]
    max_temperature: Optional[float]
    min_temperature: Optional[float]
    avg_temperature: Optional[float]
    max_humidity: Optional[float]
    min_humidity: Optional[float]
    avg_humidity: Optional[float]
    max_altitude: Optional[float]
    min_altitude: Optional[float]
    avg_altitude: Optional[float]
    highest_pollution_location: Optional[LocationData]
    hotspot_count: int

class DashboardResponse(BaseModel):
    mission: MissionResponse
    mission_stats: MissionStats
    current_environment: CurrentEnvironment
    telemetry: Telemetry
    current_location: CurrentLocation
    flight_path: List[FlightPathPoint]
    hotspots: List[HotspotResponse]
    trend: List[TrendPoint]
    recent_events: List[RecentEvent]
