"""
FLUXX RAG Grounding Layer

Accepts a GroundedContext (containing only retrieved evidence) and produces
a grounded answer. Never invents measurements, coordinates, or citations.

Hierarchy: DATABASE → RETRIEVAL → EVIDENCE → LLM INTERPRETATION

The LLM (Gemini) is used only when a valid API key is present.
When unavailable, the deterministic fallback produces rule-based answers
using only the evidence in the context.
"""
from __future__ import annotations

import os
import json
from typing import Dict, Any, List, Tuple, Optional

from app.services.rag.context_builder import GroundedContext
from app.core.config import settings

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


# ---------------------------------------------------------------------------
# Response dataclass
# ---------------------------------------------------------------------------

class GroundedResponse:
    def __init__(
        self,
        answer: str,
        facts: List[str],
        inferences: List[str],
        recommendations: List[str],
        confidence: str,               # "high" | "medium" | "low"
        confidence_score: float,       # 0.0–1.0
        knowledge_sources: List[Dict[str, Any]],
    ):
        self.answer = answer
        self.facts = facts
        self.inferences = inferences
        self.recommendations = recommendations
        self.confidence = confidence
        self.confidence_score = confidence_score
        self.knowledge_sources = knowledge_sources


# ---------------------------------------------------------------------------
# Confidence helpers
# ---------------------------------------------------------------------------

def _score_confidence(ctx: GroundedContext) -> Tuple[str, float]:
    """Derive a confidence label and numeric score from the context."""
    if not ctx.mission_exists:
        return "low", 0.1
    if ctx.has_data() and ctx.has_knowledge():
        return "high", 0.95
    if ctx.has_data():
        return "high", 0.90
    if ctx.has_knowledge():
        return "medium", 0.60
    return "low", 0.30


# ---------------------------------------------------------------------------
# Grounding prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(ctx: GroundedContext) -> str:
    data_block = json.dumps(ctx.data_evidence, indent=2) if ctx.data_evidence else "[]"
    knowledge_block = ""
    if ctx.knowledge_evidence:
        for doc in ctx.knowledge_evidence:
            knowledge_block += (
                f"\n--- Document: {doc.get('title')} "
                f"(Source: {doc.get('source')}) ---\n"
                f"{doc.get('content', '')}\n"
            )
    else:
        knowledge_block = "(No knowledge documents retrieved)"

    return f"""You are an environmental data AI assistant for the FLUXX / QUDRACOPTER system.
Your task is to interpret the user's question using ONLY the supplied evidence below.

CRITICAL GROUNDING RULES:
1. NEVER invent, guess, or hallucinate sensor values, coordinates, or mission statistics.
2. ONLY use values that appear in RETRIEVED DATABASE EVIDENCE.
3. Clearly separate:
   - FACTS: Direct measurements from the database.
   - INFERENCES: Conclusions derived from the data (label these as inferences, not facts).
   - RECOMMENDATIONS: Suggested operational actions.
   - SIMULATIONS: Results from the response simulator, explicitly labeled as "Simulated" and not real data.
4. If data is insufficient, say so explicitly. Do not guess.
5. When referencing a measurement, use language such as:
   "According to the FLUXX measurements..."
   "The available mission data shows..."
   "Based on the retrieved reading..."
6. When citing a standard, use language such as:
   "The retrieved reference states..."
   "According to CPCB standards..."
   "The environmental reference indicates..."
7. Never manufacture a citation. Only cite documents that appear in KNOWLEDGE EVIDENCE.

RESPOND STRICTLY in the following JSON format (no markdown, no extra text):
{{
  "answer": "1-3 sentence natural language summary grounded in evidence",
  "facts": ["Fact 1 from database", "Fact 2 from database"],
  "inferences": ["Inference 1 derived from facts"],
  "recommendations": ["Recommended action 1"]
}}

USER QUESTION:
{ctx.query}

MISSION ID:
{ctx.mission_id}

RETRIEVED DATABASE EVIDENCE:
{data_block}

RETRIEVED KNOWLEDGE EVIDENCE:
{knowledge_block}
"""


# ---------------------------------------------------------------------------
# Deterministic fallback generator
# ---------------------------------------------------------------------------

