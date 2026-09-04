const { processCsvUpload } = require('../services/csvImporter');
const { detectHotspotsForReadings } = require('../services/hotspotDetector');
const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');

exports.uploadCsv = async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("No file uploaded");
    }
    
    let missionId = req.body.mission_id;
    if (!missionId) {
        missionId = `M-${new Date().getTime()}`;
    }
    
    const result = await processCsvUpload(req.file.buffer, missionId, "CSV");
    
    if (!result.success) {
        return res.status(400).json(result);
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
    console.log(`[DEBUG UPLOAD] Generated missionId: ${missionId}`);
    console.log(`[DEBUG UPLOAD] Parsed row count: ${result.accepted_rows}`);
    
    // Save readings
    const inserted = await Reading.insertMany(result.readings);
    console.log(`[DEBUG UPLOAD] MongoDB inserted document count: ${inserted.length}`);
    if (inserted.length > 0) {
        console.log(`[DEBUG UPLOAD] First imported document: ${JSON.stringify(inserted[0])}`);
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
        const hDocs = hotspots.map(h => ({
            ...h,
            mission_id: missionId
        }));
        await Hotspot.insertMany(hDocs);
    }
    
    res.json({
        success: true,
        mission_id: missionId,
        readings_processed: result.accepted_rows,
        hotspots_detected: hotspots.length,
        message: "CSV imported successfully"
    });
};
