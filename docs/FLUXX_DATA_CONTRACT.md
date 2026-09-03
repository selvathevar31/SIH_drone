# FLUXX Environmental Data Contract

This document defines the canonical environmental data contract for the FLUXX / QUDRACOPTER platform. This contract must be adhered to by all components (sensors, ingestion parsers, databases, dashboard APIs, GIS interfaces, and future AI/RAG layers).

---

## 1. Canonical Fields & Units

Every environmental record contains these core parameters:

| Field | Type | Description | Units / Range | Required |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | Datetime | UTC timestamp of recording (ISO 8601 preferred). | E.g. `2026-08-29T14:32:00Z` | **YES** |
| `latitude` | Float | Decimal degree coordinate. | `[-90.0, 90.0]` | **YES** |
| `longitude` | Float | Decimal degree coordinate. | `[-180.0, 180.0]` | **YES** |
| `altitude` | Float | Altitude relative to the flight launch point (`RELATIVE_HOME`). Semantics depend on hardware sensors (barometer or GPS); not guaranteed as WGS84 ellipsoid height. | Meters (m) | No |
| `pm1` | Float | Particulate Matter 1.0. | `[0.0, ∞)` µg/m³ | No |
| `pm25` | Float | Particulate Matter 2.5. | `[0.0, ∞)` µg/m³ | No |
| `pm10` | Float | Particulate Matter 10.0. | `[0.0, ∞)` µg/m³ | No |
| `temperature`| Float | Ambient air temperature. | `[-50.0, 100.0]` °C | No |
| `humidity` | Float | Relative air humidity. | `[0.0, 100.0]` % | No |

---

## 2. Validation & Quality Rules

1. **Required Elements**: A record is considered *spatial* and valid for GIS maps only if it contains `timestamp`, `latitude`, and `longitude`. If any of these are missing or invalid, the row is rejected.
2. **Nullable Sensor Data**: Physical sensor values (`pm1`, `pm25`, `pm10`, `temperature`, `humidity`, `altitude`) are optional. If a sensor fails or is not connected, the field must be stored as **`NULL`**.
3. **Strict Bounds Checking**:
   - Coordinates outside their physical limits are rejected.
   - Particulate concentrations (`pm1`, `pm25`, `pm10`) cannot be negative.
   - Temperature and humidity outside reasonable physical ranges are rejected.
4. **Derived Values AQI**:
   - AQI (`aqi` and `aqi_category`) are calculated from `pm25` and `pm10`.
   - If either input parameter is missing (`NULL`), AQI calculations must not proceed (or be marked as `NULL`).
   - No default values (like `0` or static mocks) are allowed for missing telemetry.

---

## 3. Data Source Metadata

Every mission must identify its telemetry origin using the `data_source` attribute:
- `CSV`: Telemetry uploaded via standard ground control CSV formats.
- `ESP32` / `ARDUINO`: Real-time serial/socket connection with physical flight boards.
- `SIMULATOR`: Synthetically generated data.
- `DEMO`: Static predefined demonstrations.
- `UNKNOWN`: Default fallback for missing metadata.

---

## 4. Ingestion Formatting & CSV Alias Normalization

Ingestion pipelines must support the canonical CSV format. The parser will map common abbreviations to the canonical fields before database insertion:
- `lat` → `latitude`
- `lon` → `longitude`
- `temp` → `temperature`
- `humid` → `humidity`

---

## 5. API Response Schema (Public vs Operator Data)

### Public Consumable Namespace (`/api/v1/readings`)
Exposes only environmental attributes, general coordinate areas, and data quality indicators:
```json
{
  "timestamp": "2026-08-29T14:32:00Z",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "altitude": 45.5
  },
  "measurements": {
    "pm1": 12.0,
    "pm25": 25.5,
    "pm10": 35.0,
    "temperature": 28.5,
    "humidity": 65.0
  },
  "derived": {
    "aqi": 79,
    "aqi_category": "Moderate"
  },
  "metadata": {
    "source": "CSV",
    "quality_status": "VALID",
    "validation_warnings": []
  }
}
```

### Operator Namespace (`/api/readings`)
Returns the standard flat backward-compatible keys alongside the public structure to support legacy Leaflet maps, 3D Cesium views, and dashboard trend charts without breaking changes.
