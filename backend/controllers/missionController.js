const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const { calculatePollutionZones } = require('../services/pollutionZones');
const { compareMissionsData } = require('../services/comparison');

const parseDate = (d) => d ? new Date(d) : undefined;

exports.getMissions = async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const missions = await Mission.find().sort({ created_at: -1 }).limit(limit);
    
    if (missions.length === 0) return res.json([]);
    
    const missionIds = missions.map(m => m.mission_id);
    
    const readingStatsRaw = await Reading.aggregate([
        { $match: { mission_id: { $in: missionIds } } },
        { $group: {
            _id: "$mission_id",
            average_aqi: { $avg: "$aqi" },
            peak_aqi: { $max: "$aqi" },
            average_pm25: { $avg: "$pm25" },
            peak_pm25: { $max: "$pm25" },
            average_pm10: { $avg: "$pm10" },
            peak_pm10: { $max: "$pm10" },
            average_temperature: { $avg: "$temperature" },
            average_humidity: { $avg: "$humidity" }
        }}
    ]);
    
    const statsDict = {};
    readingStatsRaw.forEach(s => { statsDict[s._id] = s; });
    
    const hotspotStatsRaw = await Hotspot.aggregate([
        { $match: { mission_id: { $in: missionIds } } },
        { $group: { _id: "$mission_id", count: { $sum: 1 } } }
    ]);
    
    const hotspotsDict = {};
    hotspotStatsRaw.forEach(s => { hotspotsDict[s._id] = s.count; });
    
    const result = missions.map(m => {
        const stats = statsDict[m.mission_id] || {};
        const hotspotCount = hotspotsDict[m.mission_id] || 0;
        return {
            id: m._id,
            mission_id: m.mission_id,
            drone_id: m.drone_id,
            status: m.status,
            data_source: m.data_source,
            start_time: m.start_time,
            end_time: m.end_time,
            duration_seconds: m.duration_seconds,
            distance_km: m.distance_km,
            total_readings: m.total_readings,
            created_at: m.created_at,
            average_aqi: stats.average_aqi || 0,
            peak_aqi: stats.peak_aqi || 0,
            average_pm25: stats.average_pm25 || 0,
            peak_pm25: stats.peak_pm25 || 0,
            average_pm10: stats.average_pm10 || 0,
            peak_pm10: stats.peak_pm10 || 0,
            average_temperature: stats.average_temperature || 0,
            average_humidity: stats.average_humidity || 0,
            hotspot_count: hotspotCount
        };
    });
    
    res.json(result);
};

exports.getMission = async (req, res) => {
    const mission = await Mission.findOne({ mission_id: req.params.mission_id });
    if (!mission) {
        return res.json({
            mission_id: req.params.mission_id,
            drone_id: "UNKNOWN",
            status: "OFFLINE",
            data_source: "UNKNOWN",
            start_time: new Date(),
            end_time: null,
            duration_seconds: 0,
            distance_km: 0,
            total_readings: 0,
            created_at: new Date()
        });
    }
    res.json(mission);
};

exports.createMission = async (req, res) => {
    const existing = await Mission.findOne({ mission_id: req.body.mission_id });
    if (existing) {
        res.status(400);
        throw new Error("Mission already exists");
    }
    
    const mission = new Mission({
        mission_id: req.body.mission_id,
        drone_id: req.body.drone_id,
        status: req.body.status || "PLANNED",
        data_source: req.body.data_source || "UNKNOWN",
        start_time: req.body.start_time ? new Date(req.body.start_time) : new Date()
    });
    
    await mission.save();
    res.status(201).json(mission);
};

exports.updateMission = async (req, res) => {
    const mission = await Mission.findOneAndUpdate({ mission_id: req.params.mission_id }, req.body, { new: true });
    if (!mission) {
        res.status(404);
        throw new Error(`Mission '${req.params.mission_id}' not found`);
    }
    res.json(mission);
};

exports.deleteMission = async (req, res) => {
    const mission = await Mission.findOneAndDelete({ mission_id: req.params.mission_id });
    if (!mission) {
        res.status(404);
        throw new Error(`Mission '${req.params.mission_id}' not found`);
    }
    res.status(204).send();
};

