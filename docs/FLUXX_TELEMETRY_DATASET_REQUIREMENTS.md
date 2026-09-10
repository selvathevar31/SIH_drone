# FLUXX Drone Telemetry Dataset Requirements

To train the drone-compatible AQI forecasting model (Option B), the hardware and data collection teams must compile a dataset that strictly meets the following specifications.

## 1. Required CSV Data Schema
The training CSV must contain the following columns exactly as named (case-insensitive for the upload importer):

| Column Name | Description | Valid Range / Data Type | Required for ML? |
| :--- | :--- | :--- | :--- |
| `timestamp` | UTC or ISO-8601 formatted datetime string. | e.g. `2026-10-01T14:30:00Z` | **Yes** |
| `latitude` | Drone's GPS Latitude. | `-90.0` to `90.0` | **Yes** |
| `longitude` | Drone's GPS Longitude. | `-180.0` to `180.0` | **Yes** |
| `altitude` | Elevation/Altitude of the drone in meters. | `0.0` to `1000.0` | **Yes** |
| `pm25` | Raw PM2.5 concentration (ug/m3). | `0.0` to `1500.0` | **Yes** |
| `pm10` | Raw PM10 concentration (ug/m3). | `0.0` to `1500.0` | **Yes** |
| `temperature`| Ambient Air Temperature (Celsius). | `-50.0` to `100.0` | **Yes** |
| `humidity` | Relative Humidity (Percentage). | `0.0` to `100.0` | **Yes** |
| `pm1` | Raw PM1.0 concentration (ug/m3). | `0.0` to `1500.0` | Optional |
| `aqi_6h` | **The Future Ground-Truth AQI Target.** | `0.0` to `500.0` | **CRITICAL** |

## 2. The Architectural Challenge: Generating `aqi_6h`
Because the drone only flies for short intervals (15-30 minutes), it physically cannot collect the future AQI 6 hours after its flight ends.

**How to generate the target for the training dataset:**
1. Fly the drone at a specific coordinate (e.g., above the Anand Vihar CAAQMS station).
2. Record the drone's telemetry (`pm25`, `pm10`, `temperature`, `humidity`, `altitude`) into the CSV.
3. Wait exactly 6 hours.
4. Retrieve the **actual surface AQI** recorded by the stationary ground station at that location.
5. Append that future surface AQI value into the `aqi_6h` column of the drone's telemetry row.

*Without pairing historical drone flights with future ground-truth validation data, the model cannot be trained to forecast.*

## 3. Sampling Frequency & Data Volume
- **Sampling Frequency**: Drone data recorded at 1Hz (1 reading per second) should be down-sampled or averaged into 1-minute or 5-minute spatial bins to reduce noise.
- **Minimum Data Volume**: A minimum of **10,000 paired observations** across diverse weather conditions, altitudes, and pollution levels is recommended for a scientifically defensible Gradient Boosting model.
- **Spatial Diversity**: Ensure flights cover multiple altitudes (e.g., 10m, 50m, 100m) to train the model on how elevation impacts PM concentration decay.
