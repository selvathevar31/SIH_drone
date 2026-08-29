import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.intelligence import classify_pollution_severity, calculate_priority_score, classify_priority, analyze_trend, get_recommendation

def test_classify_pollution_severity():
    # Good
    assert classify_pollution_severity(50)["category"] == "Good"
    assert classify_pollution_severity(50)["severity_level"] == 0
    # Satisfactory
    assert classify_pollution_severity(51)["category"] == "Satisfactory"
    assert classify_pollution_severity(100)["category"] == "Satisfactory"
    # Moderately Polluted
    assert classify_pollution_severity(101)["category"] == "Moderately Polluted"
    assert classify_pollution_severity(200)["category"] == "Moderately Polluted"
    # Poor
    assert classify_pollution_severity(201)["category"] == "Poor"
    # Very Poor
    assert classify_pollution_severity(301)["category"] == "Very Poor"
    # Severe
    assert classify_pollution_severity(401)["category"] == "Severe"

def test_calculate_priority_score():
    # Extreme case: max AQI, max persistence, max concentration
    score_max = calculate_priority_score(aqi=500, distinct_surveys=5, average_aqi=500, peak_aqi=500)
    assert score_max == 100.0 # 60 + 25 + 15
    
    # Low case: 0 AQI, 1 survey, 0 concentration
    score_min = calculate_priority_score(aqi=0, distinct_surveys=1, average_aqi=0, peak_aqi=0)
    assert score_min == 5.0 # (0 + 1/5*25 + 0)

def test_classify_priority():
    assert classify_priority(10) == "LOW"
    assert classify_priority(30) == "MEDIUM"
    assert classify_priority(60) == "HIGH"
    assert classify_priority(80) == "CRITICAL"

def test_analyze_trend():
    # Worsening: 82 -> 96 -> 112 -> 137
    # old_avg = (82+96+112)/3 = 96.66
    # recent = 137
    # change = (137-96.66)/96.66 * 100 = 41.7%
    res_worse = analyze_trend([82.0, 96.0, 112.0, 137.0])
    assert res_worse["trend"] == "WORSENING"
    
    # Improving: 145 -> 120 -> 91
    # old_avg = (145+120)/2 = 132.5
    # recent = 91
    # change = (91-132.5)/132.5 * 100 = -31.3%
    res_improve = analyze_trend([145.0, 120.0, 91.0])
    assert res_improve["trend"] == "IMPROVING"
    
    # Stable: 100 -> 102
    res_stable = analyze_trend([100.0, 102.0])
    assert res_stable["trend"] == "STABLE"
    
    # Insufficient Data: 112
    res_insuff = analyze_trend([112.0])
    assert res_insuff["trend"] == "INSUFFICIENT_DATA"

def test_get_recommendation():
    # Persistent + Worsening + High/Critical -> Prioritize immediate investigation
    assert get_recommendation("HIGH", "WORSENING", True) == "Prioritize immediate investigation and repeat sampling."
    assert get_recommendation("CRITICAL", "WORSENING", True) == "Prioritize immediate investigation and repeat sampling."
    
    # Persistent + Improving -> Continue monitoring to confirm sustained improvement.
    assert get_recommendation("MEDIUM", "IMPROVING", True) == "Continue monitoring to confirm sustained improvement."
    
    # General CRITICAL
    assert get_recommendation("CRITICAL", "STABLE", False) == "Immediate investigation and repeat sampling recommended."
