import os
import json
from typing import Dict, Any, List, Tuple
from app.core.config import settings

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def generate_grounded_response(
    question: str, 
    mission_id: str, 
    intent: str, 
    evidence: List[Dict[str, Any]], 
    knowledge: str
) -> Tuple[str, List[str], List[str], List[str]]:
    """
    Generate an AI response.
    Returns (answer, facts, inferences, recommendations).
    Strictly follows the grounding rules and avoids fabricated data.
    """
    if not evidence and intent not in ["environmental_explanation", "unknown", "mission_summary"]:
        empty_answer = "Insufficient sensor data is available to answer this question."
        return empty_answer, [], [], []
        
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Force fallback if HAS_GENAI is False or GEMINI_API_KEY is not set
    if not HAS_GENAI or not api_key:
        return _generate_fallback(intent, evidence)
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # We ask the model to output a strict JSON structure containing the answer, facts, inferences, and recommendations
    prompt = f"""
You are an environmental data AI assistant for the QUDRACOPTER / FLUXX system.
Your task is to analyze the user's question, the retrieved database evidence, and static knowledge, and return a strict JSON response.

CRITICAL RULES:
1. NEVER invent, hallucinate, or guess sensor readings, coordinates, or values. Only use values that exist in the supplied RETRIEVED EVIDENCE.
2. Distinguish clearly between:
   - FACTS: Direct measurements from the database.
   - INFERENCES: Conclusions derived from measurements (do not present as facts).
   - RECOMMENDATIONS: Suggested actions (do not present as facts).
3. If evidence is empty and the question relates to mission data, output:
   {{"answer": "Insufficient sensor data is available to answer this question.", "facts": [], "inferences": [], "recommendations": []}}
4. Respond only in valid JSON matching this schema:
   {{
     "answer": "A concise natural language summary combining the key facts (1-2 sentences)",
     "facts": ["Fact 1", "Fact 2"],
     "inferences": ["Inference 1"],
     "recommendations": ["Recommendation 1"]
   }}

USER QUESTION:
{question}

MISSION ID:
{mission_id}

RETRIEVED EVIDENCE:
{json.dumps(evidence)}

ENVIRONMENTAL KNOWLEDGE:
{knowledge}
"""
    try:
        response = model.generate_content(prompt)
        res_text = response.text.strip()
        
        # Clean potential markdown wrapping in LLM response
        if res_text.startswith("```json"):
            res_text = res_text[7:]
        if res_text.endswith("```"):
            res_text = res_text[:-3]
        res_text = res_text.strip()
        
        data = json.loads(res_text)
        return (
            data.get("answer", ""),
            data.get("facts", []),
            data.get("inferences", []),
            data.get("recommendations", [])
        )
    except Exception as e:
        # Graceful fallback on parse errors or API call failure
        return _generate_fallback(intent, evidence)

