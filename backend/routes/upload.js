const express = require('express');
const router = express.Router();
const multer = require('multer');
const asyncHandler = require('../middlewares/asyncHandler');
const uploadController = require('../controllers/uploadController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/csv', upload.single('file'), asyncHandler(uploadController.uploadCsv));

module.exports = router;
