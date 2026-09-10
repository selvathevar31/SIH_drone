# ML Inference Service

This is the Python inference service for the FLUXX AQI prediction model. It hosts the pre-trained `fluxx_aqi_6h_weighted_hgb.joblib` model.

## Setup

1. Make sure you have Python 3.9+ installed.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/Mac
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure the `fluxx_aqi_6h_weighted_hgb.joblib` model file is placed in this directory (`ml_inference`).

## Running the Service

Start the service:
```bash
python app.py
```
The service will run on `http://0.0.0.0:5000` by default.

## Endpoints

- `GET /health` : Healthcheck.
- `POST /predict` : Expects a JSON payload with exactly 89 features. Returns the predicted AQI 6 hours ahead.
