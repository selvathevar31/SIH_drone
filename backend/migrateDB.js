const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const { open } = require('sqlite');
require('dotenv').config();

const Mission = require('./models/Mission');
const Reading = require('./models/Reading');
const Hotspot = require('./models/Hotspot');
const ResponseSimulation = require('./models/ResponseSimulation');

async function migrate() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qudracopterDB');
    console.log("Connected to MongoDB.");

    console.log("Opening SQLite database...");
    const db = await open({
        filename: './test_public_api.db',
        driver: sqlite3.Database
    });
    console.log("Opened SQLite database.");

    // Migrate Missions
    console.log("Migrating Missions...");
    const missions = await db.all('SELECT * FROM missions');
    for (const m of missions) {
        await Mission.findOneAndUpdate({ mission_id: m.mission_id }, {
            mission_id: m.mission_id,
            drone_id: m.drone_id,
            status: m.status,
            data_source: m.data_source,
            start_time: m.start_time ? new Date(m.start_time + 'Z') : null,
            end_time: m.end_time ? new Date(m.end_time + 'Z') : null,
            duration_seconds: m.duration_seconds,
            distance_km: m.distance_km,
            total_readings: m.total_readings,
            created_at: m.created_at ? new Date(m.created_at + 'Z') : new Date()
        }, { upsert: true });
    }
    console.log(`Migrated ${missions.length} missions.`);

    // Migrate Readings
    console.log("Migrating Readings...");
    const readings = await db.all('SELECT * FROM readings');
    // Clear existing to avoid duplicates if re-run
    await Reading.deleteMany({});
    
    // Batch insert readings
    const readingDocs = readings.map(r => ({
        mission_id: r.mission_id,
        data_source: r.data_source,
        timestamp: new Date(r.timestamp + 'Z'),
        latitude: r.latitude,
        longitude: r.longitude,
        altitude: r.altitude,
        altitude_reference: r.altitude_reference,
        pm1: r.pm1,
        pm25: r.pm25,
        pm10: r.pm10,
        temperature: r.temperature,
        humidity: r.humidity,
        aqi: r.aqi,
        aqi_category: r.aqi_category,
        speed: r.speed,
        heading: r.heading,
        battery: r.battery,
        gps_status: r.gps_status
    }));
    
    const batchSize = 1000;
    for (let i = 0; i < readingDocs.length; i += batchSize) {
        await Reading.insertMany(readingDocs.slice(i, i + batchSize));
    }
    console.log(`Migrated ${readings.length} readings.`);

    // Migrate Hotspots
    console.log("Migrating Hotspots...");
    const hotspots = await db.all('SELECT * FROM hotspots');
    await Hotspot.deleteMany({});
    
    const hotspotDocs = hotspots.map(h => ({
        mission_id: h.mission_id,
        latitude: h.latitude,
        longitude: h.longitude,
        radius_meters: h.radius_meters,
        average_aqi: h.average_aqi,
        peak_aqi: h.peak_aqi,
        average_pm25: h.average_pm25,
        peak_pm25: h.peak_pm25,
        average_pm10: h.average_pm10,
        peak_pm10: h.peak_pm10,
        severity: h.severity,
        reading_count: h.reading_count,
        min_altitude: h.min_altitude,
        max_altitude: h.max_altitude,
        average_altitude: h.average_altitude,
        detected_at: h.detected_at ? new Date(h.detected_at + 'Z') : new Date()
    }));
    
    if (hotspotDocs.length > 0) {
        await Hotspot.insertMany(hotspotDocs);
    }
    console.log(`Migrated ${hotspots.length} hotspots.`);

    console.log("Migration completely successfully!");
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
