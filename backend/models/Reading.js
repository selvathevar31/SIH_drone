const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  mission_id: { type: String, index: true },
  data_source: { type: String, default: "UNKNOWN" },
  
  timestamp: { type: Date, required: true, index: true },
  
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  altitude: { type: Number, default: null },
  altitude_reference: { type: String, default: "RELATIVE_HOME" },
  
  pm1: { type: Number, default: null },
  pm25: { type: Number, default: null },
  pm10: { type: Number, default: null },
  
  temperature: { type: Number, default: null },
  humidity: { type: Number, default: null },
  
  speed: { type: Number, default: null },
  heading: { type: Number, default: null },
  battery: { type: Number, default: null },
  satellites: { type: Number, default: null },
  gps_status: { type: String, default: null },
  signal_strength: { type: Number, default: null },
  
  aqi: { type: Number, default: null },
  aqi_category: { type: String, default: null },
  
  created_at: { type: Date, default: Date.now }
});

// Add virtual properties similar to Python
readingSchema.virtual('pm25_aqi').get(function() {
  const { calculateAQI } = require('../services/aqi');
  if (this.pm25 !== null) {
    const result = calculateAQI({ pm25: this.pm25 });
    return result ? result.aqi : null;
  }
  return null;
});

readingSchema.virtual('pm10_aqi').get(function() {
  const { calculateAQI } = require('../services/aqi');
  if (this.pm10 !== null) {
    const result = calculateAQI({ pm10: this.pm10 });
    return result ? result.aqi : null;
  }
  return null;
});

// Ensure virtual fields are serialized.
readingSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Reading', readingSchema);
