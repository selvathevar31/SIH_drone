const express = require('express');
const router = express.Router();
const dataStore = require('../services/dataStore');
const { broadcastTelemetry } = require('../socket');
const { detectHotspotsForReadings } = require('../services/hotspotDetector');

router.post('/start', async (req, res) => {
    try {
        const speed = parseFloat(req.query.speed) || 1.0;
        const missionId = `SIM-Anand-Vihar-${Math.floor(100000 + Math.random() * 900000)}`;
        
        const baseLat = 28.6469;
        const baseLon = 77.3160;
        const startTime = new Date();
        const numPoints = 120;
        const readings = [];

        for (let i = 0; i < numPoints; i++) {
            const pointTime = new Date(startTime.getTime() + i * 30 * 1000 / speed);
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
                _id: `r-${Date.now()}-${i}`,
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
                speed: 4.5 * speed,
                heading: (i * 15) % 360,
                battery: Math.max(20, 100 - Math.round(i * 0.6))
            });
        }

        const mission = {
            mission_id: missionId,
            drone_id: "DRONE-01",
            data_source: "Live_Simulation_Anand_Vihar.csv",
            status: "SURVEYING",
            start_time: startTime,
            end_time: new Date(startTime.getTime() + numPoints * 30 * 1000 / speed),
            duration_seconds: Math.round(numPoints * 30 / speed),
            distance_km: 2.85,
            total_readings: readings.length,
            created_at: startTime
        };

        await dataStore.saveMission(mission);
        await dataStore.insertReadings(readings);

        const hotspots = detectHotspotsForReadings(readings).map((h, idx) => ({
            ...h,
            _id: `hs-${Date.now()}-${idx}`,
            mission_id: missionId,
            detected_at: new Date(startTime.getTime() + 60 * 30 * 1000 / speed)
        }));
        if (hotspots.length > 0) {
            await dataStore.insertHotspots(hotspots);
        }

        try {
            if (readings.length > 0) {
                broadcastTelemetry(readings[0]);
            }
        } catch {}

        res.json({
            success: true,
            mission_id: missionId,
            status: "SURVEYING",
            message: "Simulation started successfully"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
