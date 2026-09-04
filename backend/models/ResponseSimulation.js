const mongoose = require('mongoose');

const responseSimulationSchema = new mongoose.Schema({
  simulation_id: { type: String, required: true, unique: true, index: true },
  mission_id: { type: String, index: true },
  
  status: { type: String, default: "SIMULATION_ONLY" },
  risk_level: { type: String },
  
  response_plan: { type: mongoose.Schema.Types.Mixed, default: [] }, 
  before_metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  after_metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  effectiveness: { type: mongoose.Schema.Types.Mixed, default: {} },
  evidence: { type: mongoose.Schema.Types.Mixed, default: [] },
  
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResponseSimulation', responseSimulationSchema);
