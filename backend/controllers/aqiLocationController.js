const axios = require('axios');
const Reading = require('../models/Reading');
const { calculateAQI } = require('../services/aqi');

// Rough bounding box for Delhi NCR
const DELHI_BOUNDS = {
    minLat: 28.4,
    maxLat: 28.9,
    minLon: 76.8,
    maxLon: 77.5
};

function isInsideDelhi(lat, lon) {
    return lat >= DELHI_BOUNDS.minLat && lat <= DELHI_BOUNDS.maxLat &&
           lon >= DELHI_BOUNDS.minLon && lon <= DELHI_BOUNDS.maxLon;
}

exports.getNearbyAirQuality = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);

        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: "Valid latitude and longitude are required." });
        }

        const userLocation = { latitude: lat, longitude: lon };

        // 1. Check if user is in Delhi (FLUXX Coverage Area)
        if (isInsideDelhi(lat, lon)) {
            // Retrieve latest reading from FLUXX database near this location.
            // For this demo, we just get the latest reading since we might not have a huge dataset.
            // Ideally we'd use $near geospatial query.
            const latestReading = await Reading.findOne({ aqi: { $ne: null } }).sort({ timestamp: -1 });

            if (latestReading) {
                return res.json({
                    userLocation,
                    dataLocation: {
                        name: latestReading.location || "Delhi (FLUXX Survey)",
                        latitude: latestReading.latitude,
                        longitude: latestReading.longitude
                    },
                    source: "FLUXX_DB",
                    aqi: latestReading.aqi,
                    pm25: latestReading.pm25,
                    pm10: latestReading.pm10,
                    co: 0, // Fallback if not available
                    co2: 400, // Fallback
                    humidity: latestReading.humidity || 50,
                    temperature: latestReading.temperature || 30,
                    timestamp: latestReading.timestamp
                });
            }
        }

        // 2. Fallback: User outside Delhi (or no FLUXX data found)
        // Fetch real Delhi data from Open-Meteo Air Quality API
        const demoLat = 28.6139; // New Delhi
        const demoLon = 77.2090;
        
        try {
            const response = await axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${demoLat}&longitude=${demoLon}&current=pm10,pm2_5,carbon_monoxide,us_aqi&timezone=auto`);
            const currentData = response.data.current;

            return res.json({
                userLocation,
                dataLocation: {
                    name: "New Delhi (Demo Data)",
                    latitude: demoLat,
                    longitude: demoLon
                },
                source: "DELHI_DEMO",
                aqi: currentData.us_aqi,
                pm25: currentData.pm2_5,
                pm10: currentData.pm10,
                co: currentData.carbon_monoxide,
                co2: 400, // fallback
                humidity: 50, // fallback
                temperature: 30, // fallback
                timestamp: currentData.time
            });
        } catch (apiError) {
            console.error("Open-Meteo API Error:", apiError);
            return res.status(502).json({ error: "External air quality source unavailable." });
        }

    } catch (e) {
        console.error("AQI Location Error:", e);
        res.status(500).json({ error: "Internal server error fetching nearby air quality." });
    }
};
