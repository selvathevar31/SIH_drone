"""
Backward-compatible knowledge retrieval wrapper.
This module was the original knowledge layer.
It is now a thin wrapper over app.services.rag.document_store.
"""
from app.services.rag.document_store import get_document_store, get_tags_for_intent


def get_relevant_knowledge(intent: str) -> str:
    """
    Retrieve static approved environmental context as a plain text string.
    Used by legacy code paths that expect a single string.
    """
    store = get_document_store()
    tags = get_tags_for_intent(intent)
    docs = store.retrieve(tags, limit=3)
    return " ".join(doc.content for doc in docs)
