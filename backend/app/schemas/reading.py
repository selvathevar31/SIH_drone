from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReadingBase(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    altitude_reference: Optional[str] = "RELATIVE_HOME"
    pm1: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    
    speed: Optional[float] = None
    heading: Optional[float] = None
    battery: Optional[int] = None
    satellites: Optional[int] = None
    gps_status: Optional[str] = None
    signal_strength: Optional[float] = None

class ReadingCreate(ReadingBase):
    mission_id: str
    data_source: Optional[str] = "UNKNOWN"

class ReadingResponse(ReadingBase):
    id: int
    mission_id: str
    data_source: str
    aqi: Optional[int]
    aqi_category: Optional[str]
    
    class Config:
        orm_mode = True
        from_attributes = True

class DataQualityStats(BaseModel):
    total_readings: int
    valid_gps: int
    missing_pm1: int
    missing_pm25: int
    missing_pm10: int
    missing_temperature: int
    missing_humidity: int

class PaginatedReadingsResponse(BaseModel):
    items: list[ReadingResponse]
    page: int
    limit: int
    total: int
    pages: int
    data_quality: DataQualityStats
