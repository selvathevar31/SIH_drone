const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require("dns");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
dns.setServers(["8.8.8.8"]);
// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Connection
const connectDB = require('./config/db');
connectDB();

const missionsRouter = require('./routes/missions');
const readingsRouter = require('./routes/readings');
const hotspotsRouter = require('./routes/hotspots');
const uploadRouter = require('./routes/upload');
const dashboardRouter = require('./routes/dashboard');
const aiRouter = require('./routes/ai');
const publicRouter = require('./routes/public');
const responseRouter = require('./routes/response');
const replayRouter = require('./routes/replay');
const hardwareRouter = require('./routes/hardware');
const aqiRouter = require('./routes/aqi');
const forecastRouter = require('./routes/forecast');

app.use('/api/missions', missionsRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/hotspots', hotspotsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ai', aiRouter);
app.use('/api/public', publicRouter);
app.use('/api/response', responseRouter);
app.use('/api/replay', replayRouter);
app.use('/api/hardware', hardwareRouter);
app.use('/api/aqi', aqiRouter);
app.use('/api/forecast', forecastRouter);

// Heatmap endpoint for mobile Mapbox integration
app.get('/api/heatmap', async (req, res) => {
    try {
        const Reading = require('./models/Reading');
        const readings = await Reading.find({ latitude: { $exists: true }, longitude: { $exists: true } }).limit(2000);
        
        const features = readings.map(r => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [r.longitude, r.latitude]
            },
            properties: {
                aqi: r.aqi || 0,
                pm25: r.pm25 || 0,
                pm10: r.pm10 || 0
            }
        }));

        res.json({
            type: "FeatureCollection",
            features: features
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    let dbStatus = "DISCONNECTED";
    if (mongoose.connection.readyState === 1) {
        dbStatus = "CONNECTED";
    }

    const aiStatus = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) ? "AVAILABLE" : "FALLBACK";

    res.json({
        status: "ok",
        service: "QUDRACOPTER Backend (Node.js)",
        backend: "ONLINE",
        database: dbStatus,
        ai: aiStatus,
        gis: "READY"
    });
});

app.get('/api/inspect', (req, res) => {
    try {
        const out = require('child_process').execSync('c:\\projects\\drone\\ml_inference\\venv\\Scripts\\python.exe c:\\projects\\drone\\ml_inference\\inspect_model.py').toString();
        res.send(out);
    } catch (e) {
        res.send(e.toString() + (e.stdout ? '\n' + e.stdout.toString() : '') + (e.stderr ? '\n' + e.stderr.toString() : ''));
    }
});

app.get('/api/inspect2', (req, res) => {
    try {
        const out = require('child_process').execSync('c:\\projects\\drone\\venv\\Scripts\\python.exe c:\\projects\\drone\\ml_inference\\inspect_model.py').toString();
        res.send(out);
    } catch (e) {
        res.send(e.toString() + (e.stdout ? '\n' + e.stdout.toString() : '') + (e.stderr ? '\n' + e.stderr.toString() : ''));
    }
});

app.get('/api/test-data', async (req, res) => {
    try {
        const Reading = require('./models/Reading');
        const count = await Reading.countDocuments();
        const sources = await Reading.distinct('data_source');
        res.json({
            count,
            sources
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/diagnostic', async (req, res) => {
    try {
        const Reading = require('./models/Reading');
        const count = await Reading.countDocuments();

        // Some records might use 'location' or 'data_source' for the location name. 
        // We will check both just in case.
        const distinctLocations = await Reading.distinct('location');
        const distinctDataSources = await Reading.distinct('data_source');

        const earliest = await Reading.findOne().sort({ timestamp: 1 }).select('timestamp');
        const latest = await Reading.findOne().sort({ timestamp: -1 }).select('timestamp');

        const anandViharCount = await Reading.countDocuments({
            $or: [
                { location: { $regex: /Anand Vihar/i } },
                { data_source: { $regex: /Anand Vihar/i } }
            ]
        });

        res.json({
            total_readings: count,
            distinct_locations: distinctLocations,
            distinct_data_sources: distinctDataSources,
            earliest_timestamp: earliest ? earliest.timestamp : null,
            latest_timestamp: latest ? latest.timestamp : null,
            anand_vihar_exists: anandViharCount > 0,
            anand_vihar_count: anandViharCount
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// Global Error Handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

const socketModule = require('./socket');
socketModule.init(server);
