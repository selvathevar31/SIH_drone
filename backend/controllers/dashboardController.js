const dataStore = require('../services/dataStore');

exports.getSummary = async (req, res) => {
    const missions = await dataStore.findMissions();
    const hotspots = await dataStore.findHotspots();
    const activeMissions = missions.filter(m => ["IN_FLIGHT", "PLANNED"].includes(m.status)).length;
    
    res.json({
        total_missions: missions.length,
        total_hotspots: hotspots.length,
        active_missions: activeMissions,
        system_status: "ONLINE"
    });
};

exports.getDashboardData = async (req, res) => {
    const { mission_id } = req.params;
    
    // Parse time filters if provided
    let timeFilter = {};
    if (req.query.start_time) {
        timeFilter.$gte = new Date(req.query.start_time.replace('Z', '+00:00'));
    }
    if (req.query.end_time) {
        timeFilter.$lte = new Date(req.query.end_time.replace('Z', '+00:00'));
    }

    const mission = await dataStore.findMission(mission_id);
    
    if (!mission) {
        // Graceful fallback for empty database
        return res.json({
            mission: { mission_id, status: "OFFLINE", start_time: new Date(), end_time: null },
            mission_stats: { duration_seconds: 0, distance_km: 0, total_readings: 0, average_aqi: 0, peak_aqi: 0 },
            telemetry: [],
            trend: [],
            flight_path: [],
            current_location: null,
            current_environment: null,
            hotspots: []
        });
    }

    // Fetch readings, sorted chronologically
    console.log(`[DEBUG DASHBOARD] Querying telemetry for missionId: ${mission_id}`);
    const readings = await dataStore.findReadings({ mission_id });
    console.log(`[DEBUG DASHBOARD] Returned telemetry count: ${readings.length}`);
    
    const hotspots = await dataStore.findHotspots({ mission_id });

    // Aggregate stats
    let totalAqi = 0, peakAqi = 0, aqiCount = 0;
    let totalPm25 = 0, peakPm25 = 0, pm25Count = 0;
    let totalPm10 = 0, peakPm10 = 0, pm10Count = 0;
    let totalTemp = 0, tempCount = 0;
    let totalHum = 0, humCount = 0;
    let totalAlt = 0, altCount = 0;
    
    const telemetry = [];
    
    readings.forEach(r => {
        if (r.aqi !== null) { totalAqi += r.aqi; aqiCount++; if (r.aqi > peakAqi) peakAqi = r.aqi; }
        if (r.pm25 !== null) { totalPm25 += r.pm25; pm25Count++; if (r.pm25 > peakPm25) peakPm25 = r.pm25; }
        if (r.pm10 !== null) { totalPm10 += r.pm10; pm10Count++; if (r.pm10 > peakPm10) peakPm10 = r.pm10; }
        if (r.temperature !== null) { totalTemp += r.temperature; tempCount++; }
        if (r.humidity !== null) { totalHum += r.humidity; humCount++; }
        if (r.altitude !== null) { totalAlt += r.altitude; altCount++; }
        
        telemetry.push({
            id: r._id,
            missionId: r.mission_id,
            timestamp: r.timestamp.toISOString(),
            latitude: r.latitude,
            longitude: r.longitude,
            altitude: r.altitude,
            pm25: r.pm25,
            pm10: r.pm10,
            aqi: r.aqi,
            temperature: r.temperature,
            humidity: r.humidity,
            no2: r.no2,
            so2: r.so2,
            co: r.co,
            o3: r.o3
        });
    });

    const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

    res.json({
        mission: mission,
        mission_stats: {
            duration_seconds: mission.duration_seconds || 0,
            distance_km: mission.distance_km || 0,
            total_readings: mission.total_readings || 0,
            avg_aqi: aqiCount > 0 ? (totalAqi / aqiCount) : null,
            max_aqi: peakAqi || null,
            avg_pm25: pm25Count > 0 ? (totalPm25 / pm25Count) : null,
            max_pm25: peakPm25 || null,
            avg_pm10: pm10Count > 0 ? (totalPm10 / pm10Count) : null,
            max_pm10: peakPm10 || null,
            avg_temperature: tempCount > 0 ? (totalTemp / tempCount) : null,
            avg_humidity: humCount > 0 ? (totalHum / humCount) : null,
            avg_altitude: altCount > 0 ? (totalAlt / altCount) : null,
            hotspot_count: hotspots.length
        },
        telemetry: telemetry,
        trend: telemetry,
        flight_path: telemetry.map(p => ({
            timestamp: p.timestamp,
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude
        })),
        current_location: latestReading ? {
            latitude: latestReading.latitude,
            longitude: latestReading.longitude,
            altitude: latestReading.altitude,
            heading: latestReading.heading
        } : null,
        current_environment: latestReading ? {
            aqi: latestReading.aqi,
            temperature: latestReading.temperature,
            humidity: latestReading.humidity,
            pm25: latestReading.pm25,
            pm10: latestReading.pm10
        } : null,
        hotspots: hotspots
    });
};