exports.getMissionReadings = async (req, res) => {
    const { mission_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const start_time = req.query.start_time ? parseDate(req.query.start_time.replace('Z', '+00:00')) : null;
    const end_time = req.query.end_time ? parseDate(req.query.end_time.replace('Z', '+00:00')) : null;
    
    if (page < 1) { res.status(400); throw new Error("page must be >= 1"); }
    if (limit < 1 || limit > 1000) { res.status(400); throw new Error("limit must be between 1 and 1000"); }
    
    const filter = { mission_id };
    if (start_time || end_time) {
        filter.timestamp = {};
        if (start_time) filter.timestamp.$gte = start_time;
        if (end_time) filter.timestamp.$lte = end_time;
    }
    if (req.query.aqi_min !== undefined) filter.aqi = { ...filter.aqi, $gte: parseInt(req.query.aqi_min) };
    if (req.query.aqi_max !== undefined) filter.aqi = { ...filter.aqi, $lte: parseInt(req.query.aqi_max) };
    if (req.query.pm25_min !== undefined) filter.pm25 = { ...filter.pm25, $gte: parseFloat(req.query.pm25_min) };
    if (req.query.pm25_max !== undefined) filter.pm25 = { ...filter.pm25, $lte: parseFloat(req.query.pm25_max) };

    const total = await Reading.countDocuments(filter);
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    
    const sortField = req.query.sort_by || "timestamp";
    const sortOrder = req.query.sort_order === "asc" ? 1 : -1;
    
    const items = await Reading.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit);
        
    let validGps = 0, missingPm1 = 0, missingPm25 = 0, missingPm10 = 0, missingTemp = 0, missingHumid = 0;
    items.forEach(r => {
        if (r.latitude !== null && r.longitude !== null && !(r.latitude === 0 && r.longitude === 0) && r.latitude !== -90 && r.latitude !== 90) validGps++;
        if (r.pm1 === null) missingPm1++;
        if (r.pm25 === null) missingPm25++;
        if (r.pm10 === null) missingPm10++;
        if (r.temperature === null) missingTemp++;
        if (r.humidity === null) missingHumid++;
    });
    
    res.json({
        items,
        page,
        limit,
        total,
        pages,
        data_quality: {
            total_readings: items.length,
            valid_gps: validGps,
            missing_pm1: missingPm1,
            missing_pm25: missingPm25,
            missing_pm10: missingPm10,
            missing_temperature: missingTemp,
            missing_humidity: missingHumid
        }
    });
};

exports.getMissionAnalytics = async (req, res) => {
    const { mission_id } = req.params;
    const mission = await Mission.findOne({ mission_id });
    if (!mission) {
        return res.json({
            mission: { mission_id, status: "OFFLINE", duration_seconds: 0, distance_km: 0, total_readings: 0 },
            flight: { duration_seconds: 0, distance_km: 0, total_readings: 0, max_altitude: 0, min_altitude: 0, average_speed: 0, max_speed: 0 },
            environment: {
                aqi: { average: 0, minimum: 0, maximum: 0 },
                pm1: { average: 0, minimum: 0, maximum: 0 },
                pm25: { average: 0, minimum: 0, maximum: 0 },
                pm10: { average: 0, minimum: 0, maximum: 0 },
                temperature: { average: 0, minimum: 0, maximum: 0 },
                humidity: { average: 0, minimum: 0, maximum: 0 }
            },
            hotspots: { count: 0, highest_aqi: null, average_aqi: null }
        });
    }
    
    const rStats = await Reading.aggregate([
        { $match: { mission_id } },
        { $group: {
            _id: null,
            avg_aqi: { $avg: "$aqi" }, min_aqi: { $min: "$aqi" }, max_aqi: { $max: "$aqi" },
            avg_pm1: { $avg: "$pm1" }, min_pm1: { $min: "$pm1" }, max_pm1: { $max: "$pm1" },
            avg_pm25: { $avg: "$pm25" }, min_pm25: { $min: "$pm25" }, max_pm25: { $max: "$pm25" },
            avg_pm10: { $avg: "$pm10" }, min_pm10: { $min: "$pm10" }, max_pm10: { $max: "$pm10" },
            avg_temperature: { $avg: "$temperature" }, min_temperature: { $min: "$temperature" }, max_temperature: { $max: "$temperature" },
            avg_humidity: { $avg: "$humidity" }, min_humidity: { $min: "$humidity" }, max_humidity: { $max: "$humidity" },
            min_altitude: { $min: "$altitude" }, max_altitude: { $max: "$altitude" },
            avg_speed: { $avg: "$speed" }, max_speed: { $max: "$speed" }
        }}
    ]);
    
    const rs = rStats[0] || {};
    
    const hStats = await Hotspot.aggregate([
        { $match: { mission_id } },
        { $group: { _id: null, count: { $sum: 1 }, highest_aqi: { $max: "$peak_aqi" }, average_aqi: { $avg: "$average_aqi" } } }
    ]);
    const hs = hStats[0] || { count: 0, highest_aqi: null, average_aqi: null };
    
    res.json({
        mission: mission,
        flight: {
            duration_seconds: mission.duration_seconds,
            distance_km: mission.distance_km,
            total_readings: mission.total_readings,
            max_altitude: rs.max_altitude,
            min_altitude: rs.min_altitude,
            average_speed: rs.avg_speed,
            max_speed: rs.max_speed
        },
        environment: {
            aqi: { average: rs.avg_aqi || 0, minimum: rs.min_aqi || 0, maximum: rs.max_aqi || 0 },
            pm1: { average: rs.avg_pm1 || 0, minimum: rs.min_pm1 || 0, maximum: rs.max_pm1 || 0 },
            pm25: { average: rs.avg_pm25 || 0, minimum: rs.min_pm25 || 0, maximum: rs.max_pm25 || 0 },
            pm10: { average: rs.avg_pm10 || 0, minimum: rs.min_pm10 || 0, maximum: rs.max_pm10 || 0 },
            temperature: { average: rs.avg_temperature || 0, minimum: rs.min_temperature || 0, maximum: rs.max_temperature || 0 },
            humidity: { average: rs.avg_humidity || 0, minimum: rs.min_humidity || 0, maximum: rs.max_humidity || 0 }
        },
        hotspots: {
            count: hs.count,
            highest_aqi: hs.highest_aqi,
            average_aqi: hs.average_aqi
        }
    });
};

