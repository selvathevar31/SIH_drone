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

class DashboardResponse(BaseModel):
    mission: MissionResponse
    current_environment: CurrentEnvironment
    telemetry: Telemetry
    current_location: CurrentLocation
    flight_path: List[FlightPathPoint]
    hotspots: List[HotspotResponse]
    trend: List[TrendPoint]
    recent_events: List[RecentEvent]
