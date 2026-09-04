const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => res.json({
    connected: false,
    drone_id: null,
    battery: null
}));

module.exports = router;
