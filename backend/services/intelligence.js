function classifyPollutionSeverity(aqi) {
    if (aqi === null || aqi === undefined) {
        return { aqi: 0, category: "Unknown", severity_level: 0 };
    }
        
    const aqi_int = Math.round(aqi);
    if (aqi_int <= 50) return { aqi: aqi_int, category: "Good", severity_level: 0 };
    else if (aqi_int <= 100) return { aqi: aqi_int, category: "Satisfactory", severity_level: 1 };
    else if (aqi_int <= 200) return { aqi: aqi_int, category: "Moderately Polluted", severity_level: 2 };
    else if (aqi_int <= 300) return { aqi: aqi_int, category: "Poor", severity_level: 3 };
    else if (aqi_int <= 400) return { aqi: aqi_int, category: "Very Poor", severity_level: 4 };
    else return { aqi: aqi_int, category: "Severe", severity_level: 5 };
}

function calculatePriorityScore(aqi, distinctSurveys, averageAqi, peakAqi) {
    const clampedAqi = Math.min(Math.max(aqi, 0), 500);
    const severityScore = (clampedAqi / 500.0) * 100.0;
    
    const persistenceScore = Math.min(distinctSurveys / 5.0, 1.0) * 100.0;
    
    let spatialScore = 0.0;
    if (peakAqi > 0) {
        spatialScore = Math.min((averageAqi / peakAqi) * 100.0, 100.0);
    }
        
    const priorityScore = (0.60 * severityScore) + (0.25 * persistenceScore) + (0.15 * spatialScore);
    return Math.round(priorityScore * 10) / 10;
}

function classifyPriority(score) {
    if (score < 25) return "LOW";
    if (score < 50) return "MEDIUM";
    if (score < 75) return "HIGH";
    return "CRITICAL";
}

function analyzeTrend(historicalAqis) {
    if (!historicalAqis || historicalAqis.length < 2) {
        return { trend: "INSUFFICIENT_DATA", trend_percentage: null };
    }
        
    const recentAverage = historicalAqis[historicalAqis.length - 1];
    
    let sumOld = 0;
    for (let i = 0; i < historicalAqis.length - 1; i++) {
        sumOld += historicalAqis[i];
    }
    const oldAverage = sumOld / (historicalAqis.length - 1);
    
    if (oldAverage === 0) {
        return { trend: "INSUFFICIENT_DATA", trend_percentage: null };
    }
        
    const percentageChange = ((recentAverage - oldAverage) / oldAverage) * 100.0;
    
    let trend;
    if (percentageChange >= 10.0) trend = "WORSENING";
    else if (percentageChange <= -10.0) trend = "IMPROVING";
    else trend = "STABLE";
        
    return {
        trend,
        trend_percentage: Math.round(percentageChange * 10) / 10
    };
}

function getRecommendation(priority, trend, isPersistent) {
    if (isPersistent && trend === "WORSENING" && (priority === "HIGH" || priority === "CRITICAL")) {
        return "Prioritize immediate investigation and repeat sampling.";
    }
        
    if (isPersistent && trend === "IMPROVING") {
        return "Continue monitoring to confirm sustained improvement.";
    }
        
    if (priority === "CRITICAL") return "Immediate investigation and repeat sampling recommended.";
    else if (priority === "HIGH") return "Prioritize ground inspection and repeat aerial sampling.";
    else if (priority === "MEDIUM") return "Continue monitoring and consider additional sampling.";
    else return "Continue monitoring.";
}

module.exports = {
    classifyPollutionSeverity,
    calculatePriorityScore,
    classifyPriority,
    analyzeTrend,
    getRecommendation
};
