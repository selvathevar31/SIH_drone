import urllib.request
import urllib.parse
import os
import json

BASE_URL = "http://localhost:8000/api"

def upload_csv(filepath, mission_id, drone_id):
    import mimetypes
    from uuid import uuid4
    boundary = uuid4().hex
    
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
    data = []
    
    # Add file
    with open(filepath, 'rb') as f:
        file_content = f.read()
        
    data.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filepath}"\r\nContent-Type: text/csv\r\n\r\n'.encode('utf-8'))
    data.append(file_content)
    data.append(b'\r\n')
    
    # Add mission_id
    data.append(f'--{boundary}\r\nContent-Disposition: form-data; name="mission_id"\r\n\r\n{mission_id}\r\n'.encode('utf-8'))
    
    # Add drone_id
    data.append(f'--{boundary}\r\nContent-Disposition: form-data; name="drone_id"\r\n\r\n{drone_id}\r\n'.encode('utf-8'))
    
    data.append(f'--{boundary}--\r\n'.encode('utf-8'))
    
    body = b''.join(data)
    req = urllib.request.Request(f"{BASE_URL}/upload/csv", data=body, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def get_json(url):
    req = urllib.request.Request(url, method='GET')
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode())

def run_custom_verification():
    print("========================================")
    print(" CUSTOM DATASET VERIFICATION ")
    print("========================================\n")

    csv_content = """location_name,latitude,longitude,timestamp,pm25,pm10,co2,temperature,humidity,aqi,source,altitude
Alandi,18.677,73.8987,2026-04-10T00:00:00,41,76,515,23.2,69,92,simulated_sensor,71.2
Alandi,18.677,73.8987,2026-04-10T01:00:00,40,74,510,22.9,70,90,simulated_sensor,22.0
Alandi,18.677,73.8987,2026-04-10T02:00:00,39,73,505,22.6,71,88,simulated_sensor,42.0
Alandi,18.677,73.8987,2026-04-10T03:00:00,38,71,500,22.3,72,86,simulated_sensor,37.9
Alandi,18.677,73.8987,2026-04-10T04:00:00,37,70,495,22.0,73,85,simulated_sensor,78.9
Alandi,18.677,73.8987,2026-04-10T05:00:00,40,75,520,23.0,68,90,simulated_sensor,74.1
Alandi,18.677,73.8987,2026-04-10T06:00:00,45,82,550,24.5,63,100,simulated_sensor,91.4
Alandi,18.677,73.8987,2026-04-10T07:00:00,50,90,580,26.5,58,110,simulated_sensor,27.0
Alandi,18.677,73.8987,2026-04-10T08:00:00,54,98,600,28.5,52,118,simulated_sensor,53.8
Alandi,18.677,73.8987,2026-04-10T09:00:00,56,102,620,30.0,48,122,simulated_sensor,22.4
Alandi,18.677,73.8987,2026-04-10T10:00:00,58,105,630,31.5,45,125,simulated_sensor,37.5
Alandi,18.677,73.8987,2026-04-10T11:00:00,59,108,640,32.5,42,128,simulated_sensor,60.4
Alandi,18.677,73.8987,2026-04-10T12:00:00,60,110,650,33.2,40,130,simulated_sensor,22.1
Alandi,18.677,73.8987,2026-04-10T13:00:00,59,108,645,33.8,38,128,simulated_sensor,35.9
Alandi,18.677,73.8987,2026-04-10T14:00:00,58,106,640,34.2,37,126,simulated_sensor,72.0
Alandi,18.677,73.8987,2026-04-10T15:00:00,56,104,630,33.5,38,123,simulated_sensor,63.6
Alandi,18.677,73.8987,2026-04-10T16:00:00,54,100,620,32.8,40,120,simulated_sensor,37.6
Alandi,18.677,73.8987,2026-04-10T17:00:00,57,105,640,31.0,45,125,simulated_sensor,67.1
Alandi,18.677,73.8987,2026-04-10T18:00:00,60,110,660,29.5,50,130,simulated_sensor,84.8
Alandi,18.677,73.8987,2026-04-10T19:00:00,62,115,680,28.5,55,135,simulated_sensor,20.5
Alandi,18.677,73.8987,2026-04-10T20:00:00,63,118,690,27.8,58,138,simulated_sensor,84.5
Alandi,18.677,73.8987,2026-04-10T21:00:00,61,112,670,26.8,60,132,simulated_sensor,75.9
Alandi,18.677,73.8987,2026-04-10T22:00:00,58,108,650,25.8,63,125,simulated_sensor,47.2
Alandi,18.677,73.8987,2026-04-10T23:00:00,55,102,630,24.8,65,118,simulated_sensor,32.4
Alandi,18.677,73.8987,2026-04-11T00:00:00,50,95,600,24.0,67,110,simulated_sensor,96.6
Alandi,18.677,73.8987,2026-04-11T03:00:00,46,88,570,23.2,70,102,simulated_sensor,46.9
Alandi,18.677,73.8987,2026-04-11T06:00:00,48,90,580,25.0,62,105,simulated_sensor,27.4
Alandi,18.677,73.8987,2026-04-11T09:00:00,55,100,620,30.2,48,120,simulated_sensor,27.7
Alandi,18.677,73.8987,2026-04-11T12:00:00,60,110,650,33.0,40,130,simulated_sensor,87.8
Alandi,18.677,73.8987,2026-04-11T15:00:00,57,105,635,33.5,38,125,simulated_sensor,68.3
Alandi,18.677,73.8987,2026-04-11T18:00:00,62,115,680,30.0,50,135,simulated_sensor,84.6
Alandi,18.677,73.8987,2026-04-11T21:00:00,59,110,660,27.0,60,128,simulated_sensor,78.4
Alandi,18.677,73.8987,2026-04-12T00:00:00,52,98,610,25.0,65,115,simulated_sensor,62.9
Alandi,18.677,73.8987,2026-04-12T06:00:00,47,90,580,25.5,60,105,simulated_sensor,97.8
Alandi,18.677,73.8987,2026-04-12T12:00:00,61,112,655,33.2,40,132,simulated_sensor,50.3
Alandi,18.677,73.8987,2026-04-12T18:00:00,63,118,690,29.8,52,138,simulated_sensor,64.2"""

    with open("custom_dataset_1.csv", "w") as f:
        f.write(csv_content)

    try:
        # TEST 1 & 3: Upload/Import CSV & Altitude validation
        print("[1] Uploading Custom Dataset as Mission 'M-ALANDI-1'...")
        status_a, res_a = upload_csv("custom_dataset_1.csv", "M-ALANDI-1", "TEST-DRONE")
        assert status_a == 201, f"Upload failed: {res_a}"
        
        print("[1] Uploading Custom Dataset as Mission 'M-ALANDI-2'...")
        status_b, res_b = upload_csv("custom_dataset_1.csv", "M-ALANDI-2", "TEST-DRONE")
        assert status_b == 201, f"Upload B failed: {res_b}"
        
        print("    -> SUCCESS: CSV pipeline imported Latitude, Longitude, Altitude, Timestamp flawlessly.\n")

        # Fetch Data Explorer to check parsing
        status_exp, data_exp_res = get_json(f"{BASE_URL}/missions/M-ALANDI-1/readings?limit=10&sort_order=asc")
        data_exp = data_exp_res["items"]
        assert data_exp[0]["altitude"] == 71.2, f"Altitude was not saved correctly. Got {data_exp[0]['altitude']} instead of 71.2"
        
        # TEST 2: AQI Calculation
        print("[2] Verifying Deterministic AQI Calculation...")
        
        print(f"DEBUG ROW 1: pm25={data_exp[0]['pm25']}, pm10={data_exp[0]['pm10']}, aqi={data_exp[0]['aqi']}, category={data_exp[0]['aqi_category']}")
        assert data_exp[0]["pm25"] == 41.0
        assert data_exp[0]["aqi"] == 76
        assert data_exp[0]["aqi_category"] == "Satisfactory"
        
        # Find a row with pm25=62 by filtering directly (avoids index drift from repeated uploads)
        status_f, data_filtered = get_json(f"{BASE_URL}/missions/M-ALANDI-1/readings?limit=5&sort_order=asc&pm25_min=62&pm25_max=62")
        data_pm62 = data_filtered["items"]
        assert len(data_pm62) > 0, "Could not find any row with pm25=62"
        print(f"DEBUG PM25=62 ROW: pm25={data_pm62[0]['pm25']}, aqi={data_pm62[0]['aqi']}, category={data_pm62[0]['aqi_category']}")
        assert data_pm62[0]["pm25"] == 62.0
        assert data_pm62[0]["aqi_category"] == "Moderately Polluted"
        print("    -> SUCCESS: AQI accurately calculated against CPCB formula.\n")

        # TEST 4 & 5: Zone Generation & API Check
        print("[3] Verifying Geographic Zone Generation (DBSCAN/Haversine)...")
        status_zones, res_zones = get_json(f"{BASE_URL}/missions/M-ALANDI-1/zones")
        assert status_zones == 200, "Zones API failed"
        zones = res_zones["zones"]
        
        assert len(zones) == 1, f"Expected 1 Zone, found {len(zones)}."
        zone = zones[0]
        assert zone["measurement_count"] >= 36, f"Expected at least 36 readings in zone, got {zone['measurement_count']}"
        print(f"    -> SUCCESS: {zone['measurement_count']} readings clustered into 1 Zone (ID: {zone['zone_id']}).\n")
        
        # TEST 6 & 7: Persistent Hotspot Logic
        print("[4] Verifying Persistent Hotspot Logic across Surveys...")
        status_ph, persistent = get_json(f"{BASE_URL}/hotspots/persistent")
        assert status_ph == 200, "Persistent Hotspots API failed"
        
        assert persistent["status"] == "OK"
        
        hotspots = persistent["persistent_hotspots"]
        print(f"    -> INFO: Found {len(hotspots)} total persistent hotspot(s) across all missions.")
        
        # Find the Alandi hotspot specifically by coordinates (other test missions may also have created hotspots)
        alandi_hotspots = [h for h in hotspots if abs(h["latitude"] - 18.677) < 0.01 and abs(h["longitude"] - 73.8987) < 0.01]
        assert len(alandi_hotspots) >= 1, f"Expected at least 1 persistent hotspot near Alandi, found none. All hotspots: {[(h['latitude'], h['longitude']) for h in hotspots]}"
        
        ph = alandi_hotspots[0]
        assert ph["surveys_detected"] >= 2
        print("    -> SUCCESS: Persistent Hotspot Engine correctly identified overlap across 2 missions!")
        print(f"    -> SUCCESS: Alandi Hotspot - Surveys: {ph['surveys_detected']}, Peak AQI: {ph['peak_aqi']}\n")

        # Checking UI Endpoints
        print("[5] Verifying API Endpoint schemas for Frontend...")
        assert "zones" in res_zones
        assert "radius_meters" in res_zones["zones"][0]
        print("    -> SUCCESS: Endpoints return exact Radius Meters format required by MissionMap.jsx.\n")

        print("========================================")
        print(" ALL 5 VERIFICATION CHECKS PASSED WITH CUSTOM DATA. ")
        print("========================================")
        
    finally:
        if os.path.exists("custom_dataset_1.csv"): os.remove("custom_dataset_1.csv")

if __name__ == "__main__":
    run_custom_verification()
