const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const { compareMissionsData } = require('./comparison'); // Will create next

function detectIntent(question) {
    const q = question.toLowerCase().trim();

    if (q.includes("compare") || q.includes("comparison") || q.includes("compared with the previous") || q.includes("previous survey") || q.includes("previous mission")) {
        return "mission_comparison";
    }

    if (q.includes("pm2.5") || q.includes("pm25")) {
        if (q.includes("highest") || q.includes("maximum") || q.includes("max") || q.includes("worst")) return "highest_pm25";
        if (q.includes("average") || q.includes("avg") || q.includes("mean")) return "average_pm25";
    }

    if (q.includes("pm10")) {
        if (q.includes("highest") || q.includes("maximum") || q.includes("max") || q.includes("worst")) return "highest_pm10";
        if (q.includes("average") || q.includes("avg") || q.includes("mean")) return "average_pm10";
    }

    if (q.includes("aqi") || q.includes("pollution")) {
        if (q.includes("highest") || q.includes("maximum") || q.includes("max") || q.includes("worst") || q.includes("peak")) return "highest_aqi";
        if (q.includes("average") || q.includes("avg") || q.includes("mean")) return "average_aqi";
    }

    if ((q.includes("pm2.5") || q.includes("pm25")) && (q.includes("average") || q.includes("avg") || q.includes("mean"))) return "average_pm25";
    if (q.includes("pm10") && (q.includes("average") || q.includes("avg") || q.includes("mean"))) return "average_pm10";
    if ((q.includes("aqi") || q.includes("pollution")) && (q.includes("average") || q.includes("avg") || q.includes("mean"))) return "average_aqi";

    if (q.includes("hotspot") && (q.includes("highest") || q.includes("worst") || q.includes("peak") || q.includes("max"))) return "highest_hotspot";
    if (q.includes("hotspot") && (q.includes("how many") || q.includes("number of") || q.includes("count") || q.includes("amount") || q.includes("detected") || q.includes("identified"))) return "hotspot_count";

    if (q.includes("temp") || q.includes("temperature")) return "min_max_temp";
    if (q.includes("humid") || q.includes("humidity")) return "min_max_hum";

    if (q.includes("trend") || q.includes("increase") || q.includes("decrease") || q.includes("change") || q.includes("worse") || q.includes("better")) return "pollution_trend";
    if (q.includes("summary") || q.includes("summarize") || q.includes("what happened") || q.includes("overview")) return "mission_summary";
    
    if (q.includes("altitude") || q.includes("height") || q.includes("vertical")) return "pollution_by_altitude";
    
    if (q.includes("time period") || q.includes("time analysis") || q.includes("hour") || q.includes("morning") || q.includes("afternoon") || q.includes("evening") || q.includes("time of day")) {
        if (q.includes("worst") || q.includes("highest") || q.includes("peak")) return "worst_pollution_period";
        return "pollution_by_time_period";
    }
    
    if (q.includes("worst time") || q.includes("worst window") || q.includes("worst hour") || q.includes("highest pollution time") || q.includes("worst period")) return "worst_pollution_period";
    
    if (q.includes("cleanest") || q.includes("lowest") || q.includes("minimum aqi") || q.includes("minimum pollution") || q.includes("min aqi") || q.includes("min pollution")) return "cleanest_surveyed_area";

    if (q.includes("highest") || q.includes("maximum") || q.includes("max") || q.includes("worst") || q.includes("peak")) return "highest_aqi";

    return "unsupported";
}

