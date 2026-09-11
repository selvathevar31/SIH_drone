const { getCategoryFromAQI } = require('./aqi');

const HOTSPOT_MIN_SAMPLES = Number(process.env.HOTSPOT_MIN_SAMPLES || 3);
const HOTSPOT_RADIUS_METERS = Number(process.env.HOTSPOT_RADIUS_METERS || 75);

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const Math_sin = Math.sin;
    const Math_cos = Math.cos;

    const a =
        Math_sin(deltaPhi / 2) * Math_sin(deltaPhi / 2) +
        Math_cos(phi1) *
            Math_cos(phi2) *
            Math_sin(deltaLambda / 2) *
            Math_sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function regionQuery(points, pIndex, eps) {
    const neighbors = [];
    const p1 = points[pIndex];
    for (let i = 0; i < points.length; i++) {
        const p2 = points[i];
        if (haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude) <= eps) {
            neighbors.push(i);
        }
    }
    return neighbors;
}

function expandCluster(points, labels, pIndex, neighbors, clusterId, eps, minPts) {
    labels[pIndex] = clusterId;
    let i = 0;
    while (i < neighbors.length) {
        const pNeighborIndex = neighbors[i];
        if (labels[pNeighborIndex] === -1) {
            labels[pNeighborIndex] = clusterId; // change from noise to border point
        } else if (labels[pNeighborIndex] === 0) {
            labels[pNeighborIndex] = clusterId;
            const newNeighbors = regionQuery(points, pNeighborIndex, eps);
            if (newNeighbors.length >= minPts) {
                // Not the most efficient but functional for small datasets
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

function dbscan(points, eps, minPts) {
    const NOISE = -1;
    const UNCLASSIFIED = 0;
    let clusterId = 0;
    const labels = new Array(points.length).fill(UNCLASSIFIED);

    for (let i = 0; i < points.length; i++) {
        if (labels[i] !== UNCLASSIFIED) continue;

        const neighbors = regionQuery(points, i, eps);
        if (neighbors.length < minPts) {
            labels[i] = NOISE;
        } else {
            clusterId++;
            expandCluster(points, labels, i, neighbors, clusterId, eps, minPts);
        }
    }
    return labels;
}

function getPriority(val, metric) {
    if (metric === 'pm25') {
        if (val > 250) return 'P1';
        if (val > 150) return 'P2';
        if (val > 55) return 'P3';
    } else if (metric === 'pm10') {
        if (val > 424) return 'P1';
        if (val > 354) return 'P2';
        if (val > 254) return 'P3';
    } else { // default AQI
        if (val > 300) return 'P1';
        if (val > 200) return 'P2';
        if (val > 150) return 'P3';
    }
    return 'Normal';
}

function detectHotspotsForReadings(readings, metric = 'aqi') {
    if (!readings || readings.length === 0) return [];

    let minThreshold = 100; // default for AQI
    if (metric === 'pm25') minThreshold = 35.4; // Unhealthy for Sensitive Groups
    else if (metric === 'pm10') minThreshold = 154; // Unhealthy for Sensitive Groups
    else minThreshold = 100; // AQI

    const highReadings = readings.filter((r) => {
        const val = r[metric];
        return val !== null && val !== undefined && val >= minThreshold;
    });

    if (highReadings.length < HOTSPOT_MIN_SAMPLES) return [];

    const labels = dbscan(highReadings, HOTSPOT_RADIUS_METERS, HOTSPOT_MIN_SAMPLES);

    const clusters = {};
    for (let i = 0; i < highReadings.length; i++) {
        const clusterId = labels[i];
        if (clusterId !== -1) {
            if (!clusters[clusterId]) clusters[clusterId] = [];
            clusters[clusterId].push(highReadings[i]);
        }
    }

    const hotspots = [];

    for (const clusterId in clusters) {
        const group = clusters[clusterId];
        let sumLat = 0, sumLng = 0;
        let sumAqi = 0, maxAqi = -Infinity;
        let sumPm25 = 0, maxPm25 = -Infinity;
        let sumPm10 = 0, maxPm10 = -Infinity;
        
        let minAltitude = Infinity;
        let maxAltitude = -Infinity;
        let sumAltitude = 0;
        let altitudeCount = 0;

        for (const r of group) {
            sumLat += r.latitude;
            sumLng += r.longitude;
            sumAqi += r.aqi;
            if (r.aqi > maxAqi) maxAqi = r.aqi;
            
            if (r.pm25 !== null && r.pm25 !== undefined) {
                sumPm25 += r.pm25;
                if (r.pm25 > maxPm25) maxPm25 = r.pm25;
            }
            if (r.pm10 !== null && r.pm10 !== undefined) {
                sumPm10 += r.pm10;
                if (r.pm10 > maxPm10) maxPm10 = r.pm10;
            }

            if (r.altitude !== null && r.altitude !== undefined) {
                if (r.altitude < minAltitude) minAltitude = r.altitude;
                if (r.altitude > maxAltitude) maxAltitude = r.altitude;
                sumAltitude += r.altitude;
                altitudeCount++;
            }
        }

        const count = group.length;

        hotspots.push({
            latitude: sumLat / count,
            longitude: sumLng / count,
            radius_meters: HOTSPOT_RADIUS_METERS,
            average_aqi: sumAqi / count,
            peak_aqi: maxAqi,
            average_pm25: sumPm25 > 0 ? (sumPm25 / count) : null,
            peak_pm25: maxPm25 !== -Infinity ? maxPm25 : null,
            average_pm10: sumPm10 > 0 ? (sumPm10 / count) : null,
            peak_pm10: maxPm10 !== -Infinity ? maxPm10 : null,
            severity: getCategoryFromAQI(maxAqi),
            priority: getPriority(metric === 'pm25' ? maxPm25 : (metric === 'pm10' ? maxPm10 : maxAqi), metric),
            metric_value: metric === 'pm25' ? maxPm25 : (metric === 'pm10' ? maxPm10 : maxAqi),
            reading_count: count,
            min_altitude: altitudeCount > 0 ? minAltitude : null,
            max_altitude: altitudeCount > 0 ? maxAltitude : null,
            average_altitude: altitudeCount > 0 ? (sumAltitude / altitudeCount) : null
        });
    }

    return hotspots;
}

module.exports = {
    detectHotspotsForReadings
};