def _fallback_no_mission() -> GroundedResponse:
    return GroundedResponse(
        answer="The specified mission was not found in the FLUXX database. Please verify the mission ID.",
        facts=[],
        inferences=[],
        recommendations=["Verify the mission ID and ensure data has been uploaded."],
        confidence="low",
        confidence_score=0.1,
        knowledge_sources=[],
    )


def _fallback_no_data(ctx: GroundedContext) -> GroundedResponse:
    return GroundedResponse(
        answer="Insufficient sensor data is available for this mission to answer the question.",
        facts=[],
        inferences=[],
        recommendations=["Ensure sensor readings have been uploaded for this mission."],
        confidence="low",
        confidence_score=0.3,
        knowledge_sources=_extract_sources(ctx),
    )


def _fallback_unknown(ctx: GroundedContext) -> GroundedResponse:
    return GroundedResponse(
        answer=(
            "I cannot currently answer this type of question. "
            "FLUXX can answer questions about: AQI levels, PM2.5, PM10, "
            "pollution hotspots, altitude profiles, trends, mission summaries, and historical comparisons."
        ),
        facts=[],
        inferences=[],
        recommendations=["Try asking about AQI, PM2.5, PM10, hotspots, or mission comparisons."],
        confidence="low",
        confidence_score=0.2,
        knowledge_sources=[],
    )


def _extract_sources(ctx: GroundedContext) -> List[Dict[str, Any]]:
    """Extract compact source references from knowledge evidence."""
    sources = []
    for doc in ctx.knowledge_evidence:
        sources.append({
            "document_id": doc.get("document_id", ""),
            "title": doc.get("title", ""),
            "category": doc.get("category", ""),
            "source": doc.get("source", ""),
            "source_reference": doc.get("source_reference", ""),
        })
    return sources


