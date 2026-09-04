const express = require('express');
const router = express.Router();

router.post('/start', (req, res) => res.json({ status: "started" }));
router.post('/stop', (req, res) => res.json({ status: "stopped" }));
router.get('/status', (req, res) => res.json({ status: "idle" }));

module.exports = router;
