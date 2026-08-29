from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class PublicOverview(BaseModel):
    """Sanitized, high-level current air quality overview."""
    aqi: Optional[int] = Field(None, description="Current computed AQI value")
    aqi_category: Optional[str] = Field(None, description="Category of current AQI (e.g. Good, Poor)")
    pm25: Optional[float] = Field(None, description="PM2.5 concentration in µg/m³")
    pm10: Optional[float] = Field(None, description="PM10 concentration in µg/m³")
    temperature: Optional[float] = Field(None, description="Current ambient temperature in °C")
    humidity: Optional[float] = Field(None, description="Current relative humidity in %")
    timestamp: Optional[datetime] = Field(None, description="Time of the latest reading")
    source: str = Field("FLUXX", description="System label")


class PublicMission(BaseModel):
    """Sanitized public-facing mission item."""
    mission_id: str = Field(..., description="Unique public mission identifier")
    date: Optional[str] = Field(None, description="Start date of the mission (ISO date string)")
    duration_minutes: Optional[float] = Field(None, description="Sanitized duration in minutes")
    distance_km: Optional[float] = Field(None, description="Sanitized flight distance in kilometers")
    average_aqi: Optional[int] = Field(None, description="Average AQI across the entire mission")
    max_aqi: Optional[int] = Field(None, description="Maximum peak AQI detected during the mission")
    status: str = Field(..., description="Mission operational status (e.g. completed)")


class PublicMissionList(BaseModel):
    """List container for public missions."""
    items: List[PublicMission]


class PublicMissionDetail(BaseModel):
    """Comprehensive sanitized details of a mission for public dashboard view."""
    mission_id: str
    date: Optional[str] = None
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    average_aqi: Optional[int] = None
    max_aqi: Optional[int] = None
    status: str
    total_readings: int = Field(..., description="Sanitized count of total telemetry readings")
    hotspots_detected: int = Field(..., description="Count of spatial hotspots detected")


class PublicMapPoint(BaseModel):
    """Sanitized spatial data point for heatmap or route plotting."""
    latitude: float
    longitude: float
    aqi: Optional[int] = None
    pm25: Optional[float] = None


class PublicHotspot(BaseModel):
    """Sanitized hotspot representation for public map and lists."""
    latitude: float
    longitude: float
    radius: float = Field(..., description="Impact radius in meters")
    severity: str = Field(..., description="CPCB-aligned severity label")
    average_aqi: Optional[float] = Field(None, description="Average AQI in the cluster")
    peak_aqi: Optional[float] = Field(None, description="Peak AQI recorded within the hotspot")
    timestamp: Optional[datetime] = Field(None, description="Detection timestamp")


class PublicHotspotList(BaseModel):
    """List container for public hotspots."""
    items: List[PublicHotspot]


class PublicMissionMapData(BaseModel):
    """Complete sanitized geographic data package for mapping."""
    mission_id: str
    route: List[List[float]] = Field(..., description="Flight path coordinate sequence [lat, lng]")
    points: List[PublicMapPoint] = Field(..., description="Sanitized environmental measurement points")
    hotspots: List[PublicHotspot] = Field(..., description="Detected hotspots list")


class PublicTrendPoint(BaseModel):
    """A single time-series trend point."""
    timestamp: datetime
    aqi: Optional[int] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None


class PublicTrendData(BaseModel):
    """Time-series trend package."""
    mission_id: str
    trend: List[PublicTrendPoint]


class PublicAIResponse(BaseModel):
    """Sanitized, grounded AI response for public RAG query. Excludes raw retrieval database details."""
    answer: str = Field(..., description="Concise natural language answer grounded in evidence")
    facts: List[str] = Field(..., description="Retrieved facts used to build the answer")
    inferences: List[str] = Field(..., description="Inferences drawn by the AI")
    recommendations: List[str] = Field(..., description="Operational action recommendations")
    confidence: str = Field(..., description="Confidence label: high, medium, or low")
    knowledge_sources: List[Dict[str, Any]] = Field(..., description="Citations of approved environmental reference docs")


class PublicAIQueryRequest(BaseModel):
    """Sanitized public-facing AI query request."""
    mission_id: str = Field(..., description="Mission identifier to query")
    question: str = Field(..., description="Natural language question")

