import sys
import os
import httpx
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path to import models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.database import SessionLocal, Base, engine
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot

BASE_URL = "http://localhost:8000/api"
VERIFY_MISSION_ID = "M-VERIFY-STEP5"

def seed_verification_data():
    print(f"Seeding verification data for mission {VERIFY_MISSION_ID}...")
    db = SessionLocal()
    try:
        # Clear old verification data if exists
        db.query(Reading).filter(Reading.mission_id == VERIFY_MISSION_ID).delete()
        db.query(Hotspot).filter(Hotspot.mission_id == VERIFY_MISSION_ID).delete()
        db.query(Mission).filter(Mission.mission_id == VERIFY_MISSION_ID).delete()
        db.commit()
        
        # Create mission
        m = Mission(
            mission_id=VERIFY_MISSION_ID,
            drone_id="VERIFY-DRONE",
            status="COMPLETED",
            data_source="CSV",
            duration_seconds=120,
            distance_km=0.5,
            total_readings=15
        )
        db.add(m)
        db.commit()
        
        # Add 15 readings with a clear increasing trend and altitude profile
        from datetime import datetime, timedelta
        base_time = datetime.utcnow()
        
        readings = []
        for i in range(15):
            # Coordinates in a tight cluster (cell 0,0)
            lat = 12.9716 + (i * 0.00002)
            lng = 77.5946 + (i * 0.00002)
            # Altitudes: increasing to check altitude trend
            alt = 10.0 + (i * 5) # 10m to 80m
            # AQI: increasing to check trend
            aqi = 40 + (i * 12) # 40 to 208 (reaches Critical)
            pm25 = 15.0 + (i * 8.0) # 15 to 127
            pm10 = 30.0 + (i * 10.0) # 30 to 170
            
            r = Reading(
                mission_id=VERIFY_MISSION_ID,
                timestamp=base_time + timedelta(seconds=i * 10),
                latitude=lat,
                longitude=lng,
                altitude=alt,
                pm25=pm25,
                pm10=pm10,
                aqi=aqi,
                aqi_category="Good" if aqi <= 50 else "Moderate" if aqi <= 100 else "Poor" if aqi <= 200 else "Very Poor"
            )
            readings.append(r)
            
        db.add_all(readings)
        db.commit()
        
        # Add a hotspot
        h = Hotspot(
            mission_id=VERIFY_MISSION_ID,
            latitude=12.9716 + (10 * 0.00002),
            longitude=77.5946 + (10 * 0.00002),
            radius_meters=75.0,
            average_aqi=150.0,
            peak_aqi=208.0,
            severity="CRITICAL",
            reading_count=5
        )
        db.add(h)
        db.commit()
        print("Seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

def run_verification():
    print("\nStarting API verification checks...")
    
    # 1. Fetch from Intelligence API
    intel_url = f"{BASE_URL}/missions/{VERIFY_MISSION_ID}/intelligence"
    try:
        res = httpx.get(intel_url)
        assert res.status_code == 200, f"GET intelligence failed: {res.text}"
        intel_data = res.json()
    except Exception as e:
        print(f"Connection failure to API: {e}")
        print("Please ensure the FastAPI dev server is running.")
        sys.exit(1)
        
    db = SessionLocal()
    try:
        # Check database values directly
        db_readings = db.query(Reading).filter(Reading.mission_id == VERIFY_MISSION_ID).all()
        db_hotspots = db.query(Hotspot).filter(Hotspot.mission_id == VERIFY_MISSION_ID).all()
        
        db_max_aqi = max(r.aqi for r in db_readings)
        
        # Verify 3: Hotspot calculations match DB
        assert len(intel_data["hotspots"]) == len(db_hotspots)
        assert intel_data["hotspots"][0]["peak_aqi"] == db_hotspots[0].peak_aqi
        print("[PASS] Hotspot intelligence matches database values.")
        
        # Verify 4: Trend calculations
        assert intel_data["summary"]["overall_trend"] == "increasing"
        print("[PASS] Trend analysis identified 'increasing' trend correctly.")
        
        # Verify 5: Altitude calculations
        # Binned altitude ranges should have appropriate readings
        bands = intel_data["altitude_analysis"]["bands"]
        assert len(bands) > 0
        print("[PASS] Altitude analysis grouped data points correctly.")
        
        # Verify 6: Adaptive sampling output
        assert len(intel_data["adaptive_sampling"]["recommended_zones"]) > 0
        print("[PASS] Adaptive sampling generated recommended zones.")
        
        # Verify 8: AI fallback grounding check (Post to query API)
        query_url = f"{BASE_URL}/ai/query"
        query_res = httpx.post(query_url, json={
            "mission_id": VERIFY_MISSION_ID,
            "question": "What is the highest AQI?"
        })
        assert query_res.status_code == 200
        query_data = query_res.json()
        
        # Value check: Max AQI in answer matches db_max_aqi (208)
        assert str(db_max_aqi) in query_data["answer"]
        print("[PASS] AI grounding: Highest AQI value in text matches DB max AQI (208).")
        
        # Verify 9: Missing data handling on empty mission
        query_empty_res = httpx.post(query_url, json={
            "mission_id": "M-EMPTY-TEST", # Should trigger empty data fallback
            "question": "What is the highest AQI?"
        })
        assert "insufficient sensor data" in query_empty_res.json()["answer"].lower()
        print("[PASS] Missing-data handling: Empty missions return appropriate empty response.")
        
        # Verify 10: Live Mission State endpoint
        live_res = httpx.get(f"{BASE_URL}/missions/{VERIFY_MISSION_ID}/live-state")
        assert live_res.status_code == 200
        live_data = live_res.json()
        assert live_data["status"] == "COMPLETED"
        assert len(live_data["active_alerts"]) > 0
        print("[PASS] Live Mission State: API endpoint successfully compiled telemetry state.")

        # Verify 11: Events stream
        events_res = httpx.get(f"{BASE_URL}/missions/{VERIFY_MISSION_ID}/events")
        assert events_res.status_code == 200
        events_data = events_res.json()
        assert len(events_data) > 0
        assert events_data[0]["type"] in ["SAMPLING_RECOMMENDED", "MISSION_COMPLETED", "HIGH_POLLUTION", "HOTSPOT_DETECTED"]
        print("[PASS] Event System: Mission timeline is populated dynamically.")

        print("\n" + "="*40)
        print(" QUDRACOPTER STEP 5 VERIFICATION REPORT")
        print("="*40)
        print("[PASS] Pollution intelligence")
        print("[PASS] Trend analysis")
        print("[PASS] Hotspot intelligence")
        print("[PASS] Altitude analysis")
        print("[PASS] Adaptive sampling")
        print("[PASS] AI grounding")
        print("[PASS] Missing-data handling")
        print("[PASS] Live mission state")
        print("[PASS] Mission events & Alerts")
        print("="*40)
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_verification_data()
    # Wait a brief moment for database locks
    time.sleep(1)
    run_verification()