def _rule_based_fallback(ctx: GroundedContext) -> GroundedResponse:
    """
    Deterministic rule-based answer generator.
    Uses ONLY values present in ctx.data_evidence and ctx.knowledge_evidence.
    """
    intent = ctx.intent
    evidence = ctx.data_evidence
    sources = _extract_sources(ctx)
    conf_label, conf_score = _score_confidence(ctx)

    facts: List[str] = []
    inferences: List[str] = []
    recommendations: List[str] = []
    answer = ""

    # ── No data ──────────────────────────────────────────────────────────────
    if not evidence and intent not in ["environmental_explanation", "unknown"]:
        return _fallback_no_data(ctx)

    # ── Intent-specific generation ────────────────────────────────────────────
    if intent == "highest_aqi":
        ev = evidence[0]
        aqi = ev.get("aqi")
        cat = ev.get("aqi_category", "Unknown")
        lat, lng = ev.get("latitude"), ev.get("longitude")
        facts.append(f"The highest AQI recorded in this mission was {aqi} ({cat}) "
                     f"at latitude {lat:.5f}, longitude {lng:.5f}.")
        if aqi and aqi > 200:
            inferences.append("An AQI above 200 is classified as Very Poor/Unhealthy and indicates significant health risk.")
            recommendations.append("Investigate the emission source near this coordinate immediately.")
        elif aqi and aqi > 100:
            inferences.append("An AQI above 100 may affect sensitive groups (children, elderly, respiratory patients).")
            recommendations.append("Increase sampling density around this zone.")
        else:
            inferences.append("AQI is within acceptable bounds at this location.")
            recommendations.append("Continue routine monitoring.")
        answer = f"According to the FLUXX measurements, the highest AQI was {aqi} ({cat}) near {lat:.4f}, {lng:.4f}."

    elif intent in ["highest_pm25", "data_plus_knowledge"]:
        ev = evidence[0]
        val = ev.get("pm25")
        lat, lng = ev.get("latitude"), ev.get("longitude")
        facts.append(f"The highest PM2.5 recorded was {val} µg/m³ near latitude {lat:.5f}, longitude {lng:.5f}.")
        # Look for threshold standard in knowledge
        threshold_note = ""
        for doc in ctx.knowledge_evidence:
            if "pm25" in doc.get("tags", []) and "threshold" in doc.get("tags", []):
                threshold_note = " According to CPCB standards, 24-hour PM2.5 above 60 µg/m³ exceeds the national ambient standard."
                break
        if val and val > 120:
            inferences.append(f"PM2.5 of {val} µg/m³ falls in the 'Very Poor' category (CPCB: 121–250 µg/m³ = AQI 301–400).{threshold_note}")
            recommendations.append("This level warrants immediate source identification. Perform targeted follow-up flight.")
        elif val and val > 60:
            inferences.append(f"PM2.5 of {val} µg/m³ exceeds the CPCB 24-hour standard of 60 µg/m³.{threshold_note}")
            recommendations.append("Increase monitoring frequency and investigate local emission sources.")
        elif val:
            inferences.append(f"PM2.5 of {val} µg/m³ is within or near the CPCB acceptable range.{threshold_note}")
            recommendations.append("Continue baseline monitoring.")
        answer = f"According to the FLUXX measurements, the highest PM2.5 was {val} µg/m³ near {lat:.4f}, {lng:.4f}."

    elif intent == "highest_pm10":
        ev = evidence[0]
        val = ev.get("pm10")
        lat, lng = ev.get("latitude"), ev.get("longitude")
        facts.append(f"The highest PM10 recorded was {val} µg/m³ near latitude {lat:.5f}, longitude {lng:.5f}.")
        if val and val > 250:
            inferences.append(f"PM10 of {val} µg/m³ is classified as Moderate/Unhealthy (CPCB: >250 µg/m³ = AQI >200).")
            recommendations.append("Inspect the area for construction, dust, or industrial activity.")
        elif val and val > 100:
            inferences.append(f"PM10 of {val} µg/m³ exceeds the CPCB 24-hour standard of 100 µg/m³.")
            recommendations.append("Investigate potential fugitive dust or coarse particle sources.")
        else:
            inferences.append("PM10 is within the CPCB acceptable range.")
            recommendations.append("Continue routine monitoring.")
        answer = f"According to the FLUXX measurements, the highest PM10 was {val} µg/m³ near {lat:.4f}, {lng:.4f}."

    elif intent in ["average_aqi", "average_pm25", "average_pm10"]:
        ev = evidence[0]
        val = ev.get("average_value")
        metric = ev.get("metric", "AQI").upper()
        count = ev.get("readings_used", 0)
        facts.append(f"The available mission data shows an average {metric} of {val} based on {count} readings.")
        inferences.append(f"This average represents the background pollution level for this mission area.")
        recommendations.append("Compare with previous surveys to identify temporal trends.")
        answer = f"The available mission data shows an average {metric} of {val} (from {count} readings)."

    elif intent == "pollution_by_altitude":
        if evidence:
            worst = evidence[0]
            alt_range = worst.get("altitude_range")
            avg_aqi = worst.get("average_aqi")
            facts.append(f"Highest average AQI ({avg_aqi}) was found in the {alt_range} altitude band.")
            for b in evidence:
                facts.append(f"Altitude {b.get('altitude_range')}: AQI={b.get('average_aqi')}, PM2.5={b.get('average_pm25')} µg/m³ ({b.get('readings_used')} readings).")
            inferences.append(f"Particulate concentrations peak in the {alt_range} band, which may indicate an atmospheric inversion layer.")
            recommendations.append(f"Perform additional vertical profiling around the {alt_range} band.")
            answer = f"The available mission data shows highest pollution in the {alt_range} altitude band (avg AQI {avg_aqi})."
        else:
            answer = "No altitude-stratified data available for this mission."

    elif intent == "pollution_trend":
        ev = evidence[0]
        init = ev.get("initial_half_average_aqi")
        second = ev.get("second_half_average_aqi")
        readings = ev.get("readings_used", 0)
        facts.append(f"First half of mission average AQI: {init}. Second half average AQI: {second}. Based on {readings} readings.")
        diff = (second or 0) - (init or 0)
        if diff > 5:
            inferences.append("Air quality deteriorated during the mission — the second half shows higher pollution than the first half.")
            recommendations.append("Investigate whether the drone was approaching a pollution source or meteorological conditions changed.")
            answer = f"The available mission data shows an increasing pollution trend (AQI {init} → {second})."
        elif diff < -5:
            inferences.append("Air quality improved during the mission — the second half shows lower pollution than the first half.")
            recommendations.append("Verify whether improvement is sustained in follow-up flights.")
            answer = f"The available mission data shows a decreasing pollution trend (AQI {init} → {second})."
        else:
            inferences.append("Pollution levels remained relatively stable throughout the mission.")
            recommendations.append("Standard monitoring intervals are sufficient.")
            answer = f"The available mission data shows stable pollution levels throughout the mission (AQI {init} → {second})."

    elif intent in ["hotspot_analysis", "highest_hotspot", "hotspot_count"]:
        count = len(evidence)
        facts.append(f"The available mission data shows {count} pollution hotspot(s) detected.")
        if evidence:
            worst = evidence[0]
            lat, lng = worst.get("latitude"), worst.get("longitude")
            sev = worst.get("severity")
            peak = worst.get("peak_aqi")
            facts.append(f"Most severe hotspot: {sev} severity, peak AQI {peak}, at {lat:.5f}, {lng:.5f}.")
            for h in evidence[1:3]:
                facts.append(f"Hotspot at {h.get('latitude'):.5f}, {h.get('longitude'):.5f}: {h.get('severity')} severity, peak AQI {h.get('peak_aqi')}.")
            inferences.append(f"The presence of {count} hotspot(s) suggests localized emission sources within the surveyed area.")
            recommendations.append(f"Prioritize investigation of the {sev} severity hotspot near {lat:.4f}, {lng:.4f}.")
            answer = f"According to the FLUXX measurements, {count} hotspot(s) were detected. The most severe is '{sev}' with a peak AQI of {peak}."
        else:
            answer = "No hotspots were detected in this mission."

    elif intent == "recommendation":
        count = len(evidence)
        facts.append(f"The available mission data shows {count} pollution hotspot(s) detected.")
        if evidence:
            worst = evidence[0]
            lat, lng = worst.get("latitude"), worst.get("longitude")
            sev = worst.get("severity")
            inferences.append(f"Hotspots indicate severe pollution requiring further characterization.")
            recommendations.append(f"Perform a targeted boundary mapping flight near {lat:.4f}, {lng:.4f}.")
            answer = f"Based on {count} detected hotspot(s), it is recommended to perform targeted surveys, prioritizing the '{sev}' severity zone."
        else:
            inferences.append("No hotspots or severe pollution gradients were detected.")
            recommendations.append("Continue standard baseline survey patterns.")
            answer = "Based on current data, baseline monitoring is sufficient. No targeted sampling is recommended."

    elif intent == "INTENT_RECOMMENDATION":
        answer = "Based on the telemetry data, I recommend viewing the Environmental Decision Panel for adaptive sampling zones and hotspot boundaries."
    elif intent == "INTENT_SIMULATION":
        answer = "The simulated response indicates an improvement in spatial coverage and understanding. This is a simulation and not real sensor data."
        facts.append("Simulated metrics show improved sampling density.")
        recommendations.append("Execute the actual mission to verify these models.")

    elif intent == "mission_summary":
        if evidence:
            ev = evidence[0]
            mid = ev.get("mission_id", "this mission")
            total = ev.get("total_readings", 0)
            avg_aqi = ev.get("average_aqi")
            hotspots = ev.get("hotspots_detected", 0)
            facts.append(f"Mission {mid} recorded {total} sensor readings.")
            if avg_aqi:
                facts.append(f"Average AQI across the mission was {avg_aqi}.")
            if hotspots:
                facts.append(f"{hotspots} pollution hotspot(s) were detected during this mission.")
            inferences.append("The survey provides a spatial snapshot of air quality for this area.")
            recommendations.append("Review hotspot locations and plan targeted follow-up flights.")
            answer = f"Mission {mid}: {total} readings, average AQI {avg_aqi}, {hotspots} hotspot(s) detected."
        else:
            answer = "No mission summary data is available."

    elif intent == "mission_comparison":
        ev = evidence[0]
        curr_id = ev.get("current_mission_id", "current mission")
        prev_id = ev.get("previous_mission_id", "previous mission")
        curr_aqi = ev.get("current_average_aqi")
        prev_aqi = ev.get("previous_average_aqi")
        pct = ev.get("percentage_change")
        facts.append(f"Mission {curr_id} average AQI: {curr_aqi}. Mission {prev_id} average AQI: {prev_aqi}.")
        if pct and pct > 10:
            inferences.append(f"Air quality worsened between surveys — AQI increased by {pct}% from {prev_id} to {curr_id}.")
            recommendations.append("Schedule a rapid follow-up survey and investigate emission sources.")
            answer = f"Comparing mission {curr_id} vs {prev_id}: pollution increased by {pct}% (AQI {prev_aqi} → {curr_aqi})."
        elif pct and pct < -10:
            inferences.append(f"Air quality improved between surveys — AQI decreased by {abs(pct)}% from {prev_id} to {curr_id}.")
            recommendations.append("Continue current environmental protocols.")
            answer = f"Comparing mission {curr_id} vs {prev_id}: pollution decreased by {abs(pct)}% (AQI {prev_aqi} → {curr_aqi})."
        else:
            inferences.append(f"Air quality remained stable between {prev_id} and {curr_id} surveys.")
            recommendations.append("Maintain baseline flight schedules.")
            answer = f"Pollution levels are stable comparing mission {curr_id} with {prev_id} (AQI {prev_aqi} → {curr_aqi})."

    elif intent == "environmental_explanation":
        if ctx.knowledge_evidence:
            doc = ctx.knowledge_evidence[0]
            facts.append(f"[{doc.get('source')}]: {doc.get('content', '')[:300]}...")
            inferences.append("This is approved reference information, not a measurement from the FLUXX database.")
            recommendations.append("Cross-reference with actual FLUXX mission data to assess applicability.")
            answer = (
                f"According to the retrieved reference ({doc.get('source')}): "
                f"{doc.get('content', '')[:200]}..."
            )
        else:
            answer = "No relevant environmental knowledge was found for this question."

    elif intent == "unknown":
        return _fallback_unknown(ctx)

    else:
        facts.append(f"Retrieved {len(evidence)} data point(s) from the FLUXX database.")
        inferences.append("General database query processed.")
        recommendations.append("Try a more specific question about AQI, PM2.5, hotspots, or trends.")
        answer = "I cannot currently answer this type of question. Please ask about specific measurements or mission data."

    return GroundedResponse(
        answer=answer,
        facts=facts,
        inferences=inferences,
        recommendations=recommendations,
        confidence=conf_label,
        confidence_score=conf_score,
        knowledge_sources=sources,
    )


