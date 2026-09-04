const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const aiController = require('../controllers/aiController');

router.post('/query', asyncHandler(aiController.queryIntelligence));
router.get('/insights/:mission_id', asyncHandler(aiController.getInsights));

router.get('/knowledge/documents', aiController.getKnowledgeDocuments);
router.post('/knowledge/search', aiController.searchKnowledgeDocuments);

module.exports = router;
