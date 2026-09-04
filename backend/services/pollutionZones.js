const { getCategoryFromAQI } = require('./aqi');
const { calculatePriorityScore, classifyPriority, getRecommendation, analyzeTrend } = require('./intelligence');

const EARTH_RADIUS_METERS = 6371000.0;

const ZONE_RADIUS_METERS = Number(process.env.ZONE_RADIUS_METERS || 100.0);
const ZONE_MIN_SAMPLES = Number(process.env.ZONE_MIN_SAMPLES || 5);
const PERSISTENT_HOTSPOT_RADIUS_METERS = Number(process.env.PERSISTENT_HOTSPOT_RADIUS_METERS || 100.0);
const PERSISTENT_HOTSPOT_MIN_SURVEYS = Number(process.env.PERSISTENT_HOTSPOT_MIN_SURVEYS || 2);
const PM25_THRESHOLD = Number(process.env.PM25_THRESHOLD || 60.0);
const PM10_THRESHOLD = Number(process.env.PM10_THRESHOLD || 100.0);

function haversineDistanceRadians(lat1Rad, lon1Rad, lat2Rad, lon2Rad) {
    const deltaPhi = lat2Rad - lat1Rad;
    const deltaLambda = lon2Rad - lon1Rad;
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLambda / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function regionQueryRadians(coords, pIndex, eps) {
    const neighbors = [];
    const p1 = coords[pIndex];
    for (let i = 0; i < coords.length; i++) {
        const p2 = coords[i];
        if (haversineDistanceRadians(p1[0], p1[1], p2[0], p2[1]) <= eps) {
            neighbors.push(i);
        }
    }
    return neighbors;
}

function expandClusterRadians(coords, labels, pIndex, neighbors, clusterId, eps, minPts) {
    labels[pIndex] = clusterId;
    let i = 0;
    while (i < neighbors.length) {
        const pNeighborIndex = neighbors[i];
        if (labels[pNeighborIndex] === -1) {
            labels[pNeighborIndex] = clusterId;
        } else if (labels[pNeighborIndex] === 0) {
            labels[pNeighborIndex] = clusterId;
            const newNeighbors = regionQueryRadians(coords, pNeighborIndex, eps);
            if (newNeighbors.length >= minPts) {
                for (const newNeighbor of newNeighbors) {
                    if (!neighbors.includes(newNeighbor)) {
                        neighbors.push(newNeighbor);
                    }
                }
            }
        }
        i++;
    }
}

function dbscanRadians(coords, eps, minPts) {
    const NOISE = -1;
    const UNCLASSIFIED = 0;
    let clusterId = 0;
    const labels = new Array(coords.length).fill(UNCLASSIFIED);

    for (let i = 0; i < coords.length; i++) {
        if (labels[i] !== UNCLASSIFIED) continue;
        const neighbors = regionQueryRadians(coords, i, eps);
        if (neighbors.length < minPts) {
            labels[i] = NOISE;
        } else {
            clusterId++;
            expandClusterRadians(coords, labels, i, neighbors, clusterId, eps, minPts);
        }
    }
    return labels;
}

function _getSeverity(aqi) {
    if (aqi === null || aqi === undefined) return null;
    if (aqi <= 50) return "GOOD";
    if (aqi <= 100) return "MODERATE";
    if (aqi <= 200) return "POOR";
    if (aqi <= 400) return "VERY_POOR";
    return "SEVERE";
}

function padLeft(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function calculatePollutionZones(missionId, readings) {
    const validReadings = readings.filter(r => r.latitude !== null && r.longitude !== null && r.aqi !== null);
    
    if (validReadings.length === 0) {
        return { mission_id: missionId, zones: [] };
    }

    const coords = validReadings.map(r => [(r.latitude * Math.PI) / 180, (r.longitude * Math.PI) / 180]);
    const eps = ZONE_RADIUS_METERS / EARTH_RADIUS_METERS;

    const labels = dbscanRadians(coords, eps, ZONE_MIN_SAMPLES);

    const clusters = {};
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label !== -1) {
            if (!clusters[label]) clusters[label] = [];
            clusters[label].push(validReadings[i]);
        }
    }

    const zones = [];

    for (const label in clusters) {
        const clusterReadings = clusters[label];
        const len = clusterReadings.length;

        const avgLat = clusterReadings.reduce((sum, r) => sum + r.latitude, 0) / len;
        const avgLon = clusterReadings.reduce((sum, r) => sum + r.longitude, 0) / len;

        const aqis = clusterReadings.map(r => r.aqi).filter(a => a !== null);
        const avgAqi = aqis.reduce((a, b) => a + b, 0) / aqis.length;
        const minAqi = Math.min(...aqis);
        const maxAqi = Math.max(...aqis);

        const pm25s = clusterReadings.map(r => r.pm25).filter(a => a !== null && a !== undefined);
        let pm25Metric = null;
        let pm25ExceedancePct = 0;
        if (pm25s.length > 0) {
            pm25Metric = {
                average: pm25s.reduce((a, b) => a + b, 0) / pm25s.length,
                minimum: Math.min(...pm25s),
                maximum: Math.max(...pm25s)
            };
            const exceedCount = pm25s.filter(v => v >= PM25_THRESHOLD).length;
            pm25ExceedancePct = (exceedCount / pm25s.length) * 100;
        }

        const pm10s = clusterReadings.map(r => r.pm10).filter(a => a !== null && a !== undefined);
        let pm10Metric = null;
        let pm10ExceedancePct = 0;
        if (pm10s.length > 0) {
            pm10Metric = {
                average: pm10s.reduce((a, b) => a + b, 0) / pm10s.length,
                minimum: Math.min(...pm10s),
                maximum: Math.max(...pm10s)
            };
            const exceedCount = pm10s.filter(v => v >= PM10_THRESHOLD).length;
            pm10ExceedancePct = (exceedCount / pm10s.length) * 100;
        }

        let dominant = null;
        if (pm25s.length > 0 || pm10s.length > 0) {
            if (pm25ExceedancePct > pm10ExceedancePct) dominant = "PM2.5";
            else if (pm10ExceedancePct > pm25ExceedancePct) dominant = "PM10";
            else if (pm25ExceedancePct > 0) dominant = "PM2.5";
        }

        const altitudes = clusterReadings.map(r => r.altitude).filter(a => a !== null && a !== undefined);
        let altitudeIntel = null;
        if (altitudes.length > 0) {
            altitudeIntel = {
                min_meters: Math.min(...altitudes),
                max_meters: Math.max(...altitudes),
                average_meters: altitudes.reduce((a, b) => a + b, 0) / altitudes.length
            };
        }

        const priorityScore = calculatePriorityScore(avgAqi, 1, avgAqi, maxAqi);
        const priorityClass = classifyPriority(priorityScore);
        const priorityIntel = {
            score: priorityScore,
            classification: priorityClass,
            recommendation: getRecommendation(priorityClass, "STABLE", false)
        };

        zones.push({
            zone_id: `ZONE-${padLeft(zones.length + 1, 2)}`,
            centroid: { latitude: avgLat, longitude: avgLon },
            radius_meters: ZONE_RADIUS_METERS,
            measurement_count: len,
            aqi: { average: avgAqi, minimum: minAqi, maximum: maxAqi },
            pm25: pm25Metric,
            pm10: pm10Metric,
            dominant_pollutant: dominant,
            severity: _getSeverity(avgAqi),
            altitude: altitudeIntel,
            priority: priorityIntel
        });
    }

    zones.sort((a, b) => {
        const scoreA = a.priority ? a.priority.score : 0;
        const scoreB = b.priority ? b.priority.score : 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.aqi.average - a.aqi.average;
    });

    zones.forEach((z, i) => {
        z.zone_id = `ZONE-${padLeft(i + 1, 2)}`;
    });

    return { mission_id: missionId, zones };
}

