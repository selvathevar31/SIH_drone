from fastapi import FastAPI, HTTPException, Request
import joblib
import pandas as pd
import logging
import os

app = FastAPI(title="FLUXX AQI Forecast ML Service")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = os.environ.get("MODEL_PATH", "fluxx_aqi_6h_weighted_hgb.joblib")
model = None

@app.on_event("startup")
def load_model():
    global model
    try:
        model = joblib.load(MODEL_PATH)
        logger.info(f"Successfully loaded model from {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

@app.get("/health")
def health_check():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ok", "service": "ML Inference Service"}

@app.post("/predict")
async def predict(request: Request):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded properly.")
    
    try:
        data = await request.json()
        if not data:
            raise HTTPException(status_code=400, detail="Invalid or missing JSON payload")

        # Create DataFrame from the provided JSON keys.
        # NOTE: The model expects 193 features in a specific order.
        # Without the exact feature list, we rely on the payload matching the schema.
        df = pd.DataFrame([data])
        
        # Run inference
        prediction = model.predict(df)[0]
        
        # Apply output constraints (0 - 500)
        constrained_prediction = max(0.0, min(500.0, float(prediction)))

        return {"predicted_aqi_6h": round(constrained_prediction, 2)}

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
