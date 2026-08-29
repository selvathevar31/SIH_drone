import logging
from sqlalchemy.orm import Session
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.schemas.decision import (
    EnvironmentalDecisionResponse,
    DecisionRecommendation,
    DecisionLocation,
    DecisionEvidence
)
from app.services.pollution_intelligence import analyze_pollution_level, analyze_pollution_trend
from app.services.adaptive_sampling import calculate_adaptive_sampling
from typing import Any

logger = logging.getLogger(__name__)

def generate_environmental_decision(mission_id: str, db: Session, settings: Any = None) -> EnvironmentalDecisionResponse:
    """
    Orchestrates pollution intelligence and adaptive sampling to produce an explainable
    Environmental Decision Response.
    Always acts as a recommender, not a flight commander.
    """
    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()

    if not readings:
        return EnvironmentalDecisionResponse(
            mission_id=mission_id,
            risk_level="SAFE",
            primary_driver="No Data",
            hotspot_count=0,
            trend="STABLE",
            confidence=0.0,
            recommendations=[]
        )

    # Gather base intelligence
    level_intel = analyze_pollution_level(readings)
    trend_intel = analyze_pollution_trend(readings)
    adaptive_intel = calculate_adaptive_sampling(readings, hotspots)

    # Determine Risk Level & Primary Driver
    avg_aqi = level_intel.get("average_aqi", 0)
    max_aqi = level_intel.get("max_aqi", 0)

    risk_level = "SAFE"
    primary_driver = "Background Levels"

    if max_aqi > 400:
        risk_level = "HAZARDOUS"
        primary_driver = "Severe AQI Peak"
    elif max_aqi > 200 or len(hotspots) > 0:
        risk_level = "HIGH_RISK"
        primary_driver = "Hotspot Detected"
    elif max_aqi > 100:
        risk_level = "MODERATE"
        primary_driver = "Elevated AQI"

    trend_status = trend_intel.get("trend", "STABLE")
    if trend_status == "WORSENING" and risk_level == "SAFE":
        risk_level = "MODERATE"
        primary_driver = "Worsening Trend"

    recommendations = []
    
    # Map adaptive sampling zones to Formal DecisionRecommendations
    recommended_zones = adaptive_intel.get("recommended_zones", [])
    
    for idx, zone in enumerate(recommended_zones):
        # Infer evidence based on the reason provided by adaptive sampling
        evidence_list = []
        
        # We can extract supporting measurement count
        pts = zone.get("supporting_measurements", 0)
        evidence_list.append(DecisionEvidence(
            metric="readings_count",
            value=float(pts),
            unit="points",
            description=f"Supporting measurements in this zone"
        ))
        
        # Add a placeholder for gradient or hotspot severity based on priority
        if zone.get("priority") == "HIGH" or zone.get("priority") == "CRITICAL":
            evidence_list.append(DecisionEvidence(
                metric="spatial_gradient",
                value=max_aqi,  # Approximation
                unit="AQI",
                description="High local gradient or severe peak nearby"
            ))

        action_text = "Targeted Survey"
        if "hotspot" in zone.get("reason", "").lower():
            action_text = "Hotspot Boundary Mapping"
        elif "sparse" in zone.get("reason", "").lower():
            action_text = "Density Infill Flight"

        rec = DecisionRecommendation(
            priority=zone.get("priority", "LOW"),
            action=action_text,
            reason=zone.get("reason", "No specific reason provided"),
            evidence=evidence_list,
            location=DecisionLocation(latitude=zone.get("latitude"), longitude=zone.get("longitude")),
            radius_meters=zone.get("radius", 100.0),
            confidence=adaptive_intel.get("confidence", 0.8),
            recommendation_only=True
        )
        recommendations.append(rec)

    # Calculate overall confidence
    overall_conf = 0.9 if len(readings) > 50 else 0.5

    return EnvironmentalDecisionResponse(
        mission_id=mission_id,
        risk_level=risk_level,
        primary_driver=primary_driver,
        hotspot_count=len(hotspots),
        trend=trend_status,
        confidence=overall_conf,
        recommendations=recommendations
    )