function calculatePersistentHotspots(hotspots, totalMissionsCount) {
    if (totalMissionsCount < 2) {
        return {
            persistent_hotspots: [],
            total: 0,
            status: "INSUFFICIENT_DATA",
            message: "At least two surveys are required."
        };
    }

    const validHotspots = hotspots.filter(h => h.latitude !== null && h.longitude !== null);

    if (validHotspots.length === 0) {
        return { persistent_hotspots: [], total: 0 };
    }

    const coords = validHotspots.map(h => [(h.latitude * Math.PI) / 180, (h.longitude * Math.PI) / 180]);
    const eps = PERSISTENT_HOTSPOT_RADIUS_METERS / EARTH_RADIUS_METERS;

    const labels = dbscanRadians(coords, eps, 2);

    const clusters = {};
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label !== -1) {
            if (!clusters[label]) clusters[label] = [];
            clusters[label].push(validHotspots[i]);
        }
    }

    const persistentList = [];

    for (const label in clusters) {
        const clusterHotspots = clusters[label];

        const distinctMissions = new Set(clusterHotspots.map(h => h.mission_id));
        if (distinctMissions.size < PERSISTENT_HOTSPOT_MIN_SURVEYS) continue;

        const avgLat = clusterHotspots.reduce((sum, h) => sum + h.latitude, 0) / clusterHotspots.length;
        const avgLon = clusterHotspots.reduce((sum, h) => sum + h.longitude, 0) / clusterHotspots.length;

        const aqis = clusterHotspots.map(h => h.peak_aqi).filter(a => a !== null);
        const avgAqis = clusterHotspots.map(h => h.average_aqi).filter(a => a !== null);

        const pm25s = clusterHotspots.map(h => h.peak_pm25).filter(a => a !== null);
        const avgPm25s = clusterHotspots.map(h => h.average_pm25).filter(a => a !== null);

        const pm10s = clusterHotspots.map(h => h.peak_pm10).filter(a => a !== null);
        const avgPm10s = clusterHotspots.map(h => h.average_pm10).filter(a => a !== null);

        const timestamps = clusterHotspots.map(h => (h.mission && h.mission.created_at) ? new Date(h.mission.created_at) : new Date());
        
        const firstDetected = new Date(Math.min(...timestamps));
        const lastDetected = new Date(Math.max(...timestamps));

        const minAlts = clusterHotspots.map(h => h.min_altitude).filter(a => a !== null);
        const maxAlts = clusterHotspots.map(h => h.max_altitude).filter(a => a !== null);
        const avgAlts = clusterHotspots.map(h => h.average_altitude).filter(a => a !== null);

        let altitudeIntel = null;
        if (minAlts.length > 0 && maxAlts.length > 0 && avgAlts.length > 0) {
            altitudeIntel = {
                min_meters: Math.min(...minAlts),
                max_meters: Math.max(...maxAlts),
                average_meters: avgAlts.reduce((a, b) => a + b, 0) / avgAlts.length
            };
        }

        clusterHotspots.sort((a, b) => {
            const dA = (a.mission && a.mission.created_at) ? new Date(a.mission.created_at).getTime() : Date.now();
            const dB = (b.mission && b.mission.created_at) ? new Date(b.mission.created_at).getTime() : Date.now();
            return dA - dB;
        });

        const historicalAqis = clusterHotspots.map(h => h.average_aqi).filter(a => a !== null);

        const trendDict = analyzeTrend(historicalAqis);
        const trendIntel = { trend: trendDict.trend, percentage: trendDict.trend_percentage };

        const avgOverallAqi = avgAqis.length > 0 ? (avgAqis.reduce((a, b) => a + b, 0) / avgAqis.length) : 0.0;
        const peakOverallAqi = aqis.length > 0 ? Math.max(...aqis) : 0.0;

        const priorityScore = calculatePriorityScore(peakOverallAqi, distinctMissions.size, avgOverallAqi, peakOverallAqi);
        const priorityClass = classifyPriority(priorityScore);
        const priorityIntel = {
            score: priorityScore,
            classification: priorityClass,
            recommendation: getRecommendation(priorityClass, trendDict.trend, true)
        };

        persistentList.push({
            hotspot_id: `PH-${padLeft(persistentList.length + 1, 3)}`,
            latitude: avgLat,
            longitude: avgLon,
            surveys_detected: distinctMissions.size,
            first_detected: firstDetected,
            last_detected: lastDetected,
            average_aqi: avgOverallAqi,
            peak_aqi: peakOverallAqi,
            average_pm25: avgPm25s.length > 0 ? avgPm25s.reduce((a,b)=>a+b,0)/avgPm25s.length : null,
            peak_pm25: pm25s.length > 0 ? Math.max(...pm25s) : null,
            average_pm10: avgPm10s.length > 0 ? avgPm10s.reduce((a,b)=>a+b,0)/avgPm10s.length : null,
            peak_pm10: pm10s.length > 0 ? Math.max(...pm10s) : null,
            surveys: Array.from(distinctMissions),
            trend_analysis: trendIntel,
            altitude: altitudeIntel,
            priority: priorityIntel
        });
    }

    persistentList.sort((a, b) => {
        if (a.surveys_detected !== b.surveys_detected) return b.surveys_detected - a.surveys_detected;
        return b.peak_aqi - a.peak_aqi;
    });

    persistentList.forEach((p, i) => {
        p.hotspot_id = `PH-${padLeft(i + 1, 3)}`;
    });

    return {
        persistent_hotspots: persistentList,
        total: persistentList.length
    };
}

module.exports = {
    calculatePollutionZones,
    calculatePersistentHotspots
};
