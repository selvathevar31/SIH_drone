#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* backend_url = "http://192.168.1.100:8000/api/telemetry/hardware";
const char* hardware_token = "qudracopter-hardware-secret";
const char* mission_id = "SIM-1788000150";

// --- Sensor Status Abstraction ---
enum SensorStatus {
    STATUS_VALID,
    STATUS_DISCONNECTED,
    STATUS_INVALID,
    STATUS_STALE,
    STATUS_NOT_CONFIGURED
};

String getStatusString(SensorStatus status) {
    switch (status) {
        case STATUS_VALID: return "VALID";
        case STATUS_DISCONNECTED: return "DISCONNECTED";
        case STATUS_INVALID: return "INVALID";
        case STATUS_STALE: return "STALE";
        case STATUS_NOT_CONFIGURED: return "NOT_CONFIGURED";
        default: return "UNKNOWN";
    }
}

// --- Sensor State Storage ---
SensorStatus gpsStatus = STATUS_DISCONNECTED;
float currentLat = 0.0;
float currentLon = 0.0;

SensorStatus pmsStatus = STATUS_DISCONNECTED;
float currentPM25 = -1.0;
float currentPM10 = -1.0;

SensorStatus dhtStatus = STATUS_DISCONNECTED;
float currentTemp = -999.0;
float currentHumidity = -1.0;

SensorStatus mq7Status = STATUS_NOT_CONFIGURED; // Formally disabled

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\nQUADCOPTER PHASE 16A ESP32 BENCH CLIENT");
    
    // Connect Wi-Fi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected!");
}

// -----------------------------------------
// SENSOR READ FUNCTIONS (STUBS)
// -----------------------------------------
void readGPS() {
    // TODO: Implement actual HardwareSerial GPS parsing
    gpsStatus = STATUS_VALID;
    currentLat = 12.9716;
    currentLon = 77.5946;
}

void readDHT11() {
    // TODO: Implement actual DHT reading. 
    // Example of handling a failed read:
    // if (isnan(temp)) { dhtStatus = STATUS_INVALID; return; }
    
    // Simulating a failed sensor read for testing Phase 16A requirements:
    dhtStatus = STATUS_DISCONNECTED;
}

void readPMS() {
    // TODO: Implement UART frame protocol for PMS sensor
    pmsStatus = STATUS_VALID;
    currentPM25 = 45.2;
    currentPM10 = 60.1;
}

String getIsoTimestamp() {
    // In production, sync time via NTP.
    return "2026-08-29T20:00:00Z";
}

void printSerialDiagnostics() {
    Serial.println("\n--- LOCAL SERIAL DIAGNOSTICS ---");
    Serial.print("GPS:       "); Serial.println(getStatusString(gpsStatus));
    Serial.print("LATITUDE:  "); Serial.println(currentLat, 6);
    Serial.print("LONGITUDE: "); Serial.println(currentLon, 6);
    
    Serial.print("DHT11:     "); Serial.println(getStatusString(dhtStatus));
    Serial.print("TEMP:      "); Serial.println(dhtStatus == STATUS_VALID ? String(currentTemp, 1) : "null");
    Serial.print("HUMIDITY:  "); Serial.println(dhtStatus == STATUS_VALID ? String(currentHumidity, 1) : "null");
    
    Serial.print("PMS:       "); Serial.println(getStatusString(pmsStatus));
    Serial.print("PM2.5:     "); Serial.println(pmsStatus == STATUS_VALID ? String(currentPM25, 1) : "null");
    Serial.print("PM10:      "); Serial.println(pmsStatus == STATUS_VALID ? String(currentPM10, 1) : "null");
    
    Serial.print("MQ-7:      "); Serial.println(getStatusString(mq7Status));
    
    Serial.print("BACKEND:   "); Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
    Serial.println("--------------------------------\n");
}

void loop() {
    delay(5000);
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi disconnected. Reconnecting...");
        return;
    }

    readGPS();
    readDHT11();
    readPMS();
    
    printSerialDiagnostics();

    // 1. Enforce GPS Validity before sending
    if (gpsStatus != STATUS_VALID || (currentLat == 0.0 && currentLon == 0.0)) {
        Serial.println("[ERROR] No valid GPS fix. Dropping payload.");
        return; 
    }

    // 2. Construct JSON Payload
    StaticJsonDocument<512> doc;
    doc["mission_id"] = mission_id;
    doc["timestamp"] = getIsoTimestamp();
    doc["latitude"] = currentLat;
    doc["longitude"] = currentLon;
    doc["altitude"] = 50.0;
    doc["data_source"] = "hardware"; // Explicitly enforced

    if (pmsStatus == STATUS_VALID && currentPM25 >= 0) {
        doc["pm25"] = currentPM25;
        doc["pm10"] = currentPM10;
    } else {
        doc["pm25"] = nullptr;
        doc["pm10"] = nullptr;
    }

    if (dhtStatus == STATUS_VALID) {
        doc["temperature"] = currentTemp;
        doc["humidity"] = currentHumidity;
    } else {
        doc["temperature"] = nullptr;
        doc["humidity"] = nullptr;
    }

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // 3. HTTP POST
    HTTPClient http;
    http.begin(backend_url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Hardware-Token", hardware_token);

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
        Serial.print("[INFO] POST Success. HTTP Code: ");
        Serial.println(httpResponseCode);
    } else {
        Serial.print("[ERROR] POST Failed. HTTP Code: ");
        Serial.println(httpResponseCode);
    }

    http.end();
}
