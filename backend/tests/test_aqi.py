import pytest
from app.services.aqi import calculate_aqi, get_category_from_aqi, calculate_sub_index, PM25_BREAKPOINTS, PM10_BREAKPOINTS

def test_calculate_sub_index_pm25():
    # PM2.5 0-30 -> AQI 0-50
    assert calculate_sub_index(15.0, PM25_BREAKPOINTS) == 25
    # PM2.5 31-60 -> AQI 51-100
    assert calculate_sub_index(45.5, PM25_BREAKPOINTS) == 76

def test_calculate_sub_index_pm10():
    # PM10 101-250 -> AQI 101-200
    assert calculate_sub_index(150.0, PM10_BREAKPOINTS) == 134

def test_calculate_aqi_max_sub_index():
    # PM2.5 = 45.5 -> AQI = 76
    # PM10 = 150.0 -> AQI = 134
    # Expected overall AQI = max(76, 134) = 134 -> Moderately Polluted
    result = calculate_aqi(pm25=45.5, pm10=150.0)
    assert result["aqi"] == 134
    assert result["category"] == "Moderately Polluted"

def test_calculate_aqi_missing_values():
    result = calculate_aqi(pm25=None, pm10=150.0)
    assert result["aqi"] == 134

    result2 = calculate_aqi(pm25=None, pm10=None)
    assert result2["aqi"] is None

def test_calculate_aqi_negative_values():
    result = calculate_aqi(pm25=-10.0, pm10=50.0)
    # pm25 negative ignored, pm10=50 -> AQI 50 (Good)
    assert result["aqi"] == 50
    assert result["category"] == "Good"

def test_extreme_values():
    result = calculate_aqi(pm25=500.0, pm10=600.0)
    assert result["aqi"] >= 401
    assert result["category"] == "Severe"
