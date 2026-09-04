const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const dashboardController = require('../controllers/dashboardController');

router.get('/summary', asyncHandler(dashboardController.getSummary));
router.get('/:mission_id', asyncHandler(dashboardController.getDashboardData));

module.exports = router;
