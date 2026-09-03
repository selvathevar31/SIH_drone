# PHASE 15 ELECTRICAL SAFETY CHECKLIST

Before powering the ESP32 bench test or connecting sensors to the microcontroller, every item on this checklist must be physically verified. 

**DO NOT PROCEED TO FLIGHT WITHOUT ELECTRICAL VERIFICATION.**

## General Power Architecture
| Component | Power Source | Expected Voltage | Verification Status |
| :--- | :--- | :--- | :--- |
| **LiPo Battery** | Direct | 11.1V (3S) | 🔲 REQUIRES VERIFICATION |
| **BEC Output** | LiPo Battery | 5V | 🔲 REQUIRES VERIFICATION |
| **ESP32 Power IN** | BEC | 5V (to VIN/5V pin only) | 🔲 REQUIRES VERIFICATION |
| **Sensor Power** | BEC | 5V | 🔲 REQUIRES VERIFICATION |

*Warning:* Supplying 5V directly to the ESP32 `3.3V` pin will destroy the microcontroller. 

## Sensor Signal Integration

### 1. ArduPilot (Flight Controller MAVLink)
* **Signal Type:** UART (Serial)
* **Signal Voltage:** Usually 3.3V or 5V (Depends on Flight Controller model).
* **ESP32 Connection:** RX/TX pins.
* **Conditioning Required:** If the Flight Controller outputs 5V UART, a logic level shifter or simple voltage divider (on the ArduPilot TX -> ESP32 RX line) is REQUIRED.
* **Status:** 🔲 REQUIRES DATASHEET VERIFICATION

### 2. PMS2.5 / GP2Y1010 Particulate Sensor
* **Signal Type:** UART (Digital) or Analog (Depends on exact variant)
* **Signal Voltage:** 5V
* **ESP32 Connection:** UART RX / ADC Pin
* **Conditioning Required:** 
  - *If UART:* The 5V TX pin from the sensor MUST pass through a voltage divider (e.g., 10kΩ / 20kΩ) to reach ~3.3V before connecting to the ESP32 RX pin.
  - *If Analog (GP2Y1010):* The analog output can reach up to 3.5V-5V depending on dust density and pull-up resistors. A voltage divider is absolutely mandatory before the ESP32 ADC pin.
* **Status:** 🔲 REQUIRES DATASHEET VERIFICATION

### 3. DHT11 Temperature & Humidity
* **Signal Type:** Digital (1-wire protocol)
* **Signal Voltage:** 3.3V to 5V
* **ESP32 Connection:** Digital GPIO
* **Conditioning Required:** The DHT11 can typically be powered directly from the ESP32's 3.3V rail. In this configuration, the signal logic level will be safely at 3.3V. A 10kΩ pull-up resistor to 3.3V is required on the data line.
* **Status:** 🔲 ELECTRICAL VERIFIED (Assuming 3.3V operation)

### 4. MQ-7 Carbon Monoxide Sensor
* **Signal Type:** Analog ADC
* **Power Voltage:** 5V (Requires alternating 5V and 1.4V for heater cycle).
* **Signal Voltage:** 0V to 5V.
* **ESP32 Connection:** ADC Pin
* **Conditioning Required:** A voltage divider is mandatory to step the 0-5V signal down to 0-3.3V for the ESP32 ADC.
* **Firmware Status:** **DISABLED**. The backend and ESP32 stub currently reject and ignore MQ-7 outputs until proper heater-cycle timing and empirical calibration functions are written.
* **Status:** 🟥 DO NOT INTEGRATE YET

## Common Ground
🔲 **VERIFY:** The LiPo ground, ArduPilot ground, BEC ground, ESP32 ground, and all Sensor grounds must be connected together. Floating grounds will result in erratic analog readings, failed UART communication, and potential damage.
