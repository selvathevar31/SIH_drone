from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DecisionEvidence(BaseModel):
    """Raw evidence points backing a decision"""
    metric: str
    value: float
    unit: str
    description: Optional[str] = None

class DecisionLocation(BaseModel):
    latitude: float
    longitude: float

class DecisionRecommendation(BaseModel):
    """A specific operational recommendation"""
    priority: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW")
    action: str = Field(..., description="Short action string, e.g., 'Targeted Survey'")
    reason: str = Field(..., description="Explanation of why this action is recommended")
    evidence: List[DecisionEvidence] = Field(default_factory=list)
    location: DecisionLocation
    radius_meters: float
    confidence: float
    recommendation_only: bool = Field(default=True, description="Strict enforcement that this is not a command")

class EnvironmentalDecisionResponse(BaseModel):
    """The aggregate decision payload"""
    mission_id: str
    risk_level: str = Field(..., description="SAFE, MODERATE, HIGH_RISK, HAZARDOUS")
    primary_driver: str = Field(..., description="E.g., 'PM2.5 Exceedance', 'Stable Baseline'")
    hotspot_count: int
    trend: str = Field(..., description="IMPROVING, STABLE, WORSENING")
    confidence: float
    recommendations: List[DecisionRecommendation]