exports.getMissionZones = async (req, res) => {
    const { mission_id } = req.params;
    const mission = await Mission.findOne({ mission_id });
    if (!mission) {
        return res.json({ mission_id, zones: [] });
    }
    
    const readings = await Reading.find({ mission_id });
    const result = calculatePollutionZones(mission_id, readings);
    res.json(result);
};

exports.compareMissions = async (req, res) => {
    const { mission_id, previous_mission_id } = req.params;
    if (mission_id === previous_mission_id) {
        res.status(400);
        throw new Error("Cannot compare a mission to itself");
    }
    
    const currentMission = await Mission.findOne({ mission_id });
    if (!currentMission) { res.status(404); throw new Error(`Current mission '${mission_id}' not found`); }
    
    const previousMission = await Mission.findOne({ mission_id: previous_mission_id });
    if (!previousMission) { res.status(404); throw new Error(`Previous mission '${previous_mission_id}' not found`); }
    
    const currentReadings = await Reading.find({ mission_id });
    const previousReadings = await Reading.find({ mission_id: previous_mission_id });
    const currentHotspots = await Hotspot.find({ mission_id });
    const previousHotspots = await Hotspot.find({ mission_id: previous_mission_id });
    
    const result = compareMissionsData(currentMission, previousMission, currentReadings, previousReadings, currentHotspots, previousHotspots);
    res.json(result);
};

// Properly mocked structural endpoints to prevent React crashes
exports.getMissionLiveState = async (req, res) => {
    const { mission_id } = req.params;
    const mission = await Mission.findOne({ mission_id });
    
    // Instead of throwing a 404 and crashing the frontend, return an empty template
    if (!mission) {
        return res.json({
            mission_id: mission_id,
            status: "OFFLINE",
            drone_id: "UNKNOWN",
            latest_timestamp: null,
            current_location: { latitude: null, longitude: null },
            current_altitude: null,
            current_speed: null,
            current_heading: null,
            battery: null,
            gps_status: "NO_SIGNAL",
            latest_environment: {
                aqi: null, aqi_category: "UNKNOWN", pm25: null, pm10: null, temperature: null, humidity: null
            },
            active_alerts: [],
            latest_event: null
        });
    }
    
    const latestReading = await Reading.findOne({ mission_id }).sort({ timestamp: -1 });
    
    res.json({
        mission_id: mission.mission_id,
        status: mission.status,
        drone_id: mission.drone_id,
        latest_timestamp: latestReading ? latestReading.timestamp.toISOString() : null,
        current_location: {
            latitude: latestReading ? latestReading.latitude : null,
            longitude: latestReading ? latestReading.longitude : null
        },
        current_altitude: latestReading ? latestReading.altitude : null,
        current_speed: latestReading ? latestReading.speed : null,
        current_heading: latestReading ? latestReading.heading : null,
        battery: latestReading ? latestReading.battery : null,
        gps_status: latestReading ? latestReading.gps_status : "NO_SIGNAL",
        latest_environment: {
            aqi: latestReading ? latestReading.aqi : null,
            aqi_category: latestReading ? latestReading.aqi_category : "UNKNOWN",
            pm25: latestReading ? latestReading.pm25 : null,
            pm10: latestReading ? latestReading.pm10 : null,
            temperature: latestReading ? latestReading.temperature : null,
            humidity: latestReading ? latestReading.humidity : null
        },
        active_alerts: [],
        latest_event: null
    });
};

exports.getMissionIntelligence = async (req, res) => {
    res.json({
        mission_id: req.params.mission_id,
        summary: "Intelligence module not fully ported.",
        zones: [],
        trends: {},
        recommendations: []
    });
};

exports.getMissionEvents = async (req, res) => res.json([]);
exports.getMissionDecision = async (req, res) => res.json({ action: "NONE", confidence: 0, reason: "Mocked" });
exports.getMissionReport = async (req, res) => res.json({ analytics: {}, replay_timeline: [] });
exports.exportMissionReadings = async (req, res) => res.send("");
exports.getEnvironmentalAnalytics = async (req, res) => res.json({ 
    mission_id: req.params.mission_id,
    metrics: {}
});
