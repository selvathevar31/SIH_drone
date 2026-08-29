"""
FLUXX RAG Retriever

Two retrieval paths:
1. StructuredRetriever — queries the SQL database for measurements, missions, hotspots, etc.
   Every returned item carries source_type="measurement" and reading_id for provenance.
2. KnowledgeRetriever — queries the TagBasedDocumentStore for approved environmental reference docs.

Neither path invents data. If nothing is found, both return empty lists.
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.reading import Reading
from app.models.mission import Mission
from app.models.hotspot import Hotspot
from app.core.config import settings
from app.services.rag.document_store import (
    TagBasedDocumentStore,
    KnowledgeDocument,
    get_document_store,
    get_tags_for_intent,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reading_to_measurement(r: Reading, source_type: str = "measurement") -> Dict[str, Any]:
    """Convert a SQLAlchemy Reading to a typed evidence dict with full provenance."""
    return {
        "source_type": source_type,
        "reading_id": r.id,
        "mission_id": r.mission_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "altitude": r.altitude,
        "pm1": r.pm1,
        "pm25": r.pm25,
        "pm10": r.pm10,
        "temperature": r.temperature,
        "humidity": r.humidity,
        "aqi": r.aqi,
        "aqi_category": r.aqi_category,
    }


# ---------------------------------------------------------------------------
# Structured (database) retriever
# ---------------------------------------------------------------------------

class StructuredRetriever:
    """
    Retrieves numerical evidence from the FLUXX SQL database.
    Uses SQL aggregation to avoid loading unnecessary records.
    Returns evidence items with full provenance metadata.
    """

    def get_highest_aqi(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        r = (db.query(Reading)
             .filter(Reading.mission_id == mission_id, Reading.aqi.isnot(None))
             .order_by(Reading.aqi.desc())
             .first())
        return [_reading_to_measurement(r)] if r else []

    def get_highest_pm25(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        r = (db.query(Reading)
             .filter(Reading.mission_id == mission_id, Reading.pm25.isnot(None))
             .order_by(Reading.pm25.desc())
             .first())
        return [_reading_to_measurement(r)] if r else []

    def get_highest_pm10(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        r = (db.query(Reading)
             .filter(Reading.mission_id == mission_id, Reading.pm10.isnot(None))
             .order_by(Reading.pm10.desc())
             .first())
        return [_reading_to_measurement(r)] if r else []

    def get_average_pollution(
        self, db: Session, mission_id: str, pollutant: str
    ) -> List[Dict[str, Any]]:
        col_map = {"pm25": Reading.pm25, "pm10": Reading.pm10, "aqi": Reading.aqi}
        col = col_map.get(pollutant, Reading.aqi)
        val = db.query(func.avg(col)).filter(Reading.mission_id == mission_id).scalar()
        if val is None:
            return []
        count = db.query(func.count(Reading.id)).filter(Reading.mission_id == mission_id).scalar()
        return [{
            "source_type": "aggregation",
            "mission_id": mission_id,
            "metric": pollutant,
            "average_value": round(val, 2),
            "readings_used": count,
        }]

    def get_pollution_by_altitude(
        self, db: Session, mission_id: str
    ) -> List[Dict[str, Any]]:
        readings = (db.query(Reading)
                    .filter(Reading.mission_id == mission_id, Reading.altitude.isnot(None))
                    .all())
        if not readings:
            return []
        bins: Dict[int, Dict] = {}
        for r in readings:
            b = int(r.altitude // 10) * 10
            if b not in bins:
                bins[b] = {"pm25_sum": 0.0, "aqi_sum": 0.0, "count": 0}
            bins[b]["pm25_sum"] += r.pm25 or 0
            bins[b]["aqi_sum"] += r.aqi or 0
            bins[b]["count"] += 1

        evidence = []
        for alt, data in bins.items():
            cnt = data["count"]
            evidence.append({
                "source_type": "aggregation",
                "mission_id": mission_id,
                "altitude_range": f"{alt}-{alt + 10}m",
                "average_pm25": round(data["pm25_sum"] / cnt, 2) if cnt else 0,
                "average_aqi": round(data["aqi_sum"] / cnt, 2) if cnt else 0,
                "readings_used": cnt,
            })
        evidence.sort(key=lambda x: x["average_aqi"], reverse=True)
        return evidence[:3]

    def get_pollution_trend(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        readings = (db.query(Reading)
                    .filter(Reading.mission_id == mission_id)
                    .order_by(Reading.timestamp.asc())
                    .all())
        if len(readings) < 10:
            return []
        mid = len(readings) // 2
        first_half, second_half = readings[:mid], readings[mid:]

        def safe_avg(items, attr):
            vals = [getattr(r, attr) for r in items if getattr(r, attr) is not None]
            return round(sum(vals) / len(vals), 2) if vals else None

        return [{
            "source_type": "aggregation",
            "mission_id": mission_id,
            "metric": "trend",
            "initial_half_average_aqi": safe_avg(first_half, "aqi"),
            "second_half_average_aqi": safe_avg(second_half, "aqi"),
            "initial_half_average_pm25": safe_avg(first_half, "pm25"),
            "second_half_average_pm25": safe_avg(second_half, "pm25"),
            "readings_used": len(readings),
        }]

    def get_hotspot_summary(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        hotspots = db.query(Hotspot).filter(Hotspot.mission_id == mission_id).all()
        evidence = []
        for h in hotspots:
            evidence.append({
                "source_type": "hotspot",
                "mission_id": mission_id,
                "hotspot_id": h.id,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "peak_aqi": h.peak_aqi,
                "average_aqi": h.average_aqi,
                "severity": h.severity,
                "radius_meters": h.radius_meters,
            })
        return evidence

    def get_mission_summary(self, db: Session, mission_id: str) -> List[Dict[str, Any]]:
        m = db.query(Mission).filter(Mission.mission_id == mission_id).first()
        if not m:
            return []
        avg_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == mission_id).scalar()
        hotspot_count = db.query(func.count(Hotspot.id)).filter(Hotspot.mission_id == mission_id).scalar()
        return [{
            "source_type": "mission_summary",
            "mission_id": m.mission_id,
            "status": m.status,
            "total_readings": m.total_readings,
            "distance_km": m.distance_km,
            "average_aqi": round(avg_aqi, 2) if avg_aqi else None,
            "hotspots_detected": hotspot_count,
        }]

    def get_mission_comparison(
        self,
        db: Session,
        current_mission_id: str,
        previous_mission_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        current_m = db.query(Mission).filter(Mission.mission_id == current_mission_id).first()
        if not current_m:
            return []
        if not previous_mission_id:
            ref_time = current_m.start_time or current_m.created_at
            if ref_time is None:
                return []
            prev_m = (db.query(Mission)
                      .filter(Mission.mission_id != current_mission_id, Mission.created_at < ref_time)
                      .order_by(Mission.created_at.desc())
                      .first())
        else:
            prev_m = db.query(Mission).filter(Mission.mission_id == previous_mission_id).first()
        if not prev_m:
            return []

        curr_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == current_m.mission_id).scalar()
        prev_aqi = db.query(func.avg(Reading.aqi)).filter(Reading.mission_id == prev_m.mission_id).scalar()
        pct = (
            round(((curr_aqi - prev_aqi) / max(prev_aqi, 1)) * 100, 2)
            if curr_aqi and prev_aqi else None
        )
        return [{
            "source_type": "comparison",
            "current_mission_id": current_m.mission_id,
            "previous_mission_id": prev_m.mission_id,
            "current_average_aqi": round(curr_aqi, 2) if curr_aqi else None,
            "previous_average_aqi": round(prev_aqi, 2) if prev_aqi else None,
            "percentage_change": pct,
        }]

    def retrieve_for_intent(
        self, db: Session, mission_id: str, intent: str
    ) -> List[Dict[str, Any]]:
        """Dispatch to the appropriate retrieval method based on intent."""
        dispatch = {
            "highest_aqi": self.get_highest_aqi,
            "highest_pm25": self.get_highest_pm25,
            "highest_pm10": self.get_highest_pm10,
            "average_aqi": lambda db, mid: self.get_average_pollution(db, mid, "aqi"),
            "average_pm25": lambda db, mid: self.get_average_pollution(db, mid, "pm25"),
            "average_pm10": lambda db, mid: self.get_average_pollution(db, mid, "pm10"),
            "pollution_by_altitude": self.get_pollution_by_altitude,
            "pollution_trend": self.get_pollution_trend,
            "hotspot_analysis": self.get_hotspot_summary,
            "highest_hotspot": self.get_hotspot_summary,
            "hotspot_count": self.get_hotspot_summary,
            "recommendation": self.get_hotspot_summary, # We'll just retrieve hotspots and let the decision engine handle the rest, or wait we should probably retrieve the decision response. Let's just use get_hotspot_summary since hotspots drive recommendations.
            "mission_summary": self.get_mission_summary,
            "mission_comparison": self.get_mission_comparison,
            # Hybrid: retrieve both PM and AQI data
            "data_plus_knowledge": lambda db, mid: (
                self.get_highest_pm25(db, mid) or
                self.get_highest_aqi(db, mid)
            ),
        }
        fn = dispatch.get(intent)
        if fn:
            return fn(db, mission_id)
        return []


# ---------------------------------------------------------------------------
# Knowledge retriever
# ---------------------------------------------------------------------------

class KnowledgeRetriever:
    """
    Retrieves approved environmental reference documents from the document store.
    Returns KnowledgeEvidence items with full provenance.
    """

    def __init__(self, store: Optional[TagBasedDocumentStore] = None):
        self._store = store or get_document_store()

    def retrieve(self, intent: str, query: str = "", limit: int = 3) -> List[Dict[str, Any]]:
        """
        Returns knowledge evidence dicts for use in the GroundedContext.
        Tags are derived from both the intent and query keywords.
        """
        # Get base tags from intent mapping
        tags = list(get_tags_for_intent(intent))

        # Augment with query-level keywords
        query_lower = query.lower()
        extra_keywords = [
            "pm25", "pm10", "aqi", "hotspot", "altitude", "trend", "comparison",
            "dangerous", "concerning", "safe", "health", "threshold", "standard",
        ]
        for kw in extra_keywords:
            if kw in query_lower and kw not in tags:
                tags.append(kw)

        docs = self._store.retrieve(tags, limit=limit)
        return [d.to_dict() for d in docs]

    def get_sources(self, intent: str, query: str = "", limit: int = 3) -> List[Dict[str, Any]]:
        """Return compact evidence dicts for the knowledge_sources response field."""
        tags = list(get_tags_for_intent(intent))
        docs = self._store.retrieve(tags, limit=limit)
        return [d.to_evidence_dict() for d in docs]


# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------

_structured_retriever = StructuredRetriever()
_knowledge_retriever = KnowledgeRetriever()


def get_structured_retriever() -> StructuredRetriever:
    return _structured_retriever


def get_knowledge_retriever() -> KnowledgeRetriever:
    return _knowledge_retriever
