const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const { detectHotspotsForReadings } = require('./hotspotDetector');

const CACHE_FILE = path.join(__dirname, '../../data/local_cache.json');

// In-memory cache when MongoDB is offline
const memoryStore = {
    missions: [],
    readings: [],
    hotspots: []
};

function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

function persist() {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    } catch (err) {
        console.warn('[dataStore] Failed to persist cache:', err.message);
    }
}

function loadPersisted() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            if (data && Array.isArray(data.missions) && data.missions.length > 0) {
                memoryStore.missions = data.missions.map(m => ({
                    ...m,
                    start_time: m.start_time ? new Date(m.start_time) : null,
                    end_time: m.end_time ? new Date(m.end_time) : null,
                    created_at: m.created_at ? new Date(m.created_at) : null
                }));
                memoryStore.readings = (data.readings || []).map(r => ({
                    ...r,
                    timestamp: r.timestamp ? new Date(r.timestamp) : new Date()
                }));
                memoryStore.hotspots = (data.hotspots || []).map(h => ({
                    ...h,
                    detected_at: h.detected_at ? new Date(h.detected_at) : new Date()
                }));
                return true;
            }
        }
    } catch (err) {
        console.warn('[dataStore] Failed to load persisted cache:', err.message);
    }
    return false;
}

// Pre-seed demo Anand Vihar data into in-memory store so UI has data out-of-the-box
function seedDemoData() {
    const missionId = "SIM-Anand-Vihar-01";
    if (memoryStore.missions.some(m => m.mission_id === missionId)) return;

    const baseLat = 28.6469;
    const baseLon = 77.3160;
    const startTime = new Date(Date.now() - 3600 * 1000);
    const numPoints = 120;
    const readings = [];

    for (let i = 0; i < numPoints; i++) {
        const pointTime = new Date(startTime.getTime() + i * 30 * 1000);
        const latOffset = (Math.random() - 0.5) * 0.3;
        const lonOffset = (Math.random() - 0.5) * 0.3;
        const lat = baseLat + latOffset;
        const lon = baseLon + lonOffset;
        const alt = 45 + Math.random() * 20;

        const distFromCenter = Math.sqrt(latOffset * latOffset + lonOffset * lonOffset);
        let pm25 = 30 + Math.random() * 30;
        if (distFromCenter < 0.06) {
            pm25 += (0.06 - distFromCenter) * 1200 + Math.random() * 40;
        } else if (distFromCenter < 0.12) {
            pm25 += (0.12 - distFromCenter) * 400 + Math.random() * 20;
        }
        const pm10 = pm25 * 1.65 + Math.random() * 8;
        const aqi = Math.round(pm25 * 1.8);
        const temp = 28.5 + Math.sin(i * 0.05) * 2;
        const hum = 65 - Math.sin(i * 0.05) * 5;

        const no2 = pm25 * 0.4 + Math.random() * 5;
        const so2 = pm25 * 0.2 + Math.random() * 3;
        const co = pm25 * 0.01 + Math.random() * 0.2;
        const o3 = Math.max(0, 30 + Math.random() * 20 - (pm25 * 0.1));

        readings.push({
            _id: `r-${i}`,
            mission_id: missionId,
            timestamp: pointTime,
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
            altitude: parseFloat(alt.toFixed(1)),
            pm25: parseFloat(pm25.toFixed(1)),
            pm10: parseFloat(pm10.toFixed(1)),
            aqi: aqi,
            temperature: parseFloat(temp.toFixed(1)),
            humidity: parseFloat(hum.toFixed(1)),
            no2: parseFloat(no2.toFixed(1)),
            so2: parseFloat(so2.toFixed(1)),
            co: parseFloat(co.toFixed(2)),
            o3: parseFloat(o3.toFixed(1)),
            speed: 4.5,
            heading: (i * 15) % 360,
            battery: Math.max(20, 100 - Math.round(i * 0.6))
        });
    }

    const mission = {
        _id: "m-anand-vihar-01",
        mission_id: missionId,
        data_source: "Demo_Anand_Vihar_Survey.csv",
        status: "COMPLETED",
        start_time: startTime,
        end_time: new Date(startTime.getTime() + numPoints * 30 * 1000),
        duration_seconds: numPoints * 30,
        distance_km: 2.85,
        total_readings: readings.length,
        created_at: startTime
    };

    const hotspots = detectHotspotsForReadings(readings).map((h, idx) => ({
        ...h,
        _id: `hs-${idx}`,
        mission_id: missionId,
        detected_at: new Date(startTime.getTime() + 60 * 30 * 1000)
    }));

    memoryStore.missions.push(mission);
    memoryStore.readings.push(...readings);
    memoryStore.hotspots.push(...hotspots);
    persist();
}

// Initialize seed or load cached
if (!loadPersisted()) {
    seedDemoData();
}

