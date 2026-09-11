const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const { compareMissionsData } = require('./comparison'); // Will create next

function detectIntent(question) {
    return "legacy_unused";
}

async function queryAiIntelligence(missionId, question, validated) {
    const timestampStr = new Date().toISOString();
    
    const mission = await Mission.findOne({ mission_id: missionId });
    
    // Resolve location bounding
    let locationBounds = null;
    let locationName = null;
    if (validated.location) {
        const ln = validated.location.toLowerCase();
        if (ln.includes("anand vihar") || ln.includes("anandvihar")) {
            locationBounds = { minLat: 28.63, maxLat: 28.67, minLon: 77.29, maxLon: 77.33 };
            locationName = "Anand Vihar";
        } else if (ln.includes("delhi")) {
            locationBounds = { minLat: 28.4, maxLat: 28.9, minLon: 76.8, maxLon: 77.5 };
            locationName = "Delhi";
        } else {
            locationBounds = { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
            locationName = validated.location;
        }
    }

    let matchCriteria = {};
    if (missionId && missionId !== 'default' && missionId !== 'M-001') {
        matchCriteria.mission_id = missionId;
    }
    
    if (locationBounds) {
        matchCriteria.latitude = { $gte: locationBounds.minLat, $lte: locationBounds.maxLat };
        matchCriteria.longitude = { $gte: locationBounds.minLon, $lte: locationBounds.maxLon };
    }
    
    if (validated.altitude !== null) {
        matchCriteria.altitude = { $gte: validated.altitude - 5, $lte: validated.altitude + 5 };
    }

    console.log(`[AI] DB query started`);
    console.log(`[AI] Operation: ${validated.operation}`);
    console.log(`[AI] Metrics: ${validated.metrics.join(', ') || 'None'}`);
    console.log(`[AI] Location: ${locationName || 'None'}`);
    console.log(`[AI] MongoDB query: ${JSON.stringify(matchCriteria)}`);

    let matchingRowsCount = 0;
    try {
        matchingRowsCount = await Reading.countDocuments(matchCriteria);
        console.log(`[AI] MongoDB query successful`);
        console.log(`[AI] Matching records: ${matchingRowsCount}`);
    } catch (e) {
        console.error(`[AI] MongoDB QUERY ERROR: ${e.message}`);
        throw e;
    }
    if (matchingRowsCount === 0) {
        const globalCount = await Reading.countDocuments();
        if (globalCount === 0) {
            return { answer: `No FLUXX air-quality readings are currently available.`, matching_rows: 0, has_data: false };
        }
        if (locationName) {
            return { answer: `No FLUXX readings were found for ${locationName}.`, matching_rows: 0, has_data: false };
        }
        if (validated.altitude !== null) {
            return { answer: `No FLUXX readings were found at approximately ${validated.altitude} metres altitude.`, matching_rows: 0, has_data: false };
        }
        return { answer: `I couldn't find any readings matching those parameters in the available data.`, matching_rows: 0, has_data: false };
    }

    let ansParts = [];
    const dbFieldsMap = {
        'AQI': 'aqi',
        'PM2.5': 'pm25',
        'PM10': 'pm10',
        'PM1': 'pm1',
        'temperature': 'temperature',
        'humidity': 'humidity'
    };
    
    const unitsMap = {
        'AQI': '',
        'PM2.5': 'µg/m³',
        'PM10': 'µg/m³',
        'PM1': 'µg/m³',
        'temperature': '°C',
        'humidity': '%'
    };
    
    const metrics = validated.metrics || [];
    
    if (metrics.some(m => !dbFieldsMap[m])) {
         // E.g. they asked for NO2, SO2, O3, CO
         ansParts.push("The FLUXX dataset does not contain that information.");
    }
    
    const validMetrics = metrics.filter(m => dbFieldsMap[m]);

    if (validated.operation === "GET_LATEST" || validated.operation === "GET_BY_LOCATION" || validated.operation === "GET_BY_ALTITUDE") {
        let prefix = "According to the FLUXX dataset, ";
        if (validated.altitude !== null) prefix = `At approximately ${validated.altitude} metres altitude, according to the FLUXX dataset, `;
        else if (locationName) prefix = `In ${locationName}, according to the FLUXX dataset, `;

        const r = await Reading.findOne(matchCriteria).sort({ timestamp: -1 });
        if (!r) {
            ansParts.push("No data available.");
        } else {
            if (validMetrics.length === 1) {
                const m = validMetrics[0];
                const dbF = dbFieldsMap[m];
                if (r[dbF] !== null && r[dbF] !== undefined) {
                    let val = r[dbF];
                    if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(1);
                    const label = m === 'AQI' ? `the latest AQI is` : `the latest ${m} concentration is`;
                    const unit = unitsMap[m] ? ` ${unitsMap[m]}` : '';
                    ansParts.push(`${prefix}${label} ${val}${unit}.`);
                } else {
                    ansParts.push("The FLUXX dataset does not contain that information.");
                }
            } else if (validMetrics.length > 1) {
                ansParts.push(prefix.replace(', ', ':\n').trim());
                for (const m of validMetrics) {
                    const dbF = dbFieldsMap[m];
                    if (r[dbF] !== null && r[dbF] !== undefined) {
                        let val = r[dbF];
                        if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(1);
                        ansParts.push(`${m}: ${val} ${unitsMap[m]}`.trim());
                    } else {
                        ansParts.push(`${m}: The FLUXX dataset does not contain that information.`);
                    }
                }
            }
        }
    } else if (validated.operation === "GET_AVERAGE") {
        for (const m of validMetrics) {
            const dbF = dbFieldsMap[m];
            const aggr = await Reading.aggregate([
                { $match: { ...matchCriteria, [dbF]: { $ne: null } } },
                { $group: { _id: null, avg: { $avg: `$${dbF}` } } }
            ]);
            if (aggr.length > 0 && aggr[0].avg !== null) {
                let unit = unitsMap[m] ? ` ${unitsMap[m]}` : '';
                ansParts.push(`The average ${m} recorded in the selected FLUXX data is ${aggr[0].avg.toFixed(1)}${unit}.`.trim());
            } else {
                ansParts.push(`The FLUXX dataset does not contain that information for ${m}.`);
            }
        }
    } else if (validated.operation === "GET_MAX" || validated.operation === "GET_MIN") {
        const sortDir = validated.operation === "GET_MAX" ? -1 : 1;
        const adjective = validated.operation === "GET_MAX" ? "maximum" : "minimum";
        for (const m of validMetrics) {
            const dbF = dbFieldsMap[m];
            const r = await Reading.findOne({ ...matchCriteria, [dbF]: { $ne: null } }).sort({ [dbF]: sortDir });
            if (r && r[dbF] !== null) {
                let val = r[dbF];
                if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(1);
                let unit = unitsMap[m] ? ` ${unitsMap[m]}` : '';
                ansParts.push(`The ${adjective} ${m} recorded in the selected FLUXX data is ${val}${unit}.`.trim());
            } else {
                ansParts.push(`The FLUXX dataset does not contain that information for ${m}.`);
            }
        }
    } else if (validated.operation === "GET_COUNT") {
        ansParts.push(`There are ${matchingRowsCount} readings matching your criteria in the FLUXX dataset.`);
    } else if (validated.operation === "GET_HOTSPOTS") {
        const count = await Hotspot.countDocuments({ mission_id: missionId });
        if (count > 0) {
            const hotspots = await Hotspot.find({ mission_id: missionId }).sort({ peak_aqi: -1 }).limit(3);
            ansParts.push(`There are ${count} pollution hotspots identified in the current survey.`);
            ansParts.push(`\nTop Hotspots:`);
            hotspots.forEach((h, i) => {
                ansParts.push(`${i+1}. AQI ${h.peak_aqi} near ${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)} (Priority: ${h.severity})`);
            });
        } else {
            ansParts.push(`No hotspots have been identified in this data.`);
        }
    } else if (validated.operation === "MISSION_SUMMARY") {
        const aggr = await Reading.aggregate([{ $match: { ...matchCriteria, aqi: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$aqi" }, max: { $max: "$aqi" } } }]);
        const pm25Aggr = await Reading.aggregate([{ $match: { ...matchCriteria, pm25: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$pm25" } } }]);
        const pm10Aggr = await Reading.aggregate([{ $match: { ...matchCriteria, pm10: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$pm10" } } }]);
        
        const avg_aqi = aggr.length > 0 && aggr[0].avg !== null ? aggr[0].avg : 0;
        const max_aqi = aggr.length > 0 && aggr[0].max !== null ? aggr[0].max : 0;
        const avg_pm25 = pm25Aggr.length > 0 && pm25Aggr[0].avg !== null ? pm25Aggr[0].avg : 0;
        const avg_pm10 = pm10Aggr.length > 0 && pm10Aggr[0].avg !== null ? pm10Aggr[0].avg : 0;
        
        const hCount = await Hotspot.countDocuments({ mission_id: missionId });
        
        ansParts.push(`Mission Summary (${missionId}):`);
        ansParts.push(`- Total Readings: ${mission.total_readings}`);
        ansParts.push(`- Average AQI: ${avg_aqi.toFixed(1)}`);
        ansParts.push(`- Maximum AQI: ${max_aqi}`);
        ansParts.push(`- Average PM2.5: ${avg_pm25.toFixed(1)} µg/m³`);
        ansParts.push(`- Average PM10: ${avg_pm10.toFixed(1)} µg/m³`);
        ansParts.push(`- Hotspots Detected: ${hCount}`);
    } else if (ansParts.length === 0) {
        ansParts.push("I couldn't process that specific query against the database.");
    }

    if (ansParts.length === 0) {
        ansParts.push("No data retrieved.");
    }
    
    // Check if the answer indicates missing data
    const answerStr = ansParts.join('\n');
    const hasData = !answerStr.includes("The FLUXX dataset does not contain that information") && !answerStr.includes("No data available.") && !answerStr.includes("No hotspots have been identified");

    return {
        answer: answerStr,
        data_source: "FLUXX Database",
        columns_used: metrics,
        filter_applied: JSON.stringify(matchCriteria),
        matching_rows: matchingRowsCount,
        has_data: hasData
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
