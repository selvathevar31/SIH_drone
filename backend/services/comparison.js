// Basic mock for comparison since the actual logic is huge
// This will supply the structural response needed for intents and routes.

const CHANGE_SIGNIFICANT_PERCENT = Number(process.env.CHANGE_SIGNIFICANT_PERCENT || 20.0);
const CHANGE_STABLE_PERCENT = Number(process.env.CHANGE_STABLE_PERCENT || 5.0);

function compareMissionsData(currentMission, prevMission, currentReadings, prevReadings, currentHotspots, prevHotspots) {
    const currentAqiSum = currentReadings.reduce((s, r) => s + (r.aqi || 0), 0);
    const currentAvgAqi = currentReadings.length > 0 ? currentAqiSum / currentReadings.length : 0;
    
    const prevAqiSum = prevReadings.reduce((s, r) => s + (r.aqi || 0), 0);
    const prevAvgAqi = prevReadings.length > 0 ? prevAqiSum / prevReadings.length : 0;
    
    let changePct = 0;
    if (prevAvgAqi > 0) {
        changePct = ((currentAvgAqi - prevAvgAqi) / prevAvgAqi) * 100;
    }
    
    let direction = "STABLE";
    if (Math.abs(changePct) <= CHANGE_STABLE_PERCENT) direction = "STABLE";
    else if (changePct > 0) direction = "WORSENED";
    else direction = "IMPROVED";
    
    return {
        summary: {
            overall_direction: direction,
            aqi_change_percent: changePct
        },
        overall: {
            aqi: {
                current_average: currentAvgAqi,
                previous_average: prevAvgAqi
            }
        }
    };
}

module.exports = { compareMissionsData };
