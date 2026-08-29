# QUDRACOPTER Backend

This is the FastAPI backend for the QUDRACOPTER drone-based air-quality intelligence platform. It handles CSV ingestion, live ESP32/Arduino data integration, CPCB NAQI calculation, spatial hotspot clustering (DBSCAN), and provides a clean REST API for the React dashboard.

## Requirements

- Python 3.11+

## Installation

```bash
cd backend
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

## Run the Server

```bash
uvicorn app.main:app --reload
```

## API Documentation

Once the server is running, you can explore and interact with all endpoints via Swagger UI:
http://127.0.0.1:8000/docs

## Import CSV

You can upload a CSV to `/api/upload/csv` via the Swagger UI or curl. 
The CSV must contain: `timestamp`, `latitude`, `longitude`, `altitude`, `pm25`, `pm10`, `temperature`, `humidity`.

## Demo Data

To populate the database with a realistic drone flight and simulated pollution hotspots, run:
```bash
python scripts/seed_demo_data.py
```

## Testing

```bash
pytest
```
