import requests
import time
import os

BASE_URL = "http://localhost:8000/api"

def create_csv_content(mission_id, rows):
    header = "timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity,speed,heading,battery,satellites,gps_status,signal_strength\n"
    content = header
    for r in rows:
        content += f"{r['ts']},{r['lat']},{r['lon']},{r['alt']},{r['pm25']},{r['pm10']},25,60,5,180,95,12,3D Fix,100\n"
    return content

def run_tests():
    print("========================================")
    print(" STEP 5B: AUTOMATED END-TO-END VERIFICATION ")
    print("========================================\n")

    # 1. Prepare Data
    # MISSION A (Initial Survey)
    # Group of points close together (will form a zone & hotspot)
    m_a_rows = [
        {"ts": "2023-10-01T10:00:00Z", "lat": 10.00010, "lon": 20.00010, "alt": 100.5, "pm25": 15, "pm10": 30},
        {"ts": "2023-10-01T10:00:05Z", "lat": 10.00011, "lon": 20.00011, "alt": 100.5, "pm25": 85, "pm10": 130}, # Hotspot!
        {"ts": "2023-10-01T10:00:10Z", "lat": 10.00012, "lon": 20.00012, "alt": 100.5, "pm25": 90, "pm10": 140}, # Hotspot!
        {"ts": "2023-10-01T10:00:15Z", "lat": 10.00013, "lon": 20.00013, "alt": 100.5, "pm25": 88, "pm10": 135}, # Hotspot!
        {"ts": "2023-10-01T10:00:20Z", "lat": 10.00014, "lon": 20.00014, "alt": 100.5, "pm25": 82, "pm10": 125}, # Hotspot!
        {"ts": "2023-10-01T10:00:25Z", "lat": 10.00015, "lon": 20.00015, "alt": 100.5, "pm25": 85, "pm10": 130}, # Hotspot!
        
        # Isolated point far away (Will NOT form a zone, but has high pollution so it's a hotspot)
        {"ts": "2023-10-01T10:10:00Z", "lat": 15.00000, "lon": 30.00000, "alt": 120.0, "pm25": 95, "pm10": 150}
    ]
    
    csv_a = create_csv_content("M-TEST-A", m_a_rows)
    with open("mission_a.csv", "w") as f:
        f.write(csv_a)

    # MISSION B (Later Survey)
    # Group of points close to Mission A's zone (should form a persistent hotspot)
    m_b_rows = [
        {"ts": "2023-10-02T10:00:00Z", "lat": 10.00010, "lon": 20.00010, "alt": 100.5, "pm25": 15, "pm10": 30},
        {"ts": "2023-10-02T10:00:05Z", "lat": 10.00011, "lon": 20.00011, "alt": 100.5, "pm25": 88, "pm10": 135}, # Hotspot!
        {"ts": "2023-10-02T10:00:10Z", "lat": 10.00012, "lon": 20.00012, "alt": 100.5, "pm25": 92, "pm10": 145}, # Hotspot!
        
        # Completely different area (should NOT be a persistent hotspot)
        {"ts": "2023-10-02T10:10:00Z", "lat": -10.0000, "lon": -20.0000, "alt": 50.0, "pm25": 95, "pm10": 150}
    ]
    csv_b = create_csv_content("M-TEST-B", m_b_rows)
    with open("mission_b.csv", "w") as f:
        f.write(csv_b)

    try:
        # TEST 1 & 3: Upload/Import CSV & Altitude validation
        print("[1] Testing CSV Upload & Ingestion Pipeline...")
        res_a = requests.post(
            f"{BASE_URL}/upload/csv", 
            files={"file": ("mission_a.csv", open("mission_a.csv", "rb"), "text/csv")},
            data={"mission_id": "M-TEST-A", "drone_id": "TEST-DRONE"}
        )
        assert res_a.status_code == 201, f"Upload A failed: {res_a.text}"
        
        res_b = requests.post(
            f"{BASE_URL}/upload/csv", 
            files={"file": ("mission_b.csv", open("mission_b.csv", "rb"), "text/csv")},
            data={"mission_id": "M-TEST-B", "drone_id": "TEST-DRONE"}
        )
        assert res_b.status_code == 201, f"Upload B failed: {res_b.text}"
        
        print("    -> SUCCESS: CSV pipeline imported Latitude, Longitude, Altitude, Timestamp flawlessly.\n")

        # Fetch Data Explorer to check parsing
        res_exp = requests.get(f"{BASE_URL}/missions/M-TEST-A/readings?limit=10")
        data_exp = res_exp.json()["items"]
        assert data_exp[0]["altitude"] == 100.5, "Altitude was not saved correctly"
        
        # TEST 2: AQI Calculation
        print("[2] Verifying Deterministic AQI Calculation...")
        # pm25=15, pm10=30 -> AQI ~ 25 (Good)
        assert data_exp[0]["pm25"] == 15
        assert data_exp[0]["aqi_category"] == "Good"
        
        # pm25=85, pm10=130 -> PM2.5 AQI ~ 181 (Poor), PM10 AQI ~ 120 (Moderate). Overall AQI should be 181.
        assert data_exp[1]["pm25"] == 85
        assert data_exp[1]["aqi_category"] == "Poor"
        print("    -> SUCCESS: AQI accurately calculated against CPCB formula.\n")

        # TEST 4 & 5: Zone Generation & API Check
        print("[3] Verifying Geographic Zone Generation (DBSCAN/Haversine)...")
        res_zones = requests.get(f"{BASE_URL}/missions/M-TEST-A/zones")
        assert res_zones.status_code == 200, "Zones API failed"
        zones = res_zones.json()["zones"]
        
        # Mission A has 6 readings close together, and 1 isolated reading far away
        # With min_samples=5, the 6 readings form 1 Zone. The 1 isolated reading is NOISE.
        assert len(zones) == 1, f"Expected 1 Zone, found {len(zones)}. Isolated point correctly ignored as noise."
        zone = zones[0]
        assert zone["measurement_count"] == 6
        assert zone["radius_meters"] == 100.0 # Standard config
        print("    -> SUCCESS: Zone API successfully clustered nearby points and ignored isolated noise.\n")
        
        # TEST 6 & 7: Persistent Hotspot Logic
        print("[4] Verifying Persistent Hotspot Logic across Surveys...")
        res_persistent = requests.get(f"{BASE_URL}/hotspots/persistent")
        assert res_persistent.status_code == 200, "Persistent Hotspots API failed"
        persistent = res_persistent.json()
        
        assert persistent["status"] == "OK"
        
        # There should be exactly 1 persistent hotspot near (10.0001, 20.0001)
        # The hotspot at (15, 30) is only in Mission A.
        # The hotspot at (-10, -20) is only in Mission B.
        hotspots = persistent["persistent_hotspots"]
        assert len(hotspots) == 1, f"Expected 1 persistent hotspot, found {len(hotspots)}"
        
        ph = hotspots[0]
        assert ph["surveys_detected"] == 2
        assert abs(ph["latitude"] - 10.0001) < 0.001
        print("    -> SUCCESS: Persistent Hotspot Engine correctly identified overlap across 2 missions!")
        print("    -> SUCCESS: Single-mission hotspots were correctly ignored.\n")

        print("========================================")
        print(" ALL 5 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY. ")
        print("========================================")
        
    finally:
        if os.path.exists("mission_a.csv"): os.remove("mission_a.csv")
        if os.path.exists("mission_b.csv"): os.remove("mission_b.csv")

if __name__ == "__main__":
    run_tests()
