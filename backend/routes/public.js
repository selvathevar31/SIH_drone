const express = require('express');
const router = express.Router();
const Mission = require('../models/Mission');

router.get('/status', (req, res) => {
    res.json({
        status: "operational",
        version: "2.0.0",
        services: {
            database: "online",
            ai: "online"
        }
    });
});

module.exports = router;
