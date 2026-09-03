# PHASE 16A WIRING CHECKLIST

This document enforces absolute clarity on the physical connections required for the Phase 16A ESP32 Bench Test. 

**WARNING**: Do not guess voltage divider values. If a signal output is unknown, you must verify the component datasheet before wiring it to the ESP32.

---

## 1. Power Distribution
| SOURCE | SIGNAL TYPE | SOURCE VOLTAGE | ESP32 PIN | ESP32 MAXIMUM ALLOWED INPUT | LEVEL SHIFT / CONDITIONING | GROUND | VERIFICATION STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| LiPo Battery | DC Power | 11.1V (3S) | **DO NOT CONNECT** | 5.5V | Requires BEC (Battery Eliminator Circuit) | Common | 🔲 PENDING |
| BEC Output | DC Power | 5.0V | `VIN` or `5V` | 5.5V | None (Uses onboard ESP32 LDO) | Common | 🔲 PENDING |

---

## 2. Sensor Integration

### GPS Module
| SOURCE | SIGNAL TYPE | SOURCE VOLTAGE | ESP32 PIN | ESP32 MAXIMUM ALLOWED INPUT | LEVEL SHIFT / CONDITIONING | GROUND | VERIFICATION STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GPS TX | UART | **UNKNOWN** | RX2 (GPIO 16) | 3.3V | **REQUIRES DATASHEET VERIFICATION**. If GPS outputs 5V, a voltage divider is mandatory. | Common | 🔲 PENDING |

### PMS Particulate Sensor
| SOURCE | SIGNAL TYPE | SOURCE VOLTAGE | ESP32 PIN | ESP32 MAXIMUM ALLOWED INPUT | LEVEL SHIFT / CONDITIONING | GROUND | VERIFICATION STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| PMS TX | UART | **UNKNOWN** | RX1 (GPIO 9) | 3.3V | **REQUIRES PHYSICAL VERIFICATION**. If using a PMS5003 powered by 5V, its TX line outputs 3.3V logic (safe). If using another model that outputs 5V logic, a 10k/20k voltage divider is mandatory. | Common | 🔲 PENDING |

### DHT11 Temperature & Humidity
| SOURCE | SIGNAL TYPE | SOURCE VOLTAGE | ESP32 PIN | ESP32 MAXIMUM ALLOWED INPUT | LEVEL SHIFT / CONDITIONING | GROUND | VERIFICATION STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DHT DATA | Digital (1-wire) | 3.3V | Any GPIO | 3.3V | Power DHT11 from ESP32 `3.3V` pin. Add a 10kΩ pull-up resistor between DATA and 3.3V. | Common | 🔲 PENDING |

### MQ-7 Carbon Monoxide
| SOURCE | SIGNAL TYPE | SOURCE VOLTAGE | ESP32 PIN | ESP32 MAXIMUM ALLOWED INPUT | LEVEL SHIFT / CONDITIONING | GROUND | VERIFICATION STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MQ-7 A0 | Analog | 0-5V | **DO NOT CONNECT** | 3.3V | **DISABLED**. The backend software does not currently accept CO values. Connecting the 5V analog signal without a voltage divider will destroy the ESP32 ADC. | Common | 🟥 DO NOT CONNECT |

---

## Final Checks
- 🔲 **COMMON GROUND:** The BEC, ESP32, GPS, PMS, and DHT11 grounds must be tied together.
- 🔲 **NO GUESSING:** If a sensor's exact module (e.g. GY-GPS6MV2 vs generic Neo-6M) is not confirmed, its logic level is assumed hostile (5V) until proven otherwise.
