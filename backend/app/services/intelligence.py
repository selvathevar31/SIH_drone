from typing import Dict, Any, List

def classify_pollution_severity(aqi: float) -> Dict[str, Any]:
    """
    Step 7A: Reusable severity classification based on CPCB AQI.
    Returns the AQI, the textual category, and a numerical severity level (0-5)
    for use in priority algorithms.
    """
    if aqi is None:
        return {"aqi": 0, "category": "Unknown", "severity_level": 0}
        
    aqi_int = int(round(aqi))
    if aqi_int <= 50:
        return {"aqi": aqi_int, "category": "Good", "severity_level": 0}
    elif aqi_int <= 100:
        return {"aqi": aqi_int, "category": "Satisfactory", "severity_level": 1}
    elif aqi_int <= 200:
        return {"aqi": aqi_int, "category": "Moderately Polluted", "severity_level": 2}
    elif aqi_int <= 300:
        return {"aqi": aqi_int, "category": "Poor", "severity_level": 3}
    elif aqi_int <= 400:
        return {"aqi": aqi_int, "category": "Very Poor", "severity_level": 4}
    else:
        return {"aqi": aqi_int, "category": "Severe", "severity_level": 5}

def calculate_priority_score(aqi: float, distinct_surveys: int, average_aqi: float, peak_aqi: float) -> float:
    """
    Step 7B: Deterministic Priority Score combining AQI severity, persistence, and spatial concentration.
    Weights: 60% Severity, 25% Persistence, 15% Spatial Concentration.
    """
    # 1. Severity Score (Normalized 0-100)
    clamped_aqi = min(max(aqi, 0), 500)
    severity_score = (clamped_aqi / 500.0) * 100.0
    
    # 2. Persistence Score (Normalized 0-100, cap at 5 surveys)
    persistence_score = min(distinct_surveys / 5.0, 1.0) * 100.0
    
    # 3. Spatial Concentration Score (Normalized 0-100)
    # How close is the average to the peak? High ratio means consistently high pollution.
    if peak_aqi > 0:
        spatial_score = min((average_aqi / peak_aqi) * 100.0, 100.0)
    else:
        spatial_score = 0.0
        
    priority_score = (0.60 * severity_score) + (0.25 * persistence_score) + (0.15 * spatial_score)
    return round(priority_score, 1)

def classify_priority(score: float) -> str:
    """
    Step 7C: Converts 0-100 score into operational priority.
    """
    if score < 25: return "LOW"
    if score < 50: return "MEDIUM"
    if score < 75: return "HIGH"
    return "CRITICAL"

def analyze_trend(historical_aqis: List[float]) -> Dict[str, Any]:
    """
    Step 7D: Temporal Trend Analysis.
    Expects chronological list of AQI averages for distinct surveys.
    """
    if not historical_aqis or len(historical_aqis) < 2:
        return {"trend": "INSUFFICIENT_DATA", "trend_percentage": None}
        
    recent_average = historical_aqis[-1]
    old_average = sum(historical_aqis[:-1]) / len(historical_aqis[:-1])
    
    if old_average == 0:
        return {"trend": "INSUFFICIENT_DATA", "trend_percentage": None}
        
    percentage_change = ((recent_average - old_average) / old_average) * 100.0
    
    if percentage_change >= 10.0:
        trend = "WORSENING"
    elif percentage_change <= -10.0:
        trend = "IMPROVING"
    else:
        trend = "STABLE"
        
    return {
        "trend": trend,
        "trend_percentage": round(percentage_change, 1)
    }

def get_recommendation(priority: str, trend: str, is_persistent: bool) -> str:
    """
    Step 7G: Rule-based operational recommendation engine.
    """
    if is_persistent and trend == "WORSENING" and priority in ["HIGH", "CRITICAL"]:
        return "Prioritize immediate investigation and repeat sampling."
        
    if is_persistent and trend == "IMPROVING":
        return "Continue monitoring to confirm sustained improvement."
        
    if priority == "CRITICAL":
        return "Immediate investigation and repeat sampling recommended."
    elif priority == "HIGH":
        return "Prioritize ground inspection and repeat aerial sampling."
    elif priority == "MEDIUM":
        return "Continue monitoring and consider additional sampling."
    else:
        return "Continue monitoring."
