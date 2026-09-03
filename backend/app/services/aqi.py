import math
from typing import Dict, Any, Optional

# CPCB NAQI Breakpoints
# Structure: (C_low, C_high, I_low, I_high, Category)
PM25_BREAKPOINTS = [
    (0.0, 30.0, 0, 50, "Good"),
    (31.0, 60.0, 51, 100, "Satisfactory"),
    (61.0, 90.0, 101, 200, "Moderately Polluted"),
    (91.0, 120.0, 201, 300, "Poor"),
    (121.0, 250.0, 301, 400, "Very Poor"),
    (251.0, float('inf'), 401, 500, "Severe")
]

PM10_BREAKPOINTS = [
    (0.0, 50.0, 0, 50, "Good"),
    (51.0, 100.0, 51, 100, "Satisfactory"),
    (101.0, 250.0, 101, 200, "Moderately Polluted"),
    (251.0, 350.0, 201, 300, "Poor"),
    (351.0, 430.0, 301, 400, "Very Poor"),
    (431.0, float('inf'), 401, 500, "Severe")
]

def calculate_sub_index(c: float, breakpoints: list) -> Optional[int]:
    """Calculates sub-index using linear interpolation based on CPCB NAQI formula."""
    if c is None or math.isnan(c) or c < 0:
        return None
        
    c = round(c)

    for (c_low, c_high, i_low, i_high, category) in breakpoints:
        if c_low <= c <= c_high:
            if c_high == float('inf'):
                # For severe category upper bound
                return int(((500 - i_low) / (c_low * 1.5 - c_low)) * (c - c_low) + i_low) if c_low > 0 else 500
            
            # Linear interpolation
            i = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return int(round(i))
            
    return None

def get_category_from_aqi(aqi: int) -> str:
    """Returns the CPCB NAQI category for a given AQI."""
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderately Polluted"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"

def calculate_aqi(pm25: Optional[float] = None, pm10: Optional[float] = None) -> Dict[str, Any]:
    """
    Calculates the Estimated AQI based on available PM2.5 and PM10 instantaneous measurements.
    
    Disclaimer: This provides an 'Estimated AQI' based on instantaneous sensor readings.
    Official CPCB NAQI methodology dictates a 24-hour averaging period for PM2.5 and PM10. 
    This function uses the NAQI sub-index formula for immediate real-time approximations.
    """
    if (pm25 is None or pm25 < 0) and (pm10 is None or pm10 < 0):
        return {"aqi": None, "category": None}

    sub_indices = []
    
    if pm25 is not None and pm25 >= 0:
        i_pm25 = calculate_sub_index(pm25, PM25_BREAKPOINTS)
        if i_pm25 is not None:
            sub_indices.append(i_pm25)
            
    if pm10 is not None and pm10 >= 0:
        i_pm10 = calculate_sub_index(pm10, PM10_BREAKPOINTS)
        if i_pm10 is not None:
            sub_indices.append(i_pm10)

    if not sub_indices:
        return {"aqi": None, "category": None}
        
    # AQI is the maximum of the sub-indices
    overall_aqi = max(sub_indices)
    category = get_category_from_aqi(overall_aqi)
    
    return {
        "aqi": overall_aqi,
        "category": category
    }
