import os
import sys
import random
import uuid
from datetime import datetime, timedelta

# Add parent dir to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine
from app.models.mission import Mission
from app.models.reading import Reading
from app.services.aqi import calculate_aqi
from app.services.hotspot_detector import detect_hotspots_for_readings
from app.models.hotspot import Hotspot

def seed_demo_data():
    db = SessionLocal()
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    mission_id = f"QDR-DEMO-{uuid.uuid4().hex[:4].upper()}"
    start_time = datetime.utcnow() - timedelta(minutes=45)
    
    # Start coordinates (approx Mumbai)
    start_lat = 19.0215
    start_lon = 73.1000
    
    # Hotspot center
    hotspot_lat = 19.0230
    hotspot_lon = 73.1020
    
    num_readings = 1000
    
    # Create Mission
    mission = Mission(
        mission_id=mission_id,
        drone_id="QDRONE-DEMO",
        status="COMPLETED",
        data_source="DEMO",
        start_time=start_time,
        end_time=start_time + timedelta(seconds=num_readings*2),
        duration_seconds=num_readings * 2,
        distance_km=3.2,
        total_readings=num_readings,
        start_latitude=start_lat,
        start_longitude=start_lon,
    )
    db.add(mission)
    db.commit()
    
    readings = []
    
    lat = start_lat
    lon = start_lon
    
    for i in range(num_readings):
        # Move drone
        lat += random.uniform(-0.0001, 0.0002)
        lon += random.uniform(-0.0001, 0.0002)
        
        # Calculate distance to hotspot
        dist_sq = (lat - hotspot_lat)**2 + (lon - hotspot_lon)**2
        
        # Base pollution
        pm25 = random.uniform(20.0, 45.0)
        pm10 = random.uniform(40.0, 80.0)
        
        # Increase pollution if near hotspot
        if dist_sq < 0.00001:
            pm25 += random.uniform(50.0, 150.0)
            pm10 += random.uniform(80.0, 200.0)
        
        timestamp = start_time + timedelta(seconds=i*2)
        
        aqi_data = calculate_aqi(pm25, pm10)
        
        reading = Reading(
            mission_id=mission_id,
            data_source="DEMO",
            timestamp=timestamp,
            latitude=lat,
            longitude=lon,
            altitude=50.0 + random.uniform(-2, 2),
            pm25=pm25,
            pm10=pm10,
            temperature=28.0 + random.uniform(-1, 1),
            humidity=65.0 + random.uniform(-2, 2),
            aqi=aqi_data["aqi"],
            aqi_category=aqi_data["category"]
        )
        readings.append(reading)
        
    mission.current_latitude = lat
    mission.current_longitude = lon
    
    db.bulk_save_objects(readings)
    db.commit()
    
    print(f"Generated mission {mission_id} with {num_readings} readings.")
    
    # Trigger hotspot detection
    readings_dict = [
        {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "aqi": r.aqi,
            "pm25": r.pm25,
            "pm10": r.pm10
        } for r in readings
    ]
    detected = detect_hotspots_for_readings(readings_dict)
    
    for h in detected:
        hotspot = Hotspot(
            mission_id=mission_id,
            latitude=h["latitude"],
            longitude=h["longitude"],
            radius_meters=h["radius_meters"],
            average_aqi=h["average_aqi"],
            peak_aqi=h["peak_aqi"],
            average_pm25=h["average_pm25"],
            peak_pm25=h["peak_pm25"],
            average_pm10=h["average_pm10"],
            peak_pm10=h["peak_pm10"],
            severity=h["severity"],
            reading_count=h["reading_count"]
        )
        db.add(hotspot)
        
    db.commit()
    print(f"Detected and saved {len(detected)} hotspots.")
    
    db.close()

if __name__ == "__main__":
    seed_demo_data()
