from app.services.ai_router import detect_intent_and_extract_params

def test_highest_aqi():
    intent, params = detect_intent_and_extract_params("Where was the highest AQI detected?")
    assert intent == "highest_aqi"

def test_highest_pm25():
    intent, params = detect_intent_and_extract_params("What was the worst PM2.5 reading?")
    assert intent == "highest_pm25"

def test_average_pm10():
    intent, params = detect_intent_and_extract_params("What is the average PM10?")
    assert intent == "average_pm10"

def test_hotspot_query():
    intent, params = detect_intent_and_extract_params("Which area is the main pollution hotspot?")
    assert intent in ["highest_hotspot", "hotspot_analysis"]

def test_altitude_query():
    intent, params = detect_intent_and_extract_params("How did pollution change with altitude?")
    assert intent == "pollution_by_altitude"

def test_historical_comparison():
    intent, params = detect_intent_and_extract_params("Compare this mission with the previous survey.")
    assert intent == "mission_comparison"

def test_unknown_question():
    intent, params = detect_intent_and_extract_params("What is the speed of light?")
    # Based on fallback logic it might be unknown, or we can check the fallback
    assert intent == "unknown"
