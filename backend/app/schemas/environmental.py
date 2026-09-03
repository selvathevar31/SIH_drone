from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class EnvironmentalRecord(BaseModel):
    """
    Canonical environmental record contract shared across all systems.
    Values are fully validated against coordinates and reasonable physical limits.
    """
    timestamp: datetime = Field(
        ..., 
        description="UTC timestamp of the spatial measurement. ISO 8601 format preferred."
    )
    latitude: float = Field(
        ..., 
        description="Decimal degree latitude. Valid range: -90.0 to 90.0.",
        ge=-90.0, 
        le=90.0
    )
    longitude: float = Field(
        ..., 
        description="Decimal degree longitude. Valid range: -180.0 to 180.0.",
        ge=-180.0, 
        le=180.0
    )
    altitude: Optional[float] = Field(
        None, 
        description="Relative drone altitude in meters above home home coordinate reference."
    )
    pm1: Optional[float] = Field(
        None, 
        description="PM1.0 concentration in µg/m³. Must be non-negative.",
        ge=0.0
    )
    pm25: Optional[float] = Field(
        None, 
        description="PM2.5 concentration in µg/m³. Must be non-negative.",
        ge=0.0
    )
    pm10: Optional[float] = Field(
        None, 
        description="PM10 concentration in µg/m³. Must be non-negative.",
        ge=0.0
    )
    temperature: Optional[float] = Field(
        None, 
        description="Ambient air temperature in °C. Typical range: -50.0 to 100.0.",
        ge=-50.0, 
        le=100.0
    )
    humidity: Optional[float] = Field(
        None, 
        description="Ambient relative humidity in %. Valid range: 0.0 to 100.0.",
        ge=0.0, 
        le=100.0
    )

class EnvironmentalRecordCreate(EnvironmentalRecord):
    mission_id: str
    data_source: Optional[str] = Field("UNKNOWN", description="Metadata tracking source of record (CSV, ESP32, SIMULATOR, etc.)")

# Sub-objects for the nested response schema in Section 8
class LocationInfo(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None

class MeasurementInfo(BaseModel):
    pm1: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None

class DerivedInfo(BaseModel):
    aqi: Optional[int] = None
    aqi_category: Optional[str] = "UNKNOWN"
    pm25_aqi: Optional[int] = None
    pm10_aqi: Optional[int] = None

class QualityMetadata(BaseModel):
    source: str = "UNKNOWN"
    quality_status: str = "VALID" # VALID, PARTIAL, WARNING, REJECTED
    validation_warnings: List[str] = []

class EnvironmentalRecordResponse(BaseModel):
    """
    Standardized public API response for environmental readings.
    Contains the canonical nested structure alongside root-level legacy keys to prevent dashboard breakages.
    """
    # Canonical nested elements
    timestamp: str
    location: LocationInfo
    measurements: MeasurementInfo
    derived: DerivedInfo
    metadata: QualityMetadata

    # Backward compatibility keys (legacy flat keys)
    id: int
    mission_id: str
    data_source: str
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    pm1: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    aqi: Optional[int] = None
    pm25_aqi: Optional[int] = None
    pm10_aqi: Optional[int] = None
    aqi_category: Optional[str] = "UNKNOWN"
    
    class Config:
        from_attributes = True
