import pytest
from unittest.mock import MagicMock
from app.services.response_analysis import calculate_metrics, calculate_effectiveness
from app.models.reading import Reading

def test_calculate_metrics():
    """Verify before/after metrics calculation."""
    readings = [
        Reading(latitude=1.0, longitude=1.0, pm25=50.0, aqi=100),
        Reading(latitude=1.0, longitude=1.0, pm25=70.0, aqi=120)
    ]
    
    metrics = calculate_metrics(readings)
    assert metrics.average_aqi == 110.0
    assert metrics.peak_aqi == 120
    assert metrics.average_pm25 == 60.0
    assert metrics.reading_count == 2
    
def test_calculate_effectiveness():
    """Verify effectiveness classification based on metrics improvement."""
    from app.schemas.response import MetricsBlock
    
    # Highly effective (better coverage/density, lower average AQI due to better bounding)
    before = MetricsBlock(
        average_aqi=150.0, peak_aqi=200, average_pm25=75.0, peak_pm25=100.0,
        spatial_coverage_km2=0.5, reading_count=50, hotspot_count=1
    )
    
    after = MetricsBlock(
        average_aqi=120.0, peak_aqi=200, average_pm25=60.0, peak_pm25=100.0,
        spatial_coverage_km2=1.5, reading_count=200, hotspot_count=1
    )
    
    eff = calculate_effectiveness(before, after)
    assert eff.improvement_score > 50
    assert eff.classification in ["HIGHLY EFFECTIVE", "EFFECTIVE"]
    
def test_calculate_effectiveness_ineffective():
    """Verify ineffective classification when metrics degrade."""
    from app.schemas.response import MetricsBlock
    
    before = MetricsBlock(
        average_aqi=100.0, peak_aqi=150, average_pm25=50.0, peak_pm25=75.0,
        spatial_coverage_km2=1.0, reading_count=100, hotspot_count=1
    )
    
    after = MetricsBlock(
        average_aqi=105.0, peak_aqi=150, average_pm25=52.0, peak_pm25=75.0,
        spatial_coverage_km2=1.0, reading_count=100, hotspot_count=1
    )
    
    eff = calculate_effectiveness(before, after)
    assert eff.improvement_score <= 10
    assert eff.classification in ["INEFFECTIVE", "MARGINAL"]