async function queryAiIntelligence(missionId, question, extracted = {}) {
    const timestampStr = new Date().toISOString();
    
    const mission = await Mission.findOne({ mission_id: missionId });
    if (!mission) {
        return {
            query_type: "unsupported",
            answer: `Mission '${missionId}' not found.`,
            confidence: "low",
            data_source: "N/A",
            mission_id: missionId,
            supporting_values: {},
            locations: [],
            timestamp: timestampStr
        };
    }

    const sourceType = mission.data_source === "CSV" ? "historical CSV file" : mission.data_source === "ESP32" ? "live telemetry stream" : "simulated demo data";
    const startTimeStr = mission.start_time ? new Date(mission.start_time).toLocaleTimeString('en-US', {hour12: false}) : "N/A";
    const endTimeStr = mission.end_time ? new Date(mission.end_time).toLocaleTimeString('en-US', {hour12: false}) : "N/A";
    
    const dataSourceGrounded = `FLUXX Mission ${missionId} (${sourceType}, ${mission.total_readings} points, ${startTimeStr} - ${endTimeStr})`;

    const readingsCount = await Reading.countDocuments({ mission_id: missionId });
    if (readingsCount === 0) {
        return {
            query_type: "unsupported",
            answer: "This mission does not have any sensor readings recorded yet.",
            confidence: "low",
            data_source: dataSourceGrounded,
            mission_id: missionId,
            supporting_values: {},
            locations: [],
            timestamp: timestampStr
        };
    }

    // Resolve Location Bounds if location is provided
    let locationBounds = null;
    let locationName = extracted.location;
    if (locationName) {
        const ln = locationName.toLowerCase();
        if (ln.includes("anand vihar")) {
            locationBounds = { minLat: 28.63, maxLat: 28.67, minLon: 77.29, maxLon: 77.33 };
        } else if (ln.includes("delhi")) {
            locationBounds = { minLat: 28.4, maxLat: 28.9, minLon: 76.8, maxLon: 77.5 };
        } else {
            // Default arbitrary bounds if unknown but location was asked
            locationBounds = { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
        }
    }

    // Build Match Criteria based on Location
    let matchCriteria = { mission_id: missionId };
    if (locationBounds) {
        matchCriteria.latitude = { $gte: locationBounds.minLat, $lte: locationBounds.maxLat };
        matchCriteria.longitude = { $gte: locationBounds.minLon, $lte: locationBounds.maxLon };
    }

    // Pre-check if any readings exist for this location
    if (locationBounds) {
        const locReadingsCount = await Reading.countDocuments(matchCriteria);
        if (locReadingsCount === 0) {
            const metricStr = extracted.metric || 'AQI';
            return {
                query_type: "no_data_for_location",
                answer: `I couldn't find ${metricStr} readings for ${locationName} in the available mission data.`,
                confidence: "high",
                data_source: dataSourceGrounded,
                mission_id: missionId,
                supporting_values: {},
                locations: [],
                timestamp: timestampStr
            };
        }
    }

    // Ensure we have an intent
    const intent = extracted.intent || detectIntent(question);

    if (intent === "unsupported") {
        // If the intent is unsupported but we have a metric and location/bounds, we can just return the average/latest for that metric
        if (extracted.metric && locationBounds) {
            const m = extracted.metric.toLowerCase().replace('.', '');
            if (['aqi', 'pm25', 'pm10', 'temperature', 'humidity'].includes(m)) {
                const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, [m]: { $ne: null } } }, { $group: { _id: null, avg: { $avg: `$${m}` } } }]);
                if (aggr.length > 0 && aggr[0].avg !== null) {
                    return {
                        query_type: `lookup_${m}`,
                        answer: `The current ${extracted.metric} recorded for ${locationName} is ${aggr[0].avg.toFixed(1)}.`,
                        confidence: "high",
                        data_source: dataSourceGrounded,
                        mission_id: missionId,
                        supporting_values: { metric: extracted.metric, value: aggr[0].avg, location: locationName },
                        locations: [],
                        timestamp: timestampStr
                    };
                }
            }
        }
        
        return {
            query_type: "unsupported",
            answer: "I can currently answer questions about pollution levels, hotspots, mission statistics, trends, altitude and historical comparisons.",
            confidence: "low",
            data_source: dataSourceGrounded,
            mission_id: missionId,
            supporting_values: {},
            locations: [],
            timestamp: timestampStr
        };
    }

    let ans = "";
    let supporting = {};
    let locations = [];
    let confidence = "high";

    if (intent === "highest_pm25") {
        const r = await Reading.findOne({ ...matchCriteria, pm25: { $ne: null } }).sort({ pm25: -1 });
        if (r) {
            ans = `The highest PM2.5 concentration was ${r.pm25.toFixed(1)} µg/m³.`;
            supporting = { pm25: r.pm25, aqi: r.aqi, latitude: r.latitude, longitude: r.longitude };
            locations = [{ latitude: r.latitude, longitude: r.longitude }];
        } else {
            ans = "No PM2.5 measurements are available for this mission.";
            confidence = "medium";
        }
    } else if (intent === "highest_pm10") {
        const r = await Reading.findOne({ ...matchCriteria, pm10: { $ne: null } }).sort({ pm10: -1 });
        if (r) {
            ans = `The highest PM10 concentration was ${r.pm10.toFixed(1)} µg/m³.`;
            supporting = { pm10: r.pm10, aqi: r.aqi, latitude: r.latitude, longitude: r.longitude };
            locations = [{ latitude: r.latitude, longitude: r.longitude }];
        } else {
            ans = "No PM10 measurements are available for this mission.";
            confidence = "medium";
        }
    } else if (intent === "highest_aqi") {
        const r = await Reading.findOne({ ...matchCriteria, aqi: { $ne: null } }).sort({ aqi: -1 });
        if (r) {
            ans = `The highest AQI was ${r.aqi} (${r.aqi_category}) detected near ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}.`;
            supporting = { aqi: r.aqi, pm25: r.pm25, pm10: r.pm10, latitude: r.latitude, longitude: r.longitude };
            locations = [{ latitude: r.latitude, longitude: r.longitude }];
        } else {
            ans = "No AQI calculations are available for this mission.";
            confidence = "medium";
        }
    } else if (intent === "average_pm25") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, pm25: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$pm25" } } }]);
        if (aggr.length > 0 && aggr[0].avg !== null) {
            ans = `The average PM2.5 concentration was ${aggr[0].avg.toFixed(1)} µg/m³.`;
            supporting = { average_pm25: Number(aggr[0].avg.toFixed(2)) };
        } else {
            ans = "No PM2.5 data available to calculate average.";
            confidence = "medium";
        }
    } else if (intent === "average_pm10") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, pm10: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$pm10" } } }]);
        if (aggr.length > 0 && aggr[0].avg !== null) {
            ans = `The average PM10 concentration was ${aggr[0].avg.toFixed(1)} µg/m³.`;
            supporting = { average_pm10: Number(aggr[0].avg.toFixed(2)) };
        } else {
            ans = "No PM10 data available to calculate average.";
            confidence = "medium";
        }
    } else if (intent === "average_aqi") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, aqi: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$aqi" } } }]);
        if (aggr.length > 0 && aggr[0].avg !== null) {
            ans = `The average AQI was ${aggr[0].avg.toFixed(1)}.`;
            supporting = { average_aqi: Number(aggr[0].avg.toFixed(2)) };
        } else {
            ans = "No AQI data available to calculate average.";
            confidence = "medium";
        }
    } else if (intent === "min_max_temp") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, temperature: { $ne: null } } }, { $group: { _id: null, min: { $min: "$temperature" }, max: { $max: "$temperature" } } }]);
        if (aggr.length > 0 && aggr[0].min !== null) {
            ans = `The temperature ranged from ${aggr[0].min.toFixed(1)}°C to ${aggr[0].max.toFixed(1)}°C.`;
            supporting = { min_temperature: aggr[0].min, max_temperature: aggr[0].max };
        } else {
            ans = "No temperature records found for this mission.";
            confidence = "medium";
        }
    } else if (intent === "min_max_hum") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, humidity: { $ne: null } } }, { $group: { _id: null, min: { $min: "$humidity" }, max: { $max: "$humidity" } } }]);
        if (aggr.length > 0 && aggr[0].min !== null) {
            ans = `The humidity ranged from ${aggr[0].min.toFixed(1)}% to ${aggr[0].max.toFixed(1)}%.`;
            supporting = { min_humidity: aggr[0].min, max_humidity: aggr[0].max };
        } else {
            ans = "No humidity records found for this mission.";
            confidence = "medium";
        }
    } else if (intent === "hotspot_count") {
        const count = await Hotspot.countDocuments({ mission_id: missionId });
        ans = `There were ${count} pollution hotspots identified during this mission.`;
        supporting = { hotspot_count: count };
    } else if (intent === "highest_hotspot") {
        const h = await Hotspot.findOne({ mission_id: missionId }).sort({ peak_aqi: -1 });
        if (h) {
            ans = `The highest hotspot had a peak AQI of ${h.peak_aqi} (Severity: ${h.severity}) located at ${h.latitude.toFixed(5)}, ${h.longitude.toFixed(5)}.`;
            supporting = { peak_aqi: h.peak_aqi, average_aqi: h.average_aqi, latitude: h.latitude, longitude: h.longitude };
            locations = [{ latitude: h.latitude, longitude: h.longitude }];
        } else {
            ans = "No hotspots detected on this mission.";
            confidence = "medium";
        }
    } else if (intent === "pollution_trend") {
        const readings = await Reading.find({ ...matchCriteria, pm25: { $ne: null } }).sort({ timestamp: 1 }).select('pm25');
        const pm25_vals = readings.map(r => r.pm25);
        if (pm25_vals.length >= 10) {
            const chunkSize = Math.max(1, Math.floor(pm25_vals.length / 10));
            const firstChunk = pm25_vals.slice(0, chunkSize);
            const lastChunk = pm25_vals.slice(-chunkSize);
            const firstAvg = firstChunk.reduce((a, b) => a + b, 0) / firstChunk.length;
            const lastAvg = lastChunk.reduce((a, b) => a + b, 0) / lastChunk.length;
            
            if (firstAvg > 0) {
                const changePct = ((lastAvg - firstAvg) / firstAvg) * 100;
                const direction = changePct >= 0 ? "increased" : "decreased";
                ans = `PM2.5 ${direction} ${Math.abs(changePct).toFixed(1)}% during the survey (from an initial avg of ${firstAvg.toFixed(1)} µg/m³ to a final avg of ${lastAvg.toFixed(1)} µg/m³).`;
                supporting = { initial_pm25: Number(firstAvg.toFixed(2)), final_pm25: Number(lastAvg.toFixed(2)), change_percentage: Number(changePct.toFixed(2)) };
            } else {
                ans = "Pollution values were stable at zero during the mission.";
            }
        } else {
            ans = "Insufficient telemetry timeline to determine chronological trend.";
            confidence = "medium";
        }
    } else if (intent === "mission_summary") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, aqi: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$aqi" } } }]);
        const avg_aqi = aggr.length > 0 && aggr[0].avg !== null ? aggr[0].avg : 0.0;
        const hCount = await Hotspot.countDocuments({ mission_id: missionId });
        
        ans = `Mission ${missionId} (${mission.status}) captured ${mission.total_readings} points over ${mission.distance_km.toFixed(2)} km. Average AQI was ${avg_aqi.toFixed(1)} with ${hCount} hotspots detected.`;
        supporting = { total_readings: mission.total_readings, distance_km: mission.distance_km, average_aqi: Number(avg_aqi.toFixed(2)), hotspot_count: hCount };
    } else if (intent === "mission_comparison") {
        const prevM = await Mission.findOne({ created_at: { $lt: mission.created_at } }).sort({ created_at: -1 });
        if (prevM) {
            const cReadings = await Reading.find({ mission_id: missionId });
            const pReadings = await Reading.find({ mission_id: prevM.mission_id });
            const cHotspots = await Hotspot.find({ mission_id: missionId });
            const pHotspots = await Hotspot.find({ mission_id: prevM.mission_id });
            
            if (compareMissionsData) {
                const comp = compareMissionsData(mission, prevM, cReadings, pReadings, cHotspots, pHotspots);
                const dirVerb = comp.summary.overall_direction === "WORSENED" ? "increased" : comp.summary.overall_direction === "IMPROVED" ? "decreased" : "remained stable";
                const changePct = comp.summary.aqi_change_percent || 0.0;
                ans = `Compared to the previous survey (${prevM.mission_id}), pollution overall ${dirVerb} (AQI changed by ${changePct.toFixed(1)}%). Current average AQI is ${comp.overall.aqi.current_average.toFixed(1)} vs previous ${comp.overall.aqi.previous_average.toFixed(1)}.`;
                supporting = {
                    previous_mission_id: prevM.mission_id,
                    current_average_aqi: comp.overall.aqi.current_average,
                    previous_average_aqi: comp.overall.aqi.previous_average,
                    aqi_change_percentage: changePct
                };
            } else {
                ans = "Mission comparison not available currently.";
            }
        } else {
            ans = "This is the first recorded mission. No previous mission is available for historical comparison.";
            confidence = "medium";
        }
    } else if (intent === "pollution_by_altitude") {
        // approximate bucketing
        const aggr = await Reading.aggregate([
            { $match: { ...matchCriteria, altitude: { $ne: null } } },
            { $project: { bucket: { $multiply: [ { $floor: { $divide: ["$altitude", 10] } }, 10 ] }, pm25: 1, aqi: 1 } },
            { $group: { _id: "$bucket", avg_pm25: { $avg: "$pm25" }, avg_aqi: { $avg: "$aqi" }, count: { $sum: 1 } } },
            { $sort: { avg_pm25: -1 } },
            { $limit: 1 }
        ]);
        if (aggr.length > 0) {
            const worst = aggr[0];
            ans = `The highest PM2.5 concentration occurred between ${worst._id}m and ${worst._id + 10}m with an average PM2.5 of ${worst.avg_pm25.toFixed(1)} µg/m³.`;
            supporting = { worst_altitude_min: worst._id, worst_altitude_max: worst._id + 10, average_pm25: Number(worst.avg_pm25.toFixed(2)), average_aqi: Number((worst.avg_aqi||0).toFixed(1)), samples_at_altitude: worst.count };
        } else {
            ans = "No altitude readings found to calculate vertical pollution profile.";
            confidence = "medium";
        }
    } else if (intent === "pollution_by_time_period") {
        const readings = await Reading.find({ ...matchCriteria, aqi: { $ne: null } }).sort({ timestamp: 1 }).select('timestamp aqi');
        if (readings.length >= 4) {
            const chunkSize = Math.floor(readings.length / 4);
            const quarters = [];
            for (let i = 0; i < 4; i++) {
                const chunk = readings.slice(i * chunkSize, (i + 1) * chunkSize);
                const avgAqi = chunk.reduce((sum, r) => sum + r.aqi, 0) / chunk.length;
                const startT = chunk[0].timestamp.toLocaleTimeString('en-US', {hour12: false});
                const endT = chunk[chunk.length - 1].timestamp.toLocaleTimeString('en-US', {hour12: false});
                quarters.push({ period: `Period ${i+1} (${startT} - ${endT})`, avg_aqi: avgAqi });
            }
            const worst = quarters.reduce((a, b) => a.avg_aqi > b.avg_aqi ? a : b);
            ans = `Analysis shows ${worst.period} was the most polluted phase, averaging an AQI of ${worst.avg_aqi.toFixed(1)}.`;
            supporting = { periods: quarters, worst_period: worst.period, worst_period_aqi: Number(worst.avg_aqi.toFixed(2)) };
        } else {
            ans = "Insufficient time duration for sub-period temporal analysis.";
            confidence = "medium";
        }
    } else if (intent === "worst_pollution_period") {
        const readings = await Reading.find({ ...matchCriteria, aqi: { $ne: null } }).sort({ timestamp: 1 }).select('timestamp aqi pm25');
        if (readings.length >= 10) {
            const windows = {};
            for (const r of readings) {
                const t = new Date(r.timestamp);
                const minuteBucket = Math.floor(t.getMinutes() / 5) * 5;
                t.setMinutes(minuteBucket, 0, 0);
                const key = t.toISOString();
                if (!windows[key]) windows[key] = { aqi_sum: 0, count: 0, pm25_sum: 0 };
                windows[key].aqi_sum += r.aqi;
                windows[key].pm25_sum += r.pm25 || 0;
                windows[key].count += 1;
            }
            const averages = [];
            for (const key in windows) {
                const v = windows[key];
                const d = new Date(key);
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                averages.push({
                    time: timeStr,
                    avg_aqi: v.aqi_sum / v.count,
                    avg_pm25: v.pm25_sum / v.count,
                    count: v.count
                });
            }
            const worstW = averages.reduce((a, b) => a.avg_aqi > b.avg_aqi ? a : b);
            ans = `The worst 5-minute window occurred at ${worstW.time} with an average AQI of ${worstW.avg_aqi.toFixed(1)}.`;
            supporting = { worst_window_time: worstW.time, worst_window_aqi: Number(worstW.avg_aqi.toFixed(2)), worst_window_pm25: Number(worstW.avg_pm25.toFixed(2)) };
        } else {
            ans = "Timeline is too short to calculate a reliable 5-minute pollution window.";
            confidence = "medium";
        }
    } else if (intent === "cleanest_surveyed_area") {
        const r = await Reading.findOne({ ...matchCriteria, aqi: { $ne: null } }).sort({ aqi: 1 });
        if (r) {
            ans = `The cleanest surveyed area was detected at ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} with an AQI of ${r.aqi} (${r.aqi_category}).`;
            supporting = { aqi: r.aqi, pm25: r.pm25, pm10: r.pm10, latitude: r.latitude, longitude: r.longitude };
            locations = [{ latitude: r.latitude, longitude: r.longitude }];
        } else {
            ans = "No readings found to calculate cleanest surveyed area.";
            confidence = "medium";
        }
    }

    return {
        query_type: intent,
        answer: ans,
        confidence: confidence,
        data_source: dataSourceGrounded,
        mission_id: missionId,
        supporting_values: supporting,
        locations: locations,
        timestamp: timestampStr
    };
}

