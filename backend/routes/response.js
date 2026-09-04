const express = require('express');
const router = express.Router();
const ResponseSimulation = require('../models/ResponseSimulation');

router.post('/simulate', async (req, res) => {
    try {
        const sim = new ResponseSimulation({
            simulation_id: `SIM-${Date.now()}`,
            mission_id: req.body.mission_id,
            status: "COMPLETED",
            risk_level: "MEDIUM"
        });
        await sim.save();
        res.json(sim);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.get('/:simulation_id', async (req, res) => {
    try {
        const sim = await ResponseSimulation.findOne({ simulation_id: req.params.simulation_id });
        res.json(sim || {});
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
