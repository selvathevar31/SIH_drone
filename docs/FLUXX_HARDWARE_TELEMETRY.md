# QUADCOPTER Hardware Telemetry Contract

This document defines the strict API contract between the physical ESP32 drone payload and the QUADCOPTER backend ingestion service.

## 1. Authentication
The ESP32 must authenticate telemetry packets using a pre-shared key (PSK) in the HTTP headers.
- **Header:** `X-Hardware-Token`
- **Value:** `<YOUR_HARDWARE_SECRET>` (Configured in `.env`)

## 2. Telemetry Endpoint
- **URL:** `POST /api/telemetry/hardware`
- **Content-Type:** `application/json`

## 3. Payload Schema (JSON)
The minimum expected environmental payload is shown below. Missing sensor values must be explicitly sent as `null`, rather than omitting the key or sending `0.0`.

```json
{
  "mission_id": "SIM-1788000150", 
  "timestamp": "2026-08-29T19:35:00Z",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "altitude": 45.2,
  "pm25": 42.5,
  "pm10": 55.1,
  "temperature": 28.4,
  "humidity": 65.0,
  "source": "hardware"
}
```

### Field Definitions & Constraints
- `mission_id` (string): Must match an actively running mission in the backend database.
- `timestamp` (string): ISO 8601 formatted UTC time.
- `latitude` (float): Decimal degrees (-90.0 to 90.0). Packets without a valid GPS fix must be dropped by the ESP32.
- `longitude` (float): Decimal degrees (-180.0 to 180.0).
- `altitude` (float): Relative altitude in meters.
- `pm25` (float, nullable): PM2.5 concentration (µg/m³). Cannot be negative.
- `pm10` (float, nullable): PM10 concentration (µg/m³). Cannot be negative.
- `temperature` (float, nullable): Ambient temperature (°C).
- `humidity` (float, nullable): Relative humidity (%).
- `source` (string): Must strictly be `"hardware"`.

## 4. Response Codes
The backend will return explicit HTTP status codes indicating the success or failure of ingestion.

| HTTP Status | Meaning | Action Required by ESP32 |
| :--- | :--- | :--- |
| **201 Created** | Telemetry successfully saved. | None. Continue sampling. |
| **401 Unauthorized** | Missing or invalid `X-Hardware-Token`. | Check firmware configuration. |
| **400 Bad Request** | Malformed JSON or invalid data types. | Debug serialization logic. |
| **404 Not Found** | The specified `mission_id` does not exist. | Create a mission via Dashboard first. |
| **422 Unprocessable Entity**| Impossible values (e.g. negative PM2.5).| Check sensor electrical integrity. |

## 5. Unvalidated Hardware Constraints
### ⚠️ MQ-7 Carbon Monoxide Sensor
Status: **HARDWARE PRESENT / SOFTWARE NOT YET VALIDATED**
The `co_ppm` field is intentionally omitted from this contract. Do not attempt to send raw ADC voltages as `co_ppm`. MQ-7 integration requires specific heater cycle implementation (alternating 5V / 1.4V) and empirical calibration curves which are currently outside the scope of this phase.
