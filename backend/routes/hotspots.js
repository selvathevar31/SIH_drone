const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const hotspotsController = require('../controllers/hotspotsController');

router.get('/', asyncHandler(hotspotsController.getHotspots));

module.exports = router;
