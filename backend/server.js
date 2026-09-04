const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
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

// Global Error Handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
