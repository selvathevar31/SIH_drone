const express = require('express');
const router = express.Router();
const axios = require('axios');
const asyncHandler = require('../middlewares/asyncHandler');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000';

// POST /api/aqi/predict-6h
router.post('/predict-6h', asyncHandler(async (req, res) => {
    const featureData = req.body;

    if (!featureData || Object.keys(featureData).length === 0) {
        res.status(400);
        throw new Error("Missing feature data for prediction");
    }

    try {
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, featureData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 seconds timeout
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error communicating with ML inference service:", error.message);
        
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status);
            throw new Error(error.response.data.error || "ML Service Error");
        } else if (error.request) {
            // The request was made but no response was received
            res.status(503);
            throw new Error("ML inference service is unavailable or timed out");
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500);
            throw new Error("Failed to formulate request to ML service");
        }
    }
}));

module.exports = router;
