import re
from typing import Dict, Any, Tuple, List

# Intent constants (canonical names)
INTENT_DATA_PLUS_KNOWLEDGE = "data_plus_knowledge"
INTENT_ENVIRONMENTAL_EXPLANATION = "environmental_explanation"
INTENT_MISSION_COMPARISON = "mission_comparison"
INTENT_MISSION_SUMMARY = "mission_summary"
INTENT_POLLUTION_TREND = "pollution_trend"
INTENT_POLLUTION_BY_ALTITUDE = "pollution_by_altitude"
INTENT_HOTSPOT_ANALYSIS = "hotspot_analysis"
INTENT_RECOMMENDATION = "recommendation"
INTENT_HIGHEST_AQI = "highest_aqi"
INTENT_AVERAGE_AQI = "average_aqi"
INTENT_HIGHEST_PM25 = "highest_pm25"
INTENT_AVERAGE_PM25 = "average_pm25"
INTENT_HIGHEST_PM10 = "highest_pm10"
INTENT_AVERAGE_PM10 = "average_pm10"
INTENT_UNKNOWN = "unknown"

# Keywords that indicate the user wants INTERPRETATION (hybrid path)
_INTERPRETATION_KEYWORDS = [
    "dangerous", "concerning", "safe", "healthy", "unhealthy",
    "should i worry", "is it bad", "is it good", "should we be",
    "is this", "how bad", "how good", "risk", "harmful",
    "exceed", "within limit", "above standard", "normal",
]

# Keywords that indicate a pure knowledge question
_KNOWLEDGE_KEYWORDS = [
    "what does", "what is", "what are", "why does", "why is",
    "how does", "how do", "explain", "meaning of", "definition",
    "significance", "health effects", "health impact",
    "tell me about", "describe",
]

# Environmental domain terms — must be present alongside a knowledge keyword
# to route to environmental_explanation (prevents 'what is the weather' false matches)
_ENVIRONMENTAL_DOMAIN_TERMS = [
    "pm", "pm2.5", "pm25", "pm10", "aqi", "air quality", "pollution",
    "particulate", "particle", "atmosphere", "atmospheric", "hotspot",
    "monitoring", "environment", "environmental", "emission", "exhaust",
    "inversion", "altitude", "sensor", "measurement", "co2", "nox",
]


