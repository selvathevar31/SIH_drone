import os
import sys
import sqlite3
import math
from datetime import datetime

# Adjust path to import stats logic
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.services.stats import calculate_mission_stats

class DBReading:
    def __init__(self, lat, lon, timestamp_str, speed, altitude):
        self.latitude = lat
        self.longitude = lon
        try:
            # typical format "YYYY-MM-DD HH:MM:SS" or similar
            self.timestamp = datetime.fromisoformat(timestamp_str) if 'T' in timestamp_str else datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S.%f')
        except:
            try:
                self.timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
            except:
                self.timestamp = datetime.utcnow()
                
        self.speed = speed
        self.altitude = altitude

def run_report():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'qudracopter.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT latitude, longitude, timestamp, speed, altitude 
        FROM readings 
        WHERE mission_id = 'QDR-DEMO-CSV-3399'
    """)
    rows = cursor.fetchall()
    conn.close()
    
    readings = []
    for r in rows:
        readings.append(DBReading(r[0], r[1], r[2], r[3], r[4]))
        
    stats = calculate_mission_stats(readings)
    print("----- REPORT FOR QDR-DEMO-CSV-3399 -----")
    print(f"Total Distance (km): {stats['total_distance_km']}")
    print(f"Duration (s): {stats['duration_seconds']}")
    print(f"Average Ground Speed (m/s): {stats['average_ground_speed_mps']}")
    print(f"Average Telemetry Speed (m/s): {stats['average_telemetry_speed_mps']}")
    print(f"Max Speed (m/s): {stats['max_speed']}")
    print(f"Max Altitude (m): {stats['max_altitude']}")
    print(f"Total Readings: {stats['total_readings']}")
    
if __name__ == "__main__":
    run_report()
