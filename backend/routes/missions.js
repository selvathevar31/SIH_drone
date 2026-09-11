const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const missionController = require('../controllers/missionController');

router.get('/', asyncHandler(missionController.getMissions));
router.get('/:mission_id', asyncHandler(missionController.getMission));
router.post('/', asyncHandler(missionController.createMission));
router.patch('/:mission_id', asyncHandler(missionController.updateMission));
router.delete('/:mission_id', asyncHandler(missionController.deleteMission));

router.get('/:mission_id/readings', asyncHandler(missionController.getMissionReadings));
router.get('/:mission_id/analytics', asyncHandler(missionController.getMissionAnalytics));
router.get('/:mission_id/zones', asyncHandler(missionController.getMissionZones));
router.get('/:mission_id/compare/:previous_mission_id', asyncHandler(missionController.compareMissions));

router.get('/:mission_id/live-state', asyncHandler(missionController.getMissionLiveState));
router.get('/:mission_id/intelligence', asyncHandler(missionController.getMissionIntelligence));
router.get('/:mission_id/replay', asyncHandler(missionController.getMissionReplay));
router.get('/:mission_id/events', asyncHandler(missionController.getMissionEvents));
router.get('/:mission_id/decision', asyncHandler(missionController.getMissionDecision));
router.get('/:mission_id/report', asyncHandler(missionController.getMissionReport));
router.get('/:mission_id/readings/export', asyncHandler(missionController.exportMissionReadings));
router.get('/:mission_id/environmental-analytics', asyncHandler(missionController.getEnvironmentalAnalytics));
router.get('/:mission_id/environment-map', asyncHandler(missionController.getEnvironmentMap));
router.get('/:mission_id/sampling-density', asyncHandler(missionController.getSamplingDensity));
router.get('/:mission_id/flight-path', asyncHandler(missionController.getFlightPath));

module.exports = router;
