from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class SimulationRequest(BaseModel):
    sampling_density: str = Field(default="medium", description="Low, medium, or high density")
    include_altitude_recheck: bool = Field(default=True)

class ResponseAction(BaseModel):
    action_id: str
    action_type: str
    description: str
    priority: str
    target_latitude: float
    target_longitude: float
    radius_meters: float
    evidence: Dict[str, Any]
    status: str = "RECOMMENDATION_ONLY"

class MetricsBlock(BaseModel):
    max_aqi: Optional[float] = None
    avg_aqi: Optional[float] = None
    max_pm25: Optional[float] = None
    avg_pm25: Optional[float] = None
    hotspot_count: Optional[int] = None
    high_risk_area_count: Optional[int] = None
    spatial_coverage_improvement: Optional[float] = None
    sampling_density_improvement: Optional[float] = None

class ResponseEffectiveness(BaseModel):
    classification: str # IMPROVED, PARTIALLY_IMPROVED, UNCHANGED, WORSENED, INSUFFICIENT_DATA
    description: str

class SimulationResult(BaseModel):
    simulation_id: str
    mission_id: str
    status: str = "SIMULATION_ONLY"
    risk: str
    response_plan: List[ResponseAction]
    simulated_readings: List[Dict[str, Any]] = []
    before: MetricsBlock
    after: MetricsBlock
    effectiveness: ResponseEffectiveness
    evidence: List[Dict[str, Any]]
    warnings: List[str] = [
        "Simulation results are not real sensor measurements.",
        "No flight-control commands were generated."
    ]
