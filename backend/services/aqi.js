// CPCB NAQI Breakpoints
// Structure: [C_low, C_high, I_low, I_high, Category]
const PM25_BREAKPOINTS = [
    [0.0, 30.0, 0, 50, "Good"],
    [31.0, 60.0, 51, 100, "Satisfactory"],
    [61.0, 90.0, 101, 200, "Moderately Polluted"],
    [91.0, 120.0, 201, 300, "Poor"],
    [121.0, 250.0, 301, 400, "Very Poor"],
    [251.0, Infinity, 401, 500, "Severe"]
];

const PM10_BREAKPOINTS = [
    [0.0, 50.0, 0, 50, "Good"],
    [51.0, 100.0, 51, 100, "Satisfactory"],
    [101.0, 250.0, 101, 200, "Moderately Polluted"],
    [251.0, 350.0, 201, 300, "Poor"],
    [351.0, 430.0, 301, 400, "Very Poor"],
    [431.0, Infinity, 401, 500, "Severe"]
];

function calculateSubIndex(c, breakpoints) {
    if (c === null || c === undefined || isNaN(c) || c < 0) {
        return null;
    }
        
    c = Math.round(c);

    for (const [c_low, c_high, i_low, i_high, category] of breakpoints) {
        if (c >= c_low && c <= c_high) {
            if (c_high === Infinity) {
                // For severe category upper bound
                return c_low > 0 ? Math.round(((500 - i_low) / (c_low * 1.5 - c_low)) * (c - c_low) + i_low) : 500;
            }
            
            // Linear interpolation
            const i = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low;
            return Math.round(i);
        }
    }
            
    return null;
}

function getCategoryFromAQI(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 200) return "Moderately Polluted";
    if (aqi <= 300) return "Poor";
    if (aqi <= 400) return "Very Poor";
    return "Severe";
}

function calculateAQI({ pm25 = null, pm10 = null }) {
    if ((pm25 === null || pm25 < 0) && (pm10 === null || pm10 < 0)) {
        return { aqi: null, category: null };
    }

    const subIndices = [];
    
    if (pm25 !== null && pm25 >= 0) {
        const i_pm25 = calculateSubIndex(pm25, PM25_BREAKPOINTS);
        if (i_pm25 !== null) {
            subIndices.push(i_pm25);
        }
    }
            
    if (pm10 !== null && pm10 >= 0) {
        const i_pm10 = calculateSubIndex(pm10, PM10_BREAKPOINTS);
        if (i_pm10 !== null) {
            subIndices.push(i_pm10);
        }
    }

    if (subIndices.length === 0) {
        return { aqi: null, category: null };
    }
        
    const overall_aqi = Math.max(...subIndices);
    const category = getCategoryFromAQI(overall_aqi);
    
    return {
        aqi: overall_aqi,
        category: category
    };
}

module.exports = {
    calculateSubIndex,
    getCategoryFromAQI,
    calculateAQI
};