def _generate_fallback(intent: str, evidence: List[Dict[str, Any]]) -> Tuple[str, List[str], List[str], List[str]]:
    """
    Completely dynamic fallback generator.
    Generates facts, inferences, and recommendations using only the database evidence.
    NO hardcoded or fabricated readings.
    """
    if not evidence:
        if intent in ["unknown"]:
            ans = "I cannot currently answer this type of question. Please ask about AQI, PM2.5, PM10, hotspots, trends, altitude, or mission comparisons."
        else:
            ans = "Insufficient sensor data is available to answer this question."
        return ans, [], [], []

        
    facts = []
    inferences = []
    recommendations = []
    ans = ""
    
    if intent == "highest_aqi":
        ev = evidence[0]
        aqi = ev.get("aqi")
        aqi_cat = ev.get("aqi_category", "Unknown")
        lat = ev.get("latitude")
        lng = ev.get("longitude")
        
        facts.append(f"The highest AQI recorded during this mission was {aqi} ({aqi_cat}) detected near latitude {lat:.5f}, longitude {lng:.5f}.")
        if aqi and aqi > 100:
            inferences.append("Measurements indicate a localized high-pollution zone.")
            recommendations.append("Consider increasing sampling density around this zone.")
        else:
            inferences.append("Air quality remains within normal bounds at this location.")
            recommendations.append("Continue routine environmental monitoring.")
        ans = facts[0]
        
    elif intent == "highest_pm25":
        ev = evidence[0]
        val = ev.get("pm25")
        lat = ev.get("latitude")
        lng = ev.get("longitude")
        
        facts.append(f"The highest PM2.5 concentration recorded during this mission was {val} µg/m³ near latitude {lat:.5f}, longitude {lng:.5f}.")
        if val and val > settings.PM25_THRESHOLD:
            inferences.append("PM2.5 levels are elevated, suggesting localized combustion source presence.")
            recommendations.append("Recommend executing a localized spatial grid to map the bounds of this fine particle plume.")
        else:
            inferences.append("Fine particulate concentration is low.")
            recommendations.append("Continue baseline survey.")
        ans = facts[0]
        
    elif intent == "highest_pm10":
        ev = evidence[0]
        val = ev.get("pm10")
        lat = ev.get("latitude")
        lng = ev.get("longitude")
        
        facts.append(f"The highest PM10 concentration recorded during this mission was {val} µg/m³ near latitude {lat:.5f}, longitude {lng:.5f}.")
        if val and val > settings.PM10_THRESHOLD:
            inferences.append("PM10 levels are elevated, possibly indicating fugitive dust or coarse particles.")
            recommendations.append("Recommend inspecting coordinates for ground dust or construction activity.")
        else:
            inferences.append("Coarse particulate concentration is low.")
            recommendations.append("Continue baseline survey.")
        ans = facts[0]
        
    elif intent in ["average_aqi", "average_pm25", "average_pm10"]:
        ev = evidence[0]
        val = ev.get("average_value")
        metric = ev.get("metric", "aqi").upper()
        count = ev.get("readings_used", 0)
        
        facts.append(f"The average {metric} recorded during this mission was {val} based on {count} readings.")
        inferences.append(f"The average {metric} indicates the background pollution baseline for this mission.")
        recommendations.append("Maintain background monitoring flights to track baseline shifts over time.")
        ans = facts[0]
        
    elif intent == "pollution_by_altitude":
        facts.append("Altitude analysis shows the following averaged AQI values per band:")
        for idx, b in enumerate(evidence):
            facts.append(f"Band {b.get('altitude_range')}: AQI={b.get('average_aqi')}, PM2.5={b.get('average_pm25')} µg/m³ ({b.get('readings_used')} readings).")
            
        # Try to find worst band
        worst_band = evidence[0] if evidence else None
        if worst_band:
            inferences.append(f"Particulate concentrations are highest in the {worst_band.get('altitude_range')} band.")
            recommendations.append(f"Focus additional monitoring layers around the {worst_band.get('altitude_range')} vertical band to locate inversion layers.")
        ans = f"Pollution was highest in the {worst_band.get('altitude_range')} band, averaging {worst_band.get('average_aqi')} AQI." if worst_band else "No altitude data available."
        
    elif intent == "pollution_trend":
        ev = evidence[0]
        facts.append(f"Initial half average AQI: {ev.get('initial_half_average_aqi')}, Second half average AQI: {ev.get('second_half_average_aqi')}.")
        
        diff = ev.get('second_half_average_aqi', 0) - ev.get('initial_half_average_aqi', 0)
        if diff > 5.0:
            inferences.append("Air pollution values show an increasing trend over the course of the mission.")
            recommendations.append("Increase sampling density or perform a follow-up flight to check if the trend continues rising.")
            ans = "Pollution values are increasing."
        elif diff < -5.0:
            inferences.append("Air pollution values show a decreasing trend over the course of the mission.")
            recommendations.append("Continue monitoring to verify if clean-up is sustained.")
            ans = "Pollution values are decreasing."
        else:
            inferences.append("Air pollution values remained stable throughout the mission.")
            recommendations.append("Standard monitoring intervals are sufficient.")
            ans = "Pollution values are stable."
            
    elif intent in ["hotspot_analysis", "highest_hotspot", "hotspot_count"]:
        facts.append(f"Detected {len(evidence)} total hotspots during this mission.")
        for idx, h in enumerate(evidence[:3]):
            facts.append(f"Hotspot #{idx+1}: Lat={h.get('latitude'):.5f}, Lng={h.get('longitude'):.5f}, Peak AQI={h.get('peak_aqi')} ({h.get('severity')}).")
            
        if evidence:
            inferences.append(f"Pollution concentration is clustered. The worst hotspot is classified as {evidence[0].get('severity')}.")
            recommendations.append(f"Prioritize investigation of the hotspot near coordinates {evidence[0].get('latitude'):.5f}, {evidence[0].get('longitude'):.5f}.")
        ans = f"There were {len(evidence)} hotspots detected. The most severe has a peak AQI of {evidence[0].get('peak_aqi')}." if evidence else "No hotspots detected."
        
    elif intent == "mission_comparison":
        ev = evidence[0]
        curr_id = ev.get("current_mission_id", "current mission")
        prev_id = ev.get("previous_mission_id", "previous mission")
        facts.append(f"Mission {curr_id} average AQI was {ev.get('current_average_aqi')}. Mission {prev_id} average AQI was {ev.get('previous_average_aqi')}.")
        pct = ev.get('percentage_change', 0)
        
        if pct and pct > 10.0:
            inferences.append(f"Mission {curr_id} is worse than {prev_id} (AQI increased by {pct}%).")
            recommendations.append("Schedule rapid follow-up survey to locate the cause of the pollution increase.")
            ans = f"Comparing mission {curr_id} vs {prev_id}: pollution increased by {pct}%."
        elif pct and pct < -10.0:
            inferences.append(f"Mission {curr_id} is cleaner than {prev_id} (AQI decreased by {abs(pct)}%).")
            recommendations.append("Continue current environmental protocols.")
            ans = f"Comparing mission {curr_id} vs {prev_id}: pollution decreased by {abs(pct)}%."
        else:
            inferences.append(f"Air quality is stable comparing {curr_id} with {prev_id}.")
            recommendations.append("Maintain baseline flight schedules.")
            ans = f"Pollution levels are stable comparing mission {curr_id} with {prev_id}."
    
    elif intent == "mission_summary":
        if evidence:
            ev = evidence[0]
            mid = ev.get("mission_id", "this mission")
            total = ev.get("total_readings", 0)
            avg_aqi = ev.get("average_aqi")
            hotspots = ev.get("hotspots_detected", 0)
            facts.append(f"Mission {mid} recorded {total} sensor readings.")
            if avg_aqi:
                facts.append(f"The average AQI across the mission was {avg_aqi}.")
            if hotspots:
                facts.append(f"{hotspots} pollution hotspot(s) were detected.")
            inferences.append("Environmental survey completed successfully.")
            recommendations.append("Review hotspot locations and consider follow-up targeted flights.")
            ans = f"Mission {mid} recorded {total} readings with an average AQI of {avg_aqi}. {hotspots} hotspot(s) detected."
        else:
            ans = "No mission data available to summarize."
            
    else:
        facts.append(f"Evidence retrieved consists of {len(evidence)} data points.")
        inferences.append("General database queries processed.")
        recommendations.append("Inspect the key findings and raw telemetry records.")
        ans = "I cannot currently answer this type of question. Please ask about AQI, PM2.5, PM10, hotspots, trends, or altitude analysis."
        
    return ans, facts, inferences, recommendations