async function getMissionInsights(missionId) {
    const insights = [];

    // 1. Pollution Trend
    let trendInsight = "No PM2.5 timeline data to analyze trend.";
    const readings = await Reading.find({ mission_id: missionId, pm25: { $ne: null } }).sort({ timestamp: 1 }).select('pm25');
    const pm25Vals = readings.map(r => r.pm25);
    
    if (pm25Vals.length >= 10) {
        const chunkSize = Math.max(1, Math.floor(pm25Vals.length / 10));
        const firstChunk = pm25Vals.slice(0, chunkSize);
        const lastChunk = pm25Vals.slice(-chunkSize);
        const firstAvg = firstChunk.reduce((a, b) => a + b, 0) / firstChunk.length;
        const lastAvg = lastChunk.reduce((a, b) => a + b, 0) / lastChunk.length;
        
        if (firstAvg > 0) {
            const changePct = ((lastAvg - firstAvg) / firstAvg) * 100;
            const dirStr = changePct >= 0 ? "increased" : "decreased";
            trendInsight = `PM2.5 ${dirStr} ${Math.abs(changePct).toFixed(1)}% during the survey.`;
        } else {
            trendInsight = "PM2.5 concentration remained stable at 0.";
        }
    }
    insights.push({ title: "Pollution Trend", description: trendInsight });

    // 2. Highest Concentration
    const maxR = await Reading.findOne({ mission_id: missionId, pm25: { $ne: null } }).sort({ pm25: -1 });
    let highestInsight = "No PM2.5 peak detected.";
    if (maxR) {
        highestInsight = `${maxR.pm25.toFixed(1)} µg/m³ detected near ${maxR.latitude.toFixed(5)}, ${maxR.longitude.toFixed(5)}.`;
    }
    insights.push({ title: "Highest Concentration", description: highestInsight });

    // 3. Hotspots
    const hCount = await Hotspot.countDocuments({ mission_id: missionId });
    insights.push({ title: "Hotspots", description: `${hCount} pollution hotspots identified.` });

    // 4. Altitude
    const aggr = await Reading.aggregate([
        { $match: { mission_id: missionId, altitude: { $ne: null } } },
        { $project: { bucket: { $multiply: [ { $floor: { $divide: ["$altitude", 10] } }, 10 ] }, pm25: 1 } },
        { $group: { _id: "$bucket", avg_pm25: { $avg: "$pm25" } } },
        { $sort: { avg_pm25: -1 } },
        { $limit: 1 }
    ]);
    
    let altitudeInsight = "No altitude data available to determine vertical concentration.";
    if (aggr.length > 0) {
        const worstBucket = aggr[0];
        altitudeInsight = `Highest PM2.5 concentration occurred between ${worstBucket._id}–${worstBucket._id + 10} m.`;
    }
    insights.push({ title: "Altitude", description: altitudeInsight });

    return insights;
}

module.exports = {
    detectIntent,
    queryAiIntelligence,
    getMissionInsights
};
