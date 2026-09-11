const { processCsvUpload } = require('../services/csvImporter');
const { detectHotspotsForReadings } = require('../services/hotspotDetector');
const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const { broadcastTelemetry } = require('../socket');

exports.uploadCsv = async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("No file uploaded");
    }
    
    let missionId = req.body.mission_id;
    if (!missionId) {
        missionId = `M-${new Date().getTime()}`;
    }
    
    console.log(`[CSV] Upload received`);
    
    const result = await processCsvUpload(req.file.buffer, missionId, "CSV");
    
    if (!result.success) {
        return res.status(400).json(result);
    }
    
    // Override missionId if the CSV provided its own
    if (result.readings.length > 0 && result.readings[0].mission_id) {
        missionId = result.readings[0].mission_id;
    }
    
    // Ensure mission exists
    let mission = await Mission.findOne({ mission_id: missionId });
    if (!mission) {
        mission = new Mission({
            mission_id: missionId,
            data_source: "CSV",
            status: "COMPLETED",
            start_time: new Date()
        });
        await mission.save();
    }
    
    console.log(`[DEBUG UPLOAD] Filename: ${req.file.originalname}`);
    console.log(`[CSV] Mission: ${missionId}`);
    
    // Save readings with deduplication
    console.log(`[CSV] Inserting ${result.accepted_rows} records into MongoDB`);
    
    let insertedRows = 0;
    let skippedRows = 0;
    
    if (result.readings.length > 0) {
        const bulkOps = result.readings.map(r => ({
            updateOne: {
                filter: { mission_id: r.mission_id, timestamp: r.timestamp },
                update: { $set: r },
                upsert: true
            }
        }));
        
        const bulkResult = await Reading.bulkWrite(bulkOps);
        insertedRows = bulkResult.upsertedCount;
        skippedRows = bulkResult.matchedCount;
        console.log(`[CSV] MongoDB insertion successful`);
        console.log(`[CSV] Inserted: ${insertedRows}`);
    }
    
    // Calculate mission stats
    if (result.readings.length > 0) {
        // Readings are not guaranteed to be sorted in the array, but typically are. Let's sort to be safe.
        const sorted = [...result.readings].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const start = sorted[0].timestamp;
        const end = sorted[sorted.length - 1].timestamp;
        const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
        
        // Simple distance calculation (sum of point-to-point)
        let distanceKm = 0;
        for (let i = 1; i < sorted.length; i++) {
            const p1 = sorted[i - 1];
            const p2 = sorted[i];
            
            // Haversine
            const R = 6371; // km
            const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
            const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
            const lat1 = p1.latitude * Math.PI / 180;
            const lat2 = p2.latitude * Math.PI / 180;
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distanceKm += R * c;
        }
        
        mission.start_time = start;
        mission.end_time = end;
        mission.duration_seconds = durationSeconds;
        mission.distance_km = Math.round(distanceKm * 100) / 100;
        mission.total_readings = result.readings.length;
        await mission.save();
    }
    
    // Calculate hotspots
    const hotspots = detectHotspotsForReadings(result.readings);
    if (hotspots && hotspots.length > 0) {
        // Collect unique mission IDs from hotspots (though usually they are all the same)
        const uniqueMissionIds = [...new Set(result.readings.map(r => r.mission_id))];
        
        // Prevent duplicate hotspots by clearing old ones for these missions
        await Hotspot.deleteMany({ mission_id: { $in: uniqueMissionIds } });
        
        const hDocs = hotspots.map(h => ({
            ...h,
            mission_id: missionId
        }));
        await Hotspot.insertMany(hDocs);
    }
    
    // Broadcast GeoJSON payload to connected WebSockets
    const features = result.readings
        .filter(r => r.latitude != null && r.longitude != null)
        .map(r => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [r.longitude, r.latitude]
            },
            properties: {
                aqi: r.aqi || 0,
                pm25: r.pm25 || 0,
                pm10: r.pm10 || 0,
                temperature: r.temperature || 0
            }
        }));

    if (features.length > 0) {
        broadcastTelemetry(JSON.stringify({
            type: "FeatureCollection",
            features: features
        }));
    }
    
    res.json({
        success: true,
        message: "CSV imported successfully",
        mission_id: missionId,
        total_rows: result.total_rows,
        inserted_rows: insertedRows,
        skipped_rows: skippedRows,
        rows_processed: result.accepted_rows,
        hotspots_detected: hotspots.length
    });
};
