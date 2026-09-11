const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const dataStore = require('../services/dataStore');
const asyncHandler = require('../middlewares/asyncHandler');

// Centralized Geofence for Anand Vihar
const ANAND_VIHAR = {
    name: "Anand Vihar",
    center: { lat: 28.6469, lon: 77.3160 },
    radius_km: 2.0
};

// Rough approximation for bounding box:
// 1 degree latitude = ~111 km
// 1 degree longitude at 28.6 N = ~111 * Math.cos(28.6 * Math.PI / 180) = ~97.5 km
const latDelta = ANAND_VIHAR.radius_km / 111.0;
const lonDelta = ANAND_VIHAR.radius_km / 97.5;

const anandViharQuery = {
    latitude: { 
        $gte: ANAND_VIHAR.center.lat - latDelta, 
        $lte: ANAND_VIHAR.center.lat + latDelta 
    },
    longitude: { 
        $gte: ANAND_VIHAR.center.lon - lonDelta, 
        $lte: ANAND_VIHAR.center.lon + lonDelta 
    }
};

router.get('/anand-vihar', asyncHandler(async (req, res) => {
    let chronologicalReadings = [];

    if (dataStore.isMongoConnected()) {
        const recentReadingsDesc = await Reading.find(anandViharQuery)
            .sort({ timestamp: -1 })
            .limit(500)
            .lean();

        if (recentReadingsDesc.length > 0) {
            chronologicalReadings = recentReadingsDesc.reverse();
        }
    } else {
        const minLat = ANAND_VIHAR.center.lat - latDelta;
        const maxLat = ANAND_VIHAR.center.lat + latDelta;
        const minLon = ANAND_VIHAR.center.lon - lonDelta;
        const maxLon = ANAND_VIHAR.center.lon + lonDelta;

        chronologicalReadings = dataStore.memoryStore.readings
            .filter(r => r.latitude >= minLat && r.latitude <= maxLat && r.longitude >= minLon && r.longitude <= maxLon)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-500);
    }

    if (chronologicalReadings.length === 0) {
        return res.json({
            diagnostic: true,
            status: "NO_DATA",
            message: "No Anand Vihar readings found within geofence.",
            geofence: ANAND_VIHAR,
            readings_found: 0,
            timestamp_range: null
        });
    }

    const earliest = new Date(chronologicalReadings[0].timestamp);
    const latest = new Date(chronologicalReadings[chronologicalReadings.length - 1].timestamp);
    const timeSpanHours = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60);

    return res.json({
        diagnostic: true,
        status: "DATA_FOUND",
        message: "Anand Vihar data retrieved successfully based on geofence.",
        geofence: ANAND_VIHAR,
        readings_found: chronologicalReadings.length,
        timestamp_range: {
            earliest: earliest,
            latest: latest,
            span_hours: timeSpanHours.toFixed(2)
        },
        sample_first: chronologicalReadings[0],
        sample_last: chronologicalReadings[chronologicalReadings.length - 1]
    });
}));

module.exports = router;
