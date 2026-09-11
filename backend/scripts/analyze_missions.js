const mongoose = require('mongoose');
require('dotenv').config();

async function analyzeMissions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Reading = require('./models/Reading');
        
        const allDocs = await Reading.find({}).sort({ timestamp: 1 }).lean();
        
        if (allDocs.length === 0) {
            console.log("No readings found.");
            process.exit(0);
        }

        // 1. Group by mission
        const missions = {};
        allDocs.forEach(doc => {
            const mId = doc.mission_id || "UNKNOWN";
            if (!missions[mId]) {
                missions[mId] = {
                    count: 0,
                    start: null,
                    end: null,
                    minLat: Infinity, maxLat: -Infinity,
                    minLng: Infinity, maxLng: -Infinity,
                    docs: []
                };
            }
            const m = missions[mId];
            m.count++;
            m.docs.push(doc);
            if (!m.start || doc.timestamp < m.start) m.start = doc.timestamp;
            if (!m.end || doc.timestamp > m.end) m.end = doc.timestamp;
            if (doc.latitude < m.minLat) m.minLat = doc.latitude;
            if (doc.latitude > m.maxLat) m.maxLat = doc.latitude;
            if (doc.longitude < m.minLng) m.minLng = doc.longitude;
            if (doc.longitude > m.maxLng) m.maxLng = doc.longitude;
        });

        console.log("=== MISSION ANALYSIS ===");
        for (const [mId, m] of Object.entries(missions)) {
            const durationHrs = (m.end - m.start) / (1000 * 60 * 60);
            console.log(`Mission ID: ${mId}`);
            console.log(`  - Records: ${m.count}`);
            console.log(`  - Start: ${m.start.toISOString()}`);
            console.log(`  - End: ${m.end.toISOString()}`);
            console.log(`  - Duration: ${durationHrs.toFixed(2)} hours`);
            console.log(`  - Bbox: Lat[${m.minLat.toFixed(6)}, ${m.maxLat.toFixed(6)}] Lng[${m.minLng.toFixed(6)}, ${m.maxLng.toFixed(6)}]`);
        }

        // 2. Duplicate Timestamps & Intervals
        let uniqueTimestamps = new Set();
        let validAqiCount = 0;
        let tsList = [];

        allDocs.forEach(doc => {
            uniqueTimestamps.add(doc.timestamp.getTime());
            if (doc.aqi !== null && doc.aqi !== undefined) {
                validAqiCount++;
            }
        });

        // Collect unique timestamps in sorted order
        tsList = Array.from(uniqueTimestamps).sort((a, b) => a - b);
        let duplicateTimestamps = allDocs.length - tsList.length;

        let intervals = [];
        for (let i = 1; i < tsList.length; i++) {
            intervals.push(tsList[i] - tsList[i-1]);
        }
        intervals.sort((a,b) => a-b);
        const minInt = intervals.length > 0 ? intervals[0] : 0;
        const maxInt = intervals.length > 0 ? intervals[intervals.length - 1] : 0;
        const medianInt = intervals.length > 0 ? intervals[Math.floor(intervals.length/2)] : 0;

        console.log("\n=== TIMESTAMP & AQI ANALYSIS ===");
        console.log(`Unique timestamps: ${tsList.length}`);
        console.log(`Duplicate timestamps: ${duplicateTimestamps}`);
        console.log(`Min interval (sec): ${minInt / 1000}`);
        console.log(`Median interval (sec): ${medianInt / 1000}`);
        console.log(`Max interval (sec): ${maxInt / 1000}`);
        console.log(`Records with valid AQI: ${validAqiCount}`);

        // 3. 6-Hour Forecasting Pairs Check
        // A valid pair requires: timestamp T and T + ~6 hours
        // Let's define ~6 hours as 6 hours +/- 30 minutes
        const targetMs = 6 * 60 * 60 * 1000;
        const toleranceMs = 30 * 60 * 1000;

        let pairs6h = 0;
        for (let i = 0; i < tsList.length; i++) {
            let baseTs = tsList[i];
            let foundTarget = false;
            // look ahead for a timestamp that matches the 6h target
            for (let j = i + 1; j < tsList.length; j++) {
                let diff = tsList[j] - baseTs;
                if (diff >= targetMs - toleranceMs && diff <= targetMs + toleranceMs) {
                    foundTarget = true;
                    break;
                }
                if (diff > targetMs + toleranceMs) break; // exceeded tolerance
            }
            if (foundTarget) pairs6h++;
        }

        console.log("\n=== 6-HOUR FORECAST PAIRS ===");
        console.log(`Potential valid temporal pairs (~6 hours apart +/- 30min): ${pairs6h}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
analyzeMissions();
