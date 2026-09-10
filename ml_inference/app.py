# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
# pyrefly: ignore [missing-import]
import joblib
import pandas as pd
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Load the model
MODEL_PATH = os.environ.get("MODEL_PATH", "fluxx_aqi_6h_weighted_hgb.joblib")
try:
    model = joblib.load(MODEL_PATH)
    app.logger.info(f"Successfully loaded model from {MODEL_PATH}")
except Exception as e:
    app.logger.error(f"Failed to load model: {e}")
    model = None

# Exactly the 89 feature columns expected by the trained model
EXPECTED_FEATURES = [
  "PM2.5 (ug/m3)", "PM10 (ug/m3)", "NO (ug/m3)", "NO2 (ug/m3)", "NOx (ppb)",
  "NH3 (ug/m3)", "SO2 (ug/m3)", "CO (mg/m3)", "Ozone (ug/m3)", "Benzene (ug/m3)",
  "Toluene (ug/m3)", "AT (degC)", "RH (%)", "WS (m/s)", "WD (deg)", "SR (W/mt2)",
  "BP (mmHg)", "PM2.5 (ug/m3)_24h", "PM10 (ug/m3)_24h", "NO2 (ug/m3)_24h",
  "SO2 (ug/m3)_24h", "CO (mg/m3)_8h", "Ozone (ug/m3)_8h", "NH3 (ug/m3)_24h",
  "hour", "day_of_week", "month", "day_of_year", "hour_sin", "hour_cos",
  "month_sin", "month_cos", "PM2.5 (ug/m3)_lag1h", "PM2.5 (ug/m3)_lag3h",
  "PM2.5 (ug/m3)_lag6h", "PM2.5 (ug/m3)_lag12h", "PM10 (ug/m3)_lag1h",
  "PM10 (ug/m3)_lag3h", "PM10 (ug/m3)_lag6h", "PM10 (ug/m3)_lag12h",
  "NO (ug/m3)_lag1h", "NO (ug/m3)_lag3h", "NO (ug/m3)_lag6h", "NO (ug/m3)_lag12h",
  "NO2 (ug/m3)_lag1h", "NO2 (ug/m3)_lag3h", "NO2 (ug/m3)_lag6h", "NO2 (ug/m3)_lag12h",
  "NOx (ppb)_lag1h", "NOx (ppb)_lag3h", "NOx (ppb)_lag6h", "NOx (ppb)_lag12h",
  "NH3 (ug/m3)_lag1h", "NH3 (ug/m3)_lag3h", "NH3 (ug/m3)_lag6h", "NH3 (ug/m3)_lag12h",
  "SO2 (ug/m3)_lag1h", "SO2 (ug/m3)_lag3h", "SO2 (ug/m3)_lag6h", "SO2 (ug/m3)_lag12h",
  "CO (mg/m3)_lag1h", "CO (mg/m3)_lag3h", "CO (mg/m3)_lag6h", "CO (mg/m3)_lag12h",
  "Ozone (ug/m3)_lag1h", "Ozone (ug/m3)_lag3h", "Ozone (ug/m3)_lag6h", "Ozone (ug/m3)_lag12h",
  "Benzene (ug/m3)_lag1h", "Benzene (ug/m3)_lag3h", "Benzene (ug/m3)_lag6h", "Benzene (ug/m3)_lag12h",
  "Toluene (ug/m3)_lag1h", "Toluene (ug/m3)_lag3h", "Toluene (ug/m3)_lag6h", "Toluene (ug/m3)_lag12h",
  "AT (degC)_lag1h", "AT (degC)_lag3h", "AT (degC)_lag6h", "RH (%)_lag1h",
  "RH (%)_lag3h", "RH (%)_lag6h", "WS (m/s)_lag1h", "WS (m/s)_lag3h", "WS (m/s)_lag6h",
  "WD (deg)_lag1h", "WD (deg)_lag3h", "WD (deg)_lag6h", "SR (W/mt2)_lag1h",
  "SR (W/mt2)_lag3h", "SR (W/mt2)_lag6h", "BP (mmHg)_lag1h", "BP (mmHg)_lag3h",
  "BP (mmHg)_lag6h", "AQI_current", "AQI_lag1h", "AQI_lag3h", "AQI_lag6h", "AQI_lag12h"
]

@app.route('/health', methods=['GET'])
def health_check():
    if model is None:
        return jsonify({"status": "error", "message": "Model not loaded"}), 503
    return jsonify({"status": "ok", "service": "ML Inference Service"})

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded properly. Ensure fluxx_aqi_6h_weighted_hgb.joblib exists."}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid or missing JSON payload"}), 400

        # Construct feature dictionary from input data
        feature_dict = {}
        missing_features = []
        for feature in EXPECTED_FEATURES:
            if feature in data:
                feature_dict[feature] = float(data[feature])
            else:
                missing_features.append(feature)
        
        if missing_features:
            app.logger.warning(f"Missing features in request: {missing_features}")
            return jsonify({
                "error": "Missing required features",
                "missing": missing_features
            }), 400

        # Create DataFrame in exact expected order
        df = pd.DataFrame([feature_dict], columns=EXPECTED_FEATURES)

        # Run inference
        prediction = model.predict(df)[0]
        
        # Apply output constraints (0 - 500)
        constrained_prediction = max(0.0, min(500.0, float(prediction)))

        return jsonify({
            "predicted_aqi_6h": round(constrained_prediction, 2)
        })

    except Exception as e:
        app.logger.error(f"Prediction error: {str(e)}")
        return jsonify({"error": "Internal server error during prediction"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
