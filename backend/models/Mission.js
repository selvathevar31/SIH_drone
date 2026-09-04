const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
  mission_id: { type: String, required: true, unique: true, index: true },
  drone_id: { type: String, index: true },
  status: { type: String, default: "PLANNED" }, // PLANNED, IN_FLIGHT, COMPLETED, ABORTED
  data_source: { type: String, default: "UNKNOWN" }, // CSV, ESP32, DEMO
  
  start_time: { type: Date, default: null },
  end_time: { type: Date, default: null },
  duration_seconds: { type: Number, default: 0 },
  distance_km: { type: Number, default: 0.0 },
  total_readings: { type: Number, default: 0 },
  
  start_latitude: { type: Number, default: null },
  start_longitude: { type: Number, default: null },
  current_latitude: { type: Number, default: null },
  current_longitude: { type: Number, default: null },
  
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mission', missionSchema);
