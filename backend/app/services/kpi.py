from app.schemas.kpi import (
    AirQualityStats, PollutantStats, EnvStats,
    ThresholdExceedance, AqiDistribution, DataCoverage,
    EnvironmentalAnalyticsResponse
)
from app.services.aqi import get_category_from_aqi

def _get_status_from_average_aqi(aqi: float) -> str:
    if aqi is None:
        return "UNKNOWN"
    if aqi <= 50:
        return "GOOD"
    if aqi <= 100:
        return "MODERATE"
    if aqi <= 200:
        return "ELEVATED"
    if aqi <= 300:
        return "HIGH"
    return "SEVERE"

def calculate_environmental_kpi(mission_id: str, readings: list, settings) -> EnvironmentalAnalyticsResponse:
    total_readings = len(readings)
    
    # Filter valid readings for each metric
    valid_aqi = [r.aqi for r in readings if r.aqi is not None]
    valid_pm25 = [r.pm25 for r in readings if r.pm25 is not None]
    valid_pm10 = [r.pm10 for r in readings if r.pm10 is not None]
    valid_temp = [r.temperature for r in readings if r.temperature is not None]
    valid_hum = [r.humidity for r in readings if r.humidity is not None]
    
    # AQI Stats
    if valid_aqi:
        avg_aqi = sum(valid_aqi) / len(valid_aqi)
        min_aqi = min(valid_aqi)
        max_aqi = max(valid_aqi)
    else:
        avg_aqi = min_aqi = max_aqi = None

    # AQI Distribution
    dist = AqiDistribution()
    for aqi in valid_aqi:
        cat = get_category_from_aqi(aqi)
        if cat == "Good": dist.good += 1
        elif cat == "Satisfactory": dist.satisfactory += 1
        elif cat == "Moderately Polluted": dist.moderately_polluted += 1
        elif cat == "Poor": dist.poor += 1
        elif cat == "Very Poor": dist.very_poor += 1
        elif cat == "Severe": dist.severe += 1
        
    # AQI Exceedances
    aqi_thresholds_list = [100, 200, 300]
    aqi_thresholds = []
    for t in aqi_thresholds_list:
        count = sum(1 for aqi in valid_aqi if aqi >= t)
        pct = (count / len(valid_aqi) * 100) if len(valid_aqi) > 0 else 0
        aqi_thresholds.append(ThresholdExceedance(threshold=t, count=count, percentage=round(pct, 1)))

    # PM2.5 Stats
    pm25_exceedance_pct = 0
    pm25_thresholds = []
    if valid_pm25:
        avg_pm25 = sum(valid_pm25) / len(valid_pm25)
        min_pm25 = min(valid_pm25)
        max_pm25 = max(valid_pm25)
        
        for t in [settings.PM25_THRESHOLD, settings.PM25_HIGH_THRESHOLD]:
            count = sum(1 for v in valid_pm25 if v >= t)
            pct = (count / len(valid_pm25) * 100)
            pm25_thresholds.append(ThresholdExceedance(threshold=t, count=count, percentage=round(pct, 1)))
            if t == settings.PM25_THRESHOLD:
                pm25_exceedance_pct = pct
    else:
        avg_pm25 = min_pm25 = max_pm25 = None

    # PM10 Stats
    pm10_exceedance_pct = 0
    pm10_thresholds = []
    if valid_pm10:
        avg_pm10 = sum(valid_pm10) / len(valid_pm10)
        min_pm10 = min(valid_pm10)
        max_pm10 = max(valid_pm10)
        
        for t in [settings.PM10_THRESHOLD, settings.PM10_HIGH_THRESHOLD]:
            count = sum(1 for v in valid_pm10 if v >= t)
            pct = (count / len(valid_pm10) * 100)
            pm10_thresholds.append(ThresholdExceedance(threshold=t, count=count, percentage=round(pct, 1)))
            if t == settings.PM10_THRESHOLD:
                pm10_exceedance_pct = pct
    else:
        avg_pm10 = min_pm10 = max_pm10 = None

    # Dominant Pollutant
    dominant_pollutant = None
    if valid_pm25 or valid_pm10:
        if pm25_exceedance_pct > pm10_exceedance_pct:
            dominant_pollutant = "PM2.5"
        elif pm10_exceedance_pct > pm25_exceedance_pct:
            dominant_pollutant = "PM10"
        else:
            # If equal exceedance rates, fallback to which has the worst AQI category peak if we wanted, 
            # but comparing exceedance is requested. If tied and > 0, pick PM2.5 as it's usually more critical.
            if pm25_exceedance_pct > 0:
                dominant_pollutant = "PM2.5"

    # Env Stats
    avg_temp = sum(valid_temp) / len(valid_temp) if valid_temp else None
    min_temp = min(valid_temp) if valid_temp else None
    max_temp = max(valid_temp) if valid_temp else None

    avg_hum = sum(valid_hum) / len(valid_hum) if valid_hum else None
    min_hum = min(valid_hum) if valid_hum else None
    max_hum = max(valid_hum) if valid_hum else None

    # Insights Generation
    insights = []
    if max_aqi is not None:
        insights.append(f"Peak AQI of {round(max_aqi, 1)} was recorded during the survey.")
    
    if len(valid_aqi) > 0:
        aqi_100_pct = next((t.percentage for t in aqi_thresholds if t.threshold == 100), 0)
        if aqi_100_pct > 0:
            insights.append(f"{aqi_100_pct}% of valid AQI readings were at or above AQI 100.")
            
    if dominant_pollutant == "PM2.5" and pm25_exceedance_pct > 0:
        insights.append(f"PM2.5 exceeded the configured analytical threshold ({settings.PM25_THRESHOLD}) in {round(pm25_exceedance_pct, 1)}% of valid readings.")
        insights.append("PM2.5 was the dominant pollutant based on exceedance frequency.")
    elif dominant_pollutant == "PM10" and pm10_exceedance_pct > 0:
        insights.append(f"PM10 exceeded the configured analytical threshold ({settings.PM10_THRESHOLD}) in {round(pm10_exceedance_pct, 1)}% of valid readings.")
        insights.append("PM10 was the dominant pollutant based on exceedance frequency.")

    if not valid_aqi:
        insights.append("Insufficient valid measurements to calculate environmental analytics.")

    return EnvironmentalAnalyticsResponse(
        mission_id=mission_id,
        overall_status=_get_status_from_average_aqi(avg_aqi),
        dominant_pollutant=dominant_pollutant,
        air_quality=AirQualityStats(
            average_aqi=avg_aqi,
            minimum_aqi=min_aqi,
            maximum_aqi=max_aqi,
            readings_with_aqi=len(valid_aqi)
        ),
        pm25=PollutantStats(
            average=avg_pm25,
            minimum=min_pm25,
            maximum=max_pm25,
            readings=len(valid_pm25),
            thresholds=pm25_thresholds
        ),
        pm10=PollutantStats(
            average=avg_pm10,
            minimum=min_pm10,
            maximum=max_pm10,
            readings=len(valid_pm10),
            thresholds=pm10_thresholds
        ),
        temperature=EnvStats(
            average=avg_temp,
            minimum=min_temp,
            maximum=max_temp
        ),
        humidity=EnvStats(
            average=avg_hum,
            minimum=min_hum,
            maximum=max_hum
        ),
        aqi_thresholds=aqi_thresholds,
        aqi_distribution=dist,
        coverage=DataCoverage(
            total_readings=total_readings,
            valid_aqi=len(valid_aqi),
            valid_pm25=len(valid_pm25),
            valid_pm10=len(valid_pm10),
            valid_temperature=len(valid_temp),
            valid_humidity=len(valid_hum)
        ),
        insights=insights
    )
