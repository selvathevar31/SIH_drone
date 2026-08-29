from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HotspotBase(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float
    average_aqi: Optional[float]
    peak_aqi: Optional[int]
    average_pm25: Optional[float]
    peak_pm25: Optional[float]
    average_pm10: Optional[float]
    peak_pm10: Optional[float]
    severity: Optional[str]
    reading_count: int

class HotspotResponse(HotspotBase):
    id: int
    mission_id: str
    detected_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True
