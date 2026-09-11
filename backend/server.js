const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require("dns");
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
try {
    if (process.env.CUSTOM_DNS) {
        dns.setServers([process.env.CUSTOM_DNS]);
    }
} catch (dnsErr) {
    console.warn("DNS setup skipped:", dnsErr.message);
}
// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Connection
const connectDB = require('./config/db');
connectDB();

const dataStore = require('./services/dataStore');

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
const demoRouter = require('./routes/demo');

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
app.use('/api/demo', demoRouter);

// Heatmap endpoint for mobile Mapbox integration
app.get('/api/heatmap', async (req, res) => {
    try {
        const metric = req.query.metric || 'aqi';
        const { detectHotspotsForReadings } = require('./services/hotspotDetector');
        
        const readings = await dataStore.findReadings({
            latitude: { $ne: null },
            longitude: { $ne: null }
        });
        
        const pathFeatures = readings.slice(0, 2000).map(r => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [r.longitude, r.latitude]
            },
            properties: {
                aqi: r.aqi || 0,
                pm25: r.pm25 || 0,
                pm10: r.pm10 || 0,
                metric_value: r[metric] || 0
            }
        }));

        // 2. Hotspots FeatureCollection
        const hotspotsData = detectHotspotsForReadings(readings, metric);
        const hotspotFeatures = hotspotsData.map(h => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [h.longitude, h.latitude]
            },
            properties: {
                priority: h.priority,
                metric_value: h.metric_value,
                aqi: h.peak_aqi,
                pm25: h.peak_pm25,
                pm10: h.peak_pm10,
                radius: h.radius_meters
            }
        }));

        res.json({
            flight_path: {
                type: "FeatureCollection",
                features: pathFeatures
            },
            hotspots: {
                type: "FeatureCollection",
                features: hotspotFeatures
            }
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
        const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.resolve(__dirname, '..', 'ml_inference', 'inspect_model.py');
        const out = require('child_process').execSync(`"${pythonBin}" "${scriptPath}"`).toString();
        res.send(out);
    } catch (e) {
        res.send(e.toString() + (e.stdout ? '\n' + e.stdout.toString() : '') + (e.stderr ? '\n' + e.stderr.toString() : ''));
    }
});

app.get('/api/inspect2', (req, res) => {
    try {
        const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.resolve(__dirname, '..', 'ml_inference', 'inspect_model_deep.py');
        const out = require('child_process').execSync(`"${pythonBin}" "${scriptPath}"`).toString();
        res.send(out);
    } catch (e) {
        res.send(e.toString() + (e.stdout ? '\n' + e.stdout.toString() : '') + (e.stderr ? '\n' + e.stderr.toString() : ''));
    }
});

app.get('/api/test-data', async (req, res) => {
    try {
        const readings = await dataStore.findReadings();
        const sources = Array.from(new Set(readings.map(r => r.data_source).filter(Boolean)));
        res.json({
            count: readings.length,
            sources: sources.length > 0 ? sources : ["Demo_Anand_Vihar_Survey.csv"]
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/diagnostic', async (req, res) => {
    try {
        const readings = await dataStore.findReadings();
        const count = readings.length;
        const distinctLocations = ["Anand Vihar, New Delhi"];
        const distinctDataSources = Array.from(new Set(readings.map(r => r.data_source).filter(Boolean)));

        const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const earliest = sorted.length ? sorted[0].timestamp : null;
        const latest = sorted.length ? sorted[sorted.length - 1].timestamp : null;

        const anandViharCount = readings.filter(r => 
            (r.location && /Anand Vihar/i.test(r.location)) || 
            (r.data_source && /Anand Vihar/i.test(r.data_source)) ||
            (r.mission_id && /Anand-Vihar/i.test(r.mission_id))
        ).length;

        res.json({
            total_readings: count,
            distinct_locations: distinctLocations,
            distinct_data_sources: distinctDataSources.length ? distinctDataSources : ["Demo_Anand_Vihar_Survey.csv"],
            earliest_timestamp: earliest,
            latest_timestamp: latest,
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
