# FLUXX Public Awareness API Contract (v1)

This document defines the integration contract for Sid's public awareness application and other external public consumers of the FLUXX environmental data.

All public endpoints are prefixed with `/api/public` and are fully sanitized to protect operational security (no battery status, signal strength, GPS diagnostic flags, raw AI prompts, or internal operators' locations are exposed).

---

## 1. Get Environmental Overview
Returns the current real-time environmental status derived from the absolute latest telemetry reading.

* **Endpoint**: `GET /api/public/overview`
* **CORS**: Enabled for `http://localhost:5173` and allowed origins.
* **Response Body** (`PublicOverview`):
  ```json
  {
    "aqi": 142,
    "aqi_category": "Poor",
    "pm25": 82.4,
    "pm10": 116.7,
    "temperature": 29.4,
    "humidity": 68.2,
    "timestamp": "2026-08-29T09:20:07.515Z",
    "source": "FLUXX"
  }
  ```

---

## 2. Get Public Missions
Returns a list of completed, public-safe missions with aggregated metadata. Active missions are hidden from the public view.

* **Endpoint**: `GET /api/public/missions`
* **Response Body** (`PublicMissionList`):
  ```json
  {
    "items": [
      {
        "mission_id": "M-2026-08-29-A",
        "date": "2026-08-29T09:10:00Z",
        "duration_minutes": 10.5,
        "distance_km": 1.25,
        "average_aqi": 82,
        "max_aqi": 142,
        "status": "completed"
      }
    ]
  }
  ```

---

## 3. Get Public Mission Detail
Returns a public-safe operational summary of a single mission.

* **Endpoint**: `GET /api/public/missions/{mission_id}`
* **Response Body** (`PublicMissionDetail`):
  ```json
  {
    "mission_id": "M-2026-08-29-A",
    "date": "2026-08-29T09:10:00Z",
    "duration_minutes": 10.5,
    "distance_km": 1.25,
    "average_aqi": 82,
    "max_aqi": 142,
    "status": "completed",
    "total_readings": 234,
    "hotspots_detected": 1
  }
  ```
* **Error Responses**:
  * **404 Not Found**:
    ```json
    {
      "error": "MISSION_NOT_FOUND",
      "message": "The requested mission does not exist."
    }
    ```

---

## 4. Get Mission Map Data
Returns sanitized geographic coordinates, routes, and hotspots for rendering public map overlays.

* **Endpoint**: `GET /api/public/missions/{mission_id}/map`
* **Response Body** (`PublicMissionMapData`):
  ```json
  {
    "mission_id": "M-2026-08-29-A",
    "route": [
      [12.9718, 77.5948],
      [12.9722, 77.5952]
    ],
    "points": [
      {
        "latitude": 12.9718,
        "longitude": 77.5948,
        "aqi": 75,
        "pm25": 24.5
      }
    ],
    "hotspots": [
      {
        "latitude": 12.9722,
        "longitude": 77.5952,
        "radius": 75.0,
        "severity": "MODERATE",
        "average_aqi": 110,
        "peak_aqi": 142,
        "timestamp": "2026-08-29T09:10:00Z"
      }
    ]
  }
  ```
* **Error Responses**:
  * **404 Not Found**:
    ```json
    {
      "error": "MISSION_NOT_FOUND",
      "message": "The requested mission does not exist."
    }
    ```

---

## 5. Get Mission Environmental Trend
Returns time-series environmental measurements for trend chart visualization. Down-sampled automatically to a maximum of 50 points to optimize payload delivery.

* **Endpoint**: `GET /api/public/missions/{mission_id}/trend`
* **Response Body** (`PublicTrendData`):
  ```json
  {
    "mission_id": "M-2026-08-29-A",
    "trend": [
      {
        "timestamp": "2026-08-29T09:10:00Z",
        "aqi": 75,
        "pm25": 24.5,
        "pm10": 45.0,
        "temperature": 28.5,
        "humidity": 65.0
      }
    ]
  }
  ```

---

## 6. Get Public Hotspots
Returns currently active pollution hotspots detected across all completed missions.

* **Endpoint**: `GET /api/public/hotspots`
* **Response Body** (`PublicHotspotList`):
  ```json
  {
    "items": [
      {
        "latitude": 12.9722,
        "longitude": 77.5952,
        "radius": 75.0,
        "severity": "MODERATE",
        "average_aqi": 110,
        "peak_aqi": 142,
        "timestamp": "2026-08-29T09:10:00Z"
      }
    ]
  }
  ```

---

## 7. Grounded Public AI Query
Enables natural language querying of the mission environment. Uses the verified grounded RAG pipeline to retrieve relevant environmental reference documents and telemetry averages without exposing raw operator prompts, DB keys, or diagnostic details.

* **Endpoint**: `POST /api/public/ai/query`
* **Request Body** (`PublicAIQueryRequest`):
  ```json
  {
    "mission_id": "M-2026-08-29-A",
    "question": "Is the AQI level dangerous?"
  }
  ```
* **Response Body** (`PublicAIResponse`):
  ```json
  {
    "answer": "According to the FLUXX measurements, the highest AQI was 142 (Moderate) near 12.9722, 77.5952. The retrieved reference states that AQI values between 101 and 200 may affect sensitive groups.",
    "facts": [
      "The highest AQI recorded in this mission was 142 (Moderate) at latitude 12.97220, longitude 77.59520."
    ],
    "inferences": [
      "An AQI above 100 may affect sensitive groups (children, elderly, respiratory patients)."
    ],
    "recommendations": [
      "Increase sampling density around this zone."
    ],
    "confidence": "high",
    "knowledge_sources": [
      {
        "document_id": "aqi_categories_001",
        "title": "AQI Category Definitions",
        "source": "CPCB (Central Pollution Control Board, India)",
        "source_reference": "CPCB AQI Technical Document, 2014."
      }
    ]
  }
  ```
* **Error Responses**:
  * **404 Not Found**:
    ```json
    {
      "error": "MISSION_NOT_FOUND",
      "message": "The requested mission does not exist."
    }
    ```
