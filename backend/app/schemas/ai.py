from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class AIQueryRequest(BaseModel):
    mission_id: str
    question: str


class KnowledgeSource(BaseModel):
    """Provenance metadata for a single knowledge document used in an answer."""
    document_id: str
    title: str
    category: str
    source: str
    source_reference: Optional[str] = None


class AIQueryResponse(BaseModel):
    question: str
    answer: str
    intent: str

    # Numeric confidence score 0.0–1.0 (backward compat)
    confidence: float

    # Human-readable confidence label: "high" | "medium" | "low"
    confidence_label: Optional[str] = None

    # Evidence: structured FLUXX database records used to produce the answer
    evidence: List[Dict[str, Any]]

    # Knowledge sources: approved reference documents cited in the answer
    knowledge_sources: Optional[List[KnowledgeSource]] = None

    facts: List[str]
    inferences: List[str]
    recommendations: List[str]
    data_source: str

    # Backward compatibility fields (kept for dashboard/legacy consumers)
    query_type: Optional[str] = None
    supporting_values: Optional[Dict[str, Any]] = None
    locations: Optional[List[Dict[str, Any]]] = None
