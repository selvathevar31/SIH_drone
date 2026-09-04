const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const readingsController = require('../controllers/readingsController');

router.get('/:reading_id', asyncHandler(readingsController.getReading));

module.exports = router;
