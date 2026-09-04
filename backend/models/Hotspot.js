const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  mission_id: { type: String, index: true },
  
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  
  radius_meters: { type: Number, default: 75.0 },
  
  average_aqi: { type: Number, default: null },
  peak_aqi: { type: Number, default: null },
  
  average_pm25: { type: Number, default: null },
  peak_pm25: { type: Number, default: null },
  
  average_pm10: { type: Number, default: null },
  peak_pm10: { type: Number, default: null },
  
  severity: { type: String, default: null },
  reading_count: { type: Number, default: 0 },
  
  min_altitude: { type: Number, default: null },
  max_altitude: { type: Number, default: null },
  average_altitude: { type: Number, default: null },
  
  detected_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hotspot', hotspotSchema);
