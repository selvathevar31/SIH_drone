const { processCsvUpload } = require('../services/csvImporter');
const { detectHotspotsForReadings } = require('../services/hotspotDetector');
const Mission = require('../models/Mission');
const Reading = require('../models/Reading');
const Hotspot = require('../models/Hotspot');
const dataStore = require('../services/dataStore');
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
    
    const result = await processCsvUpload(req.file.buffer, missionId, "CSV");
    
    if (!result.success) {
        return res.status(400).json(result);
    }
    
    // Ensure mission exists
    let mission = await dataStore.findMission(missionId);
    if (!mission) {
        mission = new Mission({
            mission_id: missionId,
            data_source: "CSV",
            status: "COMPLETED",
            start_time: new Date()
        });
        await dataStore.saveMission(mission);
    }
    
    console.log(`[DEBUG UPLOAD] Filename: ${req.file.originalname}`);
    console.log(`[DEBUG UPLOAD] Generated missionId: ${missionId}`);
    console.log(`[DEBUG UPLOAD] Parsed row count: ${result.accepted_rows}`);
    
    // Save readings
    const inserted = await dataStore.insertReadings(result.readings);
    console.log(`[DEBUG UPLOAD] Inserted readings count: ${inserted.length}`);
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
        await dataStore.saveMission(mission);
    }
    
    // Calculate hotspots
    const hotspots = detectHotspotsForReadings(result.readings);
    if (hotspots && hotspots.length > 0) {
        const hDocs = hotspots.map(h => ({
            ...h,
            mission_id: missionId
        }));
        await dataStore.insertHotspots(hDocs);
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
        mission_id: missionId,
        readings_processed: result.accepted_rows,
        hotspots_detected: hotspots.length,
        message: "CSV imported successfully"
    });
};

exports.loadDemoCsv = async (req, res) => {
    const missionId = `SIM-Anand-Vihar-${Date.now().toString().slice(-6)}`;
    const baseLat = 28.6469;
    const baseLon = 77.3160;
    const startTime = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago

    const rows = [
        "timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity,speed,heading,battery,satellites"
    ];

    const numPoints = 120;
    for (let i = 0; i < numPoints; i++) {
        const pointTime = new Date(startTime.getTime() + i * 60 * 1000).toISOString();
        // Lawnmower grid pattern
        const lat = baseLat + Math.sin(i * 0.15) * 0.008;
        const lon = baseLon + (i * 0.00015);
        const alt = 45 + Math.sin(i * 0.1) * 15;
        
        // Hotspot peak around middle points
        const distFromCenter = Math.abs(i - 60);
        let pm25 = 45 + Math.random() * 10;
        if (distFromCenter < 25) {
            pm25 += (25 - distFromCenter) * 5.5 + Math.random() * 15; // peak ~ 180+
        }
        const pm10 = pm25 * 1.65 + Math.random() * 8;
        const temp = 28.5 + Math.sin(i * 0.05) * 2;
        const hum = 65 - Math.sin(i * 0.05) * 5;
        const speed = 4.5 + Math.random() * 1.5;
        const heading = (i * 15) % 360;
        const battery = Math.max(20, 100 - (i * 0.6));

        rows.push(`${pointTime},${lat.toFixed(6)},${lon.toFixed(6)},${alt.toFixed(1)},${pm25.toFixed(1)},${pm10.toFixed(1)},${temp.toFixed(1)},${hum.toFixed(1)},${speed.toFixed(1)},${heading},${battery.toFixed(0)},14`);
    }

    const csvContent = rows.join("\n");
    const result = await processCsvUpload(csvContent, missionId, "Demo_Anand_Vihar_Survey.csv");

    if (!result.success) {
        return res.status(400).json(result);
    }

    let mission = new Mission({
        mission_id: missionId,
        data_source: "Demo_Anand_Vihar_Survey.csv",
        status: "COMPLETED",
        start_time: startTime,
        end_time: new Date(startTime.getTime() + numPoints * 60 * 1000),
        total_readings: result.readings.length,
        duration_seconds: numPoints * 60,
        distance_km: 2.85
    });
    await dataStore.saveMission(mission);

    await dataStore.insertReadings(result.readings);

    const hotspots = detectHotspotsForReadings(result.readings);
    if (hotspots && hotspots.length > 0) {
        const hDocs = hotspots.map(h => ({ ...h, mission_id: missionId }));
        await dataStore.insertHotspots(hDocs);
    }

    res.json({
        success: true,
        mission_id: missionId,
        rows_processed: result.accepted_rows,
        hotspots_detected: hotspots ? hotspots.length : 0,
        message: "Demo mission CSV loaded successfully"
    });
};