# ---------------------------------------------------------------------------
# Gemini-powered generator
# ---------------------------------------------------------------------------

def _gemini_generate(ctx: GroundedContext) -> Optional[GroundedResponse]:
    """Try Gemini generation. Returns None on failure."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GENAI or not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = _build_prompt(ctx)
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        data = json.loads(text)
        conf_label, conf_score = _score_confidence(ctx)
        return GroundedResponse(
            answer=data.get("answer", ""),
            facts=data.get("facts", []),
            inferences=data.get("inferences", []),
            recommendations=data.get("recommendations", []),
            confidence=conf_label,
            confidence_score=conf_score,
            knowledge_sources=_extract_sources(ctx),
        )
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Public generator
# ---------------------------------------------------------------------------

class GroundedGenerator:
    """
    Generates a grounded answer from a GroundedContext.
    Tries Gemini first; falls back to deterministic rule-based generation.
    """

    def generate(self, ctx: GroundedContext) -> GroundedResponse:
        # Fast paths
        if not ctx.mission_exists:
            return _fallback_no_mission()
        if ctx.intent == "unknown":
            return _fallback_unknown(ctx)

        # Try Gemini
        gemini_response = _gemini_generate(ctx)
        if gemini_response:
            return gemini_response

        # Deterministic fallback
        return _rule_based_fallback(ctx)


_default_generator = GroundedGenerator()


def get_generator() -> GroundedGenerator:
    return _default_generator