module.exports = {
    isMongoConnected,
    memoryStore,
    seedDemoData,
    persist,

    async saveMission(missionDoc) {
        if (isMongoConnected()) {
            return await missionDoc.save();
        }
        const existingIdx = memoryStore.missions.findIndex(m => m.mission_id === missionDoc.mission_id);
        const plain = missionDoc.toObject ? missionDoc.toObject() : { ...missionDoc };
        if (!plain._id) {
            plain._id = `m-${Date.now()}`;
        }
        if (existingIdx >= 0) {
            memoryStore.missions[existingIdx] = plain;
        } else {
            memoryStore.missions.unshift(plain);
        }
        persist();
        return plain;
    },

    async deleteMission(missionId) {
        if (isMongoConnected()) {
            return await Mission.findOneAndDelete({ mission_id: missionId });
        }
        const idx = memoryStore.missions.findIndex(m => m.mission_id === missionId);
        if (idx >= 0) {
            const removed = memoryStore.missions.splice(idx, 1)[0];
            memoryStore.readings = memoryStore.readings.filter(r => r.mission_id !== missionId);
            memoryStore.hotspots = memoryStore.hotspots.filter(h => h.mission_id !== missionId);
            persist();
            return removed;
        }
        return null;
    },

    async findMissions(limit = 100) {
        if (isMongoConnected()) {
            return await Mission.find().sort({ created_at: -1 }).limit(limit).lean();
        }
        return memoryStore.missions.slice(0, limit);
    },

    async findMission(missionId) {
        if (isMongoConnected()) {
            return await Mission.findOne({ mission_id: missionId }).lean();
        }
        return memoryStore.missions.find(m => m.mission_id === missionId) || null;
    },

    async insertReadings(readingsArray) {
        if (isMongoConnected()) {
            return await Reading.insertMany(readingsArray);
        }
        const plain = readingsArray.map((r, i) => ({
            _id: r._id || `r-${Date.now()}-${i}`,
            ...r
        }));
        memoryStore.readings.push(...plain);
        persist();
        return plain;
    },

    async findReadings(filter = {}) {
        if (isMongoConnected()) {
            return await Reading.find(filter).sort({ timestamp: 1 }).lean();
        }
        return memoryStore.readings.filter(r => {
            if (filter.mission_id && r.mission_id !== filter.mission_id) return false;
            if (filter.latitude) {
                if (filter.latitude.$ne !== undefined && r.latitude == null) return false;
                if (filter.latitude.$gte !== undefined && r.latitude < filter.latitude.$gte) return false;
                if (filter.latitude.$lte !== undefined && r.latitude > filter.latitude.$lte) return false;
            }
            if (filter.longitude) {
                if (filter.longitude.$ne !== undefined && r.longitude == null) return false;
                if (filter.longitude.$gte !== undefined && r.longitude < filter.longitude.$gte) return false;
                if (filter.longitude.$lte !== undefined && r.longitude > filter.longitude.$lte) return false;
            }
            if (filter.timestamp) {
                const t = new Date(r.timestamp).getTime();
                if (filter.timestamp.$gte && t < new Date(filter.timestamp.$gte).getTime()) return false;
                if (filter.timestamp.$lte && t > new Date(filter.timestamp.$lte).getTime()) return false;
            }
            if (filter.aqi) {
                if (filter.aqi.$gte !== undefined && (r.aqi == null || r.aqi < filter.aqi.$gte)) return false;
                if (filter.aqi.$lte !== undefined && (r.aqi == null || r.aqi > filter.aqi.$lte)) return false;
            }
            if (filter.pm25) {
                if (filter.pm25.$gte !== undefined && (r.pm25 == null || r.pm25 < filter.pm25.$gte)) return false;
                if (filter.pm25.$lte !== undefined && (r.pm25 == null || r.pm25 > filter.pm25.$lte)) return false;
            }
            return true;
        }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },

    async findReadingById(readingId) {
        if (isMongoConnected()) {
            return await Reading.findById(readingId).lean();
        }
        return memoryStore.readings.find(r => String(r._id) === String(readingId)) || null;
    },

    async insertHotspots(hotspotsArray) {
        if (isMongoConnected()) {
            return await Hotspot.insertMany(hotspotsArray);
        }
        const plain = hotspotsArray.map((h, i) => ({
            _id: h._id || `hs-${Date.now()}-${i}`,
            ...h
        }));
        memoryStore.hotspots.push(...plain);
        persist();
        return plain;
    },

    async findHotspots(filter = {}) {
        if (isMongoConnected()) {
            return await Hotspot.find(filter).sort({ detected_at: -1 }).lean();
        }
        return memoryStore.hotspots.filter(h => {
            if (filter.mission_id && h.mission_id !== filter.mission_id) return false;
            return true;
        });
    }
};
