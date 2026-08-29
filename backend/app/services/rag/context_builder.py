"""
FLUXX RAG Context Builder

Assembles the canonical GroundedContext object that is the ONLY thing
passed to the generation layer. The LLM never sees raw DB session objects —
only structured evidence from this context.

Structure:
{
    "query": "...",
    "intent": "...",
    "mission_id": "...",
    "data_evidence": [...],      # From StructuredRetriever
    "knowledge_evidence": [...], # From KnowledgeRetriever
}
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.rag.retriever import (
    StructuredRetriever,
    KnowledgeRetriever,
    get_structured_retriever,
    get_knowledge_retriever,
)

# Intents that require BOTH data and knowledge retrieval
HYBRID_INTENTS = {"data_plus_knowledge"}

# Intents that require ONLY knowledge (no DB retrieval)
KNOWLEDGE_ONLY_INTENTS = {"environmental_explanation"}

# Intents that require ONLY data (no knowledge retrieval)
DATA_ONLY_INTENTS = {
    "highest_aqi", "average_aqi",
    "highest_pm25", "average_pm25",
    "highest_pm10", "average_pm10",
    "pollution_by_altitude", "pollution_trend",
    "hotspot_analysis", "highest_hotspot", "hotspot_count",
    "mission_summary", "mission_comparison", "recommendation",
}


@dataclass
class GroundedContext:
    """
    The canonical evidence package passed to the generation layer.
    Contains ONLY retrieved data — nothing fabricated.
    """
    query: str
    intent: str
    mission_id: str
    data_evidence: List[Dict[str, Any]] = field(default_factory=list)
    knowledge_evidence: List[Dict[str, Any]] = field(default_factory=list)
    retrieval_performed: bool = False
    mission_exists: bool = True

    def has_data(self) -> bool:
        return len(self.data_evidence) > 0

    def has_knowledge(self) -> bool:
        return len(self.knowledge_evidence) > 0

    def is_empty(self) -> bool:
        return not self.has_data() and not self.has_knowledge()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "intent": self.intent,
            "mission_id": self.mission_id,
            "data_evidence": self.data_evidence,
            "knowledge_evidence": self.knowledge_evidence,
            "retrieval_performed": self.retrieval_performed,
            "mission_exists": self.mission_exists,
        }


class ContextBuilder:
    """
    Orchestrates retrieval and assembles a GroundedContext.
    Decides which retrieval paths to activate based on intent.
    """

    def __init__(
        self,
        structured: Optional[StructuredRetriever] = None,
        knowledge: Optional[KnowledgeRetriever] = None,
    ):
        self._structured = structured or get_structured_retriever()
        self._knowledge = knowledge or get_knowledge_retriever()

    def build(
        self,
        db: Session,
        mission_id: str,
        intent: str,
        query: str,
    ) -> GroundedContext:
        """
        Build a GroundedContext for the given intent and mission.
        """
        from app.models.mission import Mission

        # Check mission exists
        mission_obj = db.query(Mission).filter(Mission.mission_id == mission_id).first()
        mission_exists = mission_obj is not None

        ctx = GroundedContext(
            query=query,
            intent=intent,
            mission_id=mission_id,
            mission_exists=mission_exists,
            retrieval_performed=True,
        )

        # ── Data retrieval ──────────────────────────────────────────────────
        if mission_exists and intent not in KNOWLEDGE_ONLY_INTENTS:
            ctx.data_evidence = self._structured.retrieve_for_intent(db, mission_id, intent)

        # ── Knowledge retrieval ─────────────────────────────────────────────
        # Always retrieve knowledge for hybrid and explanation intents.
        # Also retrieve for data intents so the LLM can interpret the numbers.
        knowledge_intents = KNOWLEDGE_ONLY_INTENTS | HYBRID_INTENTS | DATA_ONLY_INTENTS
        if intent in knowledge_intents or intent == "unknown":
            ctx.knowledge_evidence = self._knowledge.retrieve(intent, query=query, limit=3)

        return ctx


# Singleton
_default_builder = ContextBuilder()


def get_context_builder() -> ContextBuilder:
    return _default_builder
