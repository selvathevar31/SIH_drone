# QUADCOPTER ESP32 Hardware Stub

This directory contains the integration guidelines for the ESP32 environmental sensing payload.

## Responsibilities
The QUADCOPTER physical drone strictly splits responsibilities between two systems to maintain flight safety:

1. **ArduPilot (Flight Controller)**: Handles GPS, IMU, battery telemetry, and motor control. It transmits flight telemetry (latitude, longitude, altitude) over a UART connection to the ESP32 using MAVLink.
2. **ESP32 (Environmental Payload)**: Connects to the environmental sensors (PMS2.5, DHT11) via I2C/UART/GPIO. It fuses the environmental readings with the MAVLink flight telemetry and pushes the combined JSON payload over Wi-Fi/LTE to the `POST /api/telemetry/hardware` API.

---

## CRITICAL: Power and Voltage Safety

### ⚠️ WARNING: DO NOT DESTROY THE ESP32 ADC
The ESP32 is a strictly **3.3V logic device**.

- **LiPo Battery (3S 11.1V)**: DO NOT connect this directly to any sensor or the ESP32.
- **5V 3A BEC**: This outputs 5V. 
  - **Powering Sensors**: You may power 5V sensors (like GP2Y1010, MQ-7) from the 5V BEC.
  - **Powering ESP32**: Do NOT connect the 5V BEC to the 3.3V pin of the ESP32. If using a DevKit, connect it to the `5V` (or `VIN`) pin which has a built-in LDO regulator.
  - **Signal Lines (CRITICAL)**: If a sensor operates at 5V, its analog or digital output signal will also be 5V. **You CANNOT connect a 5V signal wire directly to an ESP32 GPIO pin.** You must insert a **Voltage Divider** (e.g., using a 10kΩ and 20kΩ resistor) to drop the 5V signal down to ~3.3V before it reaches the ESP32.

### MQ-7 (Carbon Monoxide) Sensor Constraints
- The MQ-7 requires alternating 5V and 1.4V heater cycles to accurately measure CO. 
- It outputs an analog voltage.
- Because of the complex heater cycle and calibration requirements, **software support for MQ-7 is currently disabled**. Do not attempt to map raw ADC voltages to `co_ppm` without proper algorithmic conditioning.

---

## Firmware Implementation Steps

When writing the ESP32 C++ firmware, follow this structure:

1. **Initialize Connections**
   - Boot ESP32.
   - Connect to Wi-Fi / LTE hotspot.
   - Open Hardware Serial (UART) to ArduPilot.

2. **Data Acquisition Loop (every 2 seconds)**
   - Request MAVLink GPS/Altitude packet from ArduPilot.
   - If no GPS fix, abort cycle (do not send to backend).
   - Read DHT11 (Temp/Humidity).
   - Read PMS2.5 via UART (PM1, PM2.5, PM10).

3. **Construct JSON Payload**
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

4. **Transmit to Backend**
   - Construct HTTP POST request to `http://<backend_ip>:8000/api/telemetry/hardware`.
   - Append Header: `X-Hardware-Token: <YOUR_HARDWARE_SECRET>`
   - Send payload.
   - Handle 400/401/422/500 HTTP response codes.

5. **Failure Handling**
   - If DHT11 fails to read, send `"temperature": null, "humidity": null`. **Do not send `0.0` or invent numbers.**
   - If PMS2.5 serial disconnects, send `"pm25": null`.
