import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def get_json(url):
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"detail": str(e)}

def run_validation():
    print("========================================")
    print(" STEP 7K: REAL DATA VALIDATION (ALANDI) ")
    print("========================================\n")
    
    # 1. Get Readings info
    status, readings_res = get_json(f"{BASE_URL}/missions/M-ALANDI-1/readings?limit=1")
    total_readings = readings_res.get("total", 0) if status == 200 else 0
    
    # 2. Get Zones
    status, zones_res = get_json(f"{BASE_URL}/missions/M-ALANDI-1/zones")
    zones = zones_res.get("zones", []) if status == 200 else []
    
    # 3. Get Persistent Hotspots
    status, ph_res = get_json(f"{BASE_URL}/hotspots/persistent")
    hotspots = ph_res.get("persistent_hotspots", []) if status == 200 else []
    
    # Statistics
    highest_aqi = 0
    highest_priority_zone = None
    if zones:
        highest_aqi = max([z["aqi"]["maximum"] for z in zones])
        # zones are sorted by priority score, so first one is highest
        highest_priority_zone = zones[0]
        
    most_persistent = None
    if hotspots:
        most_persistent = hotspots[0]
        
    trend_distribution = {"WORSENING": 0, "STABLE": 0, "IMPROVING": 0, "INSUFFICIENT_DATA": 0}
    for h in hotspots:
        if h.get("trend_analysis") and h["trend_analysis"].get("trend"):
            trend_distribution[h["trend_analysis"]["trend"]] += 1
            
    # Print Report
    print(f"Total readings: {total_readings}")
    print(f"Total zones (M-ALANDI-1): {len(zones)}")
    print(f"Persistent hotspots (Global): {len(hotspots)}")
    print(f"Highest AQI: {highest_aqi}")
    
    print("\nHighest priority zone (M-ALANDI-1):")
    if highest_priority_zone:
        p = highest_priority_zone.get("priority", {})
        a = highest_priority_zone.get("altitude", {})
        print(f"  ID: {highest_priority_zone['zone_id']}")
        print(f"  Priority: {p.get('classification')} (Score: {p.get('score')})")
        print(f"  Recommendation: {p.get('recommendation')}")
        if a:
            print(f"  Altitude range: {a.get('min_meters')}m - {a.get('max_meters')}m (Avg: {a.get('average_meters'):.1f}m)")
    else:
        print("  None found")
        
    print("\nMost persistent hotspot (Global):")
    if most_persistent:
        p = most_persistent.get("priority", {})
        t = most_persistent.get("trend_analysis", {})
        a = most_persistent.get("altitude", {})
        print(f"  ID: {most_persistent['hotspot_id']}")
        print(f"  Surveys Detected: {most_persistent['surveys_detected']}")
        print(f"  Trend: {t.get('trend')} ({t.get('percentage') or 0}%)")
        print(f"  Priority: {p.get('classification')} (Score: {p.get('score')})")
        print(f"  Recommendation: {p.get('recommendation')}")
        if a and a.get('min_meters') is not None:
            print(f"  Altitude range: {a.get('min_meters')}m - {a.get('max_meters')}m (Avg: {a.get('average_meters'):.1f}m)")
        else:
            print(f"  Altitude range: Not available")
    else:
        print("  None found")
        
    print(f"\nTrend distribution (Persistent Hotspots):")
    for k, v in trend_distribution.items():
        print(f"  {k}: {v}")
        
    print("\n========================================")
    print(" VALIDATION COMPLETE ")
    print("========================================\n")

if __name__ == "__main__":
    run_validation()
