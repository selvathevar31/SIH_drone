from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from app.schemas.public import (
    PublicOverview,
    PublicMission,
    PublicMissionList,
    PublicMissionDetail,
    PublicMapPoint,
    PublicHotspot,
    PublicHotspotList,
    PublicMissionMapData,
    PublicTrendPoint,
    PublicTrendData,
    PublicAIQueryRequest,
    PublicAIResponse,
)

# Reuse RAG pipeline components
from app.services.ai_router import detect_intent_and_extract_params
from app.services.rag.context_builder import get_context_builder
from app.services.rag.grounding import get_generator

router = APIRouter(prefix="/api/public", tags=["Public API"])


def error_response(status_code: int, error_code: str, message: str) -> JSONResponse:
    """Format sanitized, standard JSON error responses for the public API."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_code,
            "message": message
        }
    )


@router.get("/overview", response_model=PublicOverview)
def get_public_overview(db: Session = Depends(get_db)):
    """
    Get current environmental overview based on the absolute latest telemetry reading.
    Excludes all operator diagnostics.
    """
    latest = db.query(Reading).order_by(Reading.timestamp.desc()).first()
    if not latest:
        return PublicOverview(source="FLUXX")

    return PublicOverview(
        aqi=latest.aqi,
        aqi_category=latest.aqi_category,
        pm25=latest.pm25,
        pm10=latest.pm10,
        temperature=latest.temperature,
        humidity=latest.humidity,
        timestamp=latest.timestamp,
        source="FLUXX"
    )


@router.get("/missions", response_model=PublicMissionList)
def get_public_missions(db: Session = Depends(get_db)):
    """
    Get a list of completed, public-safe missions.
    Aggregates stats in SQL to avoid N+1 queries.
    """
    missions = db.query(Mission).filter(func.lower(Mission.status) == "completed").order_by(Mission.created_at.desc()).all()
    if not missions:
        return PublicMissionList(items=[])

    m_ids = [m.mission_id for m in missions]

    # SQL aggregation for average and peak AQI
    stats_raw = db.query(
        Reading.mission_id,
        func.avg(Reading.aqi).label("avg_aqi"),
        func.max(Reading.aqi).label("max_aqi")
    ).filter(Reading.mission_id.in_(m_ids)).group_by(Reading.mission_id).all()

    stats_dict = {row.mission_id: row for row in stats_raw}

    items = []
    for m in missions:
        m_stats = stats_dict.get(m.mission_id)
        duration_minutes = round(m.duration_seconds / 60.0, 1) if m.duration_seconds else None

        items.append(
            PublicMission(
                mission_id=m.mission_id,
                date=m.start_time.isoformat() if m.start_time else None,
                duration_minutes=duration_minutes,
                distance_km=round(m.distance_km, 2) if m.distance_km is not None else None,
                average_aqi=int(round(m_stats.avg_aqi)) if m_stats and m_stats.avg_aqi is not None else None,
                max_aqi=int(m_stats.max_aqi) if m_stats and m_stats.max_aqi is not None else None,
                status=m.status
            )
        )

    return PublicMissionList(items=items)


@router.get("/missions/{mission_id}", response_model=PublicMissionDetail)
def get_public_mission_detail(mission_id: str, db: Session = Depends(get_db)):
    """Get a public-safe mission summary. Excludes diagnostic telemetry."""
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return error_response(404, "MISSION_NOT_FOUND", "The requested mission does not exist.")

    # Sanitized aggregations
    readings_count = db.query(func.count(Reading.id)).filter(Reading.mission_id == mission_id).scalar() or 0
    hotspots_count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar() or 0

    avg_max = db.query(
        func.avg(Reading.aqi).label("avg_aqi"),
        func.max(Reading.aqi).label("max_aqi")
    ).filter(Reading.mission_id == mission_id).first()

    duration_minutes = round(mission.duration_seconds / 60.0, 1) if mission.duration_seconds else None

    return PublicMissionDetail(
        mission_id=mission.mission_id,
        date=mission.start_time.isoformat() if mission.start_time else None,
        duration_minutes=duration_minutes,
        distance_km=round(mission.distance_km, 2) if mission.distance_km is not None else None,
        average_aqi=int(round(avg_max.avg_aqi)) if avg_max and avg_max.avg_aqi is not None else None,
        max_aqi=int(avg_max.max_aqi) if avg_max and avg_max.max_aqi is not None else None,
        status=mission.status,
        total_readings=readings_count,
        hotspots_detected=hotspots_count
    )


@router.get("/missions/{mission_id}/map", response_model=PublicMissionMapData)
def get_public_mission_map(mission_id: str, db: Session = Depends(get_db)):
    """
    Get sanitized route, measurement points, and hotspots for mapping.
    Excludes battery levels, diagnostic status, and internal IDs.
    """
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return error_response(404, "MISSION_NOT_FOUND", "The requested mission does not exist.")

    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    if not readings:
        return PublicMissionMapData(mission_id=mission_id, route=[], points=[], hotspots=[])

    # Sample to max 100 points to optimize payload and performance
    step = max(1, len(readings) // 100)
    sampled = readings[::step]

    route = [[r.latitude, r.longitude] for r in sampled]
    points = [
        PublicMapPoint(latitude=r.latitude, longitude=r.longitude, aqi=r.aqi, pm25=r.pm25)
        for r in sampled
    ]

    hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
    public_hotspots = [
        PublicHotspot(
            latitude=h.latitude,
            longitude=h.longitude,
            radius=h.radius_meters or 75.0,
            severity=h.severity,
            average_aqi=h.average_aqi,
            peak_aqi=h.peak_aqi,
            timestamp=mission.start_time
        )
        for h in hotspots
    ]

    return PublicMissionMapData(
        mission_id=mission_id,
        route=route,
        points=points,
        hotspots=public_hotspots
    )


@router.get("/missions/{mission_id}/trend", response_model=PublicTrendData)
def get_public_mission_trend(mission_id: str, db: Session = Depends(get_db)):
    """Get time-series environmental trends for a mission, sampled to max 50 points."""
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return error_response(404, "MISSION_NOT_FOUND", "The requested mission does not exist.")

    readings = db.query(Reading).filter(Reading.mission_id == mission_id).order_by(Reading.timestamp.asc()).all()
    if not readings:
        return PublicTrendData(mission_id=mission_id, trend=[])

    step = max(1, len(readings) // 50)
    sampled = readings[::step]

    trend_points = [
        PublicTrendPoint(
            timestamp=r.timestamp,
            aqi=r.aqi,
            pm25=r.pm25,
            pm10=r.pm10,
            temperature=r.temperature,
            humidity=r.humidity
        )
        for r in sampled
    ]

    return PublicTrendData(mission_id=mission_id, trend=trend_points)


@router.get("/hotspots", response_model=PublicHotspotList)
def get_public_hotspots(db: Session = Depends(get_db)):
    """Get all relevant public hotspots across completed missions."""
    hotspots = (
        db.query(Hotspot)
        .join(Mission, Hotspot.mission_id == Mission.mission_id)
        .filter(func.lower(Mission.status) == "completed")
        .all()
    )

    items = [
        PublicHotspot(
            latitude=h.latitude,
            longitude=h.longitude,
            radius=h.radius_meters or 75.0,
            severity=h.severity,
            average_aqi=h.average_aqi,
            peak_aqi=h.peak_aqi,
            timestamp=h.detected_at
        )
        for h in hotspots
    ]

    return PublicHotspotList(items=items)


@router.post("/ai/query", response_model=PublicAIResponse)
def public_ai_query(req: PublicAIQueryRequest, db: Session = Depends(get_db)):
    """
    Sanitized query routing using the existing grounded RAG pipeline.
    Hides internal retrieval coordinates, IDs, and prompt context from public view.
    """
    intent, params = detect_intent_and_extract_params(req.question)

    builder = get_context_builder()
    ctx = builder.build(db, req.mission_id, intent, req.question)

    if not ctx.mission_exists:
        return error_response(404, "MISSION_NOT_FOUND", "The requested mission does not exist.")

    generator = get_generator()
    grounded = generator.generate(ctx)

    # Simplified public-safe knowledge sources
    sources = [
        {
            "document_id": src.get("document_id", ""),
            "title": src.get("title", ""),
            "source": src.get("source", ""),
            "source_reference": src.get("source_reference", "")
        }
        for src in grounded.knowledge_sources
    ]

    return PublicAIResponse(
        answer=grounded.answer,
        facts=grounded.facts,
        inferences=grounded.inferences,
        recommendations=grounded.recommendations,
        confidence=grounded.confidence,
        knowledge_sources=sources
    )