def detect_intent_and_extract_params(question: str) -> Tuple[str, Dict[str, Any]]:
    """
    Deterministically route natural language queries to intents without using an LLM.
    Returns (intent, params_dict).

    Intent hierarchy (checked in order):
    1. Environmental explanation (pure knowledge)
    2. DATA_PLUS_KNOWLEDGE (hybrid - measurement + interpretation)
    3. Mission comparison
    4. PM2.5 queries
    5. PM10 queries
    6. AQI / pollution queries
    7. Hotspot queries
    8. Altitude queries
    9. Trend queries
    10. Mission summary
    11. Location-specific queries
    12. Environmental explanation (broader)
    13. Fallback highest AQI
    14. Unknown
    """
    q = question.lower().strip()
    params: Dict[str, Any] = {}

    # 1. Pure environmental explanation (knowledge-only)
    if any(k in q for k in _KNOWLEDGE_KEYWORDS):
        is_environmental_topic = any(t in q for t in _ENVIRONMENTAL_DOMAIN_TERMS)
        # Exclude questions asking for specific numeric query types
        has_data_indicators = any(k in q for k in ["highest", "maximum", "max", "worst", "average", "avg"])
        if is_environmental_topic and not has_data_indicators:
            return INTENT_ENVIRONMENTAL_EXPLANATION, params

    # 2. DATA_PLUS_KNOWLEDGE: measurement reference + interpretation question
    has_measurement = any(k in q for k in ["pm2.5", "pm25", "pm10", "aqi", "pollution", "hotspot"])
    has_interp = any(k in q for k in _INTERPRETATION_KEYWORDS)
    if has_measurement and has_interp:
        return INTENT_DATA_PLUS_KNOWLEDGE, params

    # Helper function for word boundary matching of short terms
    def matches_keywords(text: str, keywords: List[str]) -> bool:
        for kw in keywords:
            if kw == "mean" or kw == "avg":
                if re.search(rf"\b{re.escape(kw)}\b", text):
                    return True
            else:
                if kw in text:
                    return True
        return False

    # 3. Mission comparison
    if any(k in q for k in ["compare", "comparison", "compared with the previous", "previous survey", "previous mission"]):
        return INTENT_MISSION_COMPARISON, params

    # 4. Highest PM2.5
    if "pm2.5" in q or "pm25" in q:
        if any(k in q for k in ["highest", "maximum", "max", "worst"]):
            return INTENT_HIGHEST_PM25, params
        elif matches_keywords(q, ["average", "avg", "mean"]):
            return INTENT_AVERAGE_PM25, params

    # 5. Highest PM10
    if "pm10" in q:
        if any(k in q for k in ["highest", "maximum", "max", "worst"]):
            return INTENT_HIGHEST_PM10, params
        elif matches_keywords(q, ["average", "avg", "mean"]):
            return INTENT_AVERAGE_PM10, params

    # 6. AQI / pollution queries
    if any(k in q for k in ["aqi", "pollution"]):
        if any(k in q for k in ["highest", "maximum", "max", "worst", "peak"]):
            return INTENT_HIGHEST_AQI, params
        elif matches_keywords(q, ["average", "avg", "mean"]):
            return INTENT_AVERAGE_AQI, params

    # Catch-all averages
    if (("pm2.5" in q or "pm25" in q) and matches_keywords(q, ["average", "avg", "mean"])):
        return INTENT_AVERAGE_PM25, params
    if "pm10" in q and matches_keywords(q, ["average", "avg", "mean"]):
        return INTENT_AVERAGE_PM10, params
    if any(k in q for k in ["aqi", "pollution"]) and matches_keywords(q, ["average", "avg", "mean"]):
        return INTENT_AVERAGE_AQI, params

    # 7. Hotspot queries
    if "hotspot" in q:
        if any(k in q for k in ["highest", "worst", "peak", "max"]):
            return "highest_hotspot", params
        elif any(k in q for k in ["how many", "number of", "count", "amount", "detected", "identified"]):
            return "hotspot_count", params
        else:
            return INTENT_HOTSPOT_ANALYSIS, params

    # 8. Altitude
    if any(k in q for k in ["altitude", "height", "vertical"]):
        return INTENT_POLLUTION_BY_ALTITUDE, params

    # 9. Trend
    if any(k in q for k in ["trend", "increase", "decrease", "change", "worse", "better"]):
        return INTENT_POLLUTION_TREND, params

    # 10. Mission summary
    if any(k in q for k in ["summary", "summarize", "what happened", "overview"]):
        return INTENT_MISSION_SUMMARY, params

    # 10.5 Recommendation / Simulation
    if any(k in q for k in ["recommend", "next step", "where should", "sample next", "decision"]):
        return INTENT_RECOMMENDATION, params
    if any(k in q for k in ["simulate", "simulation", "projected", "response plan"]):
        return INTENT_SIMULATION, params

    # 11. Location-specific
    if any(k in q for k in ["where", "location", "area"]):
        if any(k in q for k in ["cleanest", "lowest"]):
            return "cleanest_surveyed_area", params
        if any(k in q for k in ["highest", "maximum", "max", "worst", "peak"]):
            return INTENT_HIGHEST_AQI, params

    # 12. Broader environmental explanation
    if any(k in q for k in ["health", "significance", "matter", "important"]):
        return INTENT_ENVIRONMENTAL_EXPLANATION, params

    # 13. Fallback to highest AQI
    if any(k in q for k in ["highest", "maximum", "max", "worst", "peak"]):
        return INTENT_HIGHEST_AQI, params

    return INTENT_UNKNOWN, params
