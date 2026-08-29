from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TrendIntelligence(BaseModel):
    trend: str
    percentage: Optional[float] = None

class AltitudeIntelligence(BaseModel):
    min_meters: Optional[float] = None
    max_meters: Optional[float] = None
    average_meters: Optional[float] = None

class PriorityIntelligence(BaseModel):
    score: float
    classification: str
    recommendation: str

class PersistentHotspot(BaseModel):
    hotspot_id: str
    latitude: float
    longitude: float
    surveys_detected: int
    
    first_detected: datetime
    last_detected: datetime
    
    average_aqi: float
    peak_aqi: float
    
    average_pm25: Optional[float] = None
    peak_pm25: Optional[float] = None
    
    average_pm10: Optional[float] = None
    peak_pm10: Optional[float] = None
    
    surveys: List[str]
    
    # Step 7: Intelligence fields
    trend_analysis: Optional[TrendIntelligence] = None
    altitude: Optional[AltitudeIntelligence] = None
    priority: Optional[PriorityIntelligence] = None

class PersistentHotspotsResponse(BaseModel):
    persistent_hotspots: List[PersistentHotspot]
    total: int
    status: Optional[str] = "OK"
    message: Optional[str] = None
