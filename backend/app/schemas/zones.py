from pydantic import BaseModel
from typing import List, Optional

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class ZoneMetric(BaseModel):
    average: float
    minimum: float
    maximum: float

class AltitudeIntelligence(BaseModel):
    min_meters: Optional[float] = None
    max_meters: Optional[float] = None
    average_meters: Optional[float] = None

class PriorityIntelligence(BaseModel):
    score: float
    classification: str
    recommendation: str

class PollutionZone(BaseModel):
    zone_id: str
    centroid: Coordinates
    radius_meters: float
    measurement_count: int
    
    aqi: ZoneMetric
    pm25: Optional[ZoneMetric] = None
    pm10: Optional[ZoneMetric] = None
    
    dominant_pollutant: Optional[str] = None
    severity: Optional[str] = None
    
    # Step 7: Intelligence fields
    altitude: Optional[AltitudeIntelligence] = None
    priority: Optional[PriorityIntelligence] = None

class ZonesResponse(BaseModel):
    mission_id: str
    zones: List[PollutionZone]
