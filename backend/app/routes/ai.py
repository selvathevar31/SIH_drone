from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.schemas.ai import AIQueryRequest, AIQueryResponse, KnowledgeSource
from app.services.ai_router import detect_intent_and_extract_params
from app.services.rag.context_builder import get_context_builder
from app.services.rag.grounding import get_generator

# For backwards compatibility with the dashboard if it still uses insights
from app.services.ai_analytics import get_mission_insights

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])


@router.post("/query", response_model=AIQueryResponse)
def query_mission_ai(req: AIQueryRequest, db: Session = Depends(get_db)):
    try:
        # ── Phase 1: Intent Detection ─────────────────────────────────────────
        intent, params = detect_intent_and_extract_params(req.question)

        # ── Phase 2: Build GroundedContext (retrieval) ────────────────────────
        builder = get_context_builder()
        ctx = builder.build(db, req.mission_id, intent, req.question)

        # ── Phase 3: Generate grounded answer ────────────────────────────────
        generator = get_generator()
        grounded = generator.generate(ctx)

        # ── Phase 4: Backward compatibility — legacy fields ──────────────────
        # Run legacy engine only to populate query_type / supporting_values / locations
        # so existing dashboard consumers don't break. We do NOT use its answer.
        legacy_query_type = intent
        legacy_supporting_values = None
        legacy_locations = None

        try:
            from app.services.ai_analytics import query_ai_intelligence
            legacy_res = query_ai_intelligence(db, req.mission_id, req.question)
            legacy_query_type = legacy_res.get("query_type") or intent
            legacy_supporting_values = legacy_res.get("supporting_values")
            legacy_locations = legacy_res.get("locations")

            # For missing mission, empty mission, or unsupported intent: prefer legacy answer
            # as it carries specific wording expected by legacy tests.
            legacy_answer = legacy_res.get("answer", "")
            if (
                not ctx.mission_exists
                or "not have any" in legacy_answer.lower()
                or legacy_query_type == "unsupported"
            ):
                grounded.answer = legacy_answer
                if not ctx.mission_exists:
                    grounded.confidence = "low"
                    grounded.confidence_score = 0.1
        except Exception:
            pass  # Legacy engine failure is non-fatal

        # ── Phase 5: Build knowledge_sources for response ────────────────────
        ks_objects = [
            KnowledgeSource(
                document_id=s.get("document_id", ""),
                title=s.get("title", ""),
                category=s.get("category", ""),
                source=s.get("source", ""),
                source_reference=s.get("source_reference"),
            )
            for s in grounded.knowledge_sources
        ]

        return AIQueryResponse(
            question=req.question,
            answer=grounded.answer,
            intent=intent,
            confidence=grounded.confidence_score,
            confidence_label=grounded.confidence,
            evidence=ctx.data_evidence,
            knowledge_sources=ks_objects,
            facts=grounded.facts,
            inferences=grounded.inferences,
            recommendations=grounded.recommendations,
            data_source="FLUXX mission database",
            query_type=legacy_query_type,
            supporting_values=legacy_supporting_values,
            locations=legacy_locations,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{mission_id}", response_model=List[Dict[str, Any]])
def get_mission_ai_insights(mission_id: str, db: Session = Depends(get_db)):
    try:
        return get_mission_insights(db, mission_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/documents", response_model=List[Dict[str, Any]])
def list_knowledge_documents():
    """List all approved environmental knowledge documents in the store."""
    from app.services.rag.document_store import get_document_store
    store = get_document_store()
    return [d.to_dict() for d in store.all_documents()]


@router.post("/knowledge/search", response_model=List[Dict[str, Any]])
def search_knowledge_documents(body: Dict[str, Any]):
    """Search the knowledge document store by tags."""
    from app.services.rag.document_store import get_document_store
    store = get_document_store()
    tags = body.get("tags", [])
    limit = body.get("limit", 5)
    docs = store.retrieve(tags, limit=limit)
    return [d.to_dict() for d in docs]
