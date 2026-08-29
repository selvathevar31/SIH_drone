import os
import sys
import time
import argparse
import random
import uuid
import httpx
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000/api"

def run_simulator(mission_id: str, drone_id: str):
    print(f"Starting LIVE Simulator for Mission: {mission_id}")
    
    # Check if mission exists or create it
    try:
        response = httpx.get(f"{API_URL}/missions/{mission_id}")
        if response.status_code == 404:
            print(f"Creating mission {mission_id}...")
            httpx.post(f"{API_URL}/missions/", json={
                "mission_id": mission_id,
                "drone_id": drone_id,
                "data_source": "ESP32",
                "status": "IN_FLIGHT"
            })
    except Exception as e:
        print(f"Failed to connect to backend: {e}")
        return

    # Simulation State
    lat = 19.0215
    lon = 73.1000
    alt = 50.0
    speed = 4.0
    heading = 120.0
    battery = 100
    
    # Hotspot center
    hotspot_lat = 19.0235
    hotspot_lon = 73.1025
    
    print("Beginning telemetry stream (Press Ctrl+C to stop)...")
    
    try:
        while True:
            # Move drone in a smooth continuous route towards and past hotspot
            heading += random.uniform(-5.0, 5.0)
            heading = heading % 360
            
            # Simple conversion from speed & heading to lat/lon degrees (very rough approximation)
            lat_change = (speed * 0.00001) * (1 - abs(heading - 180)/180)
            lon_change = (speed * 0.00001) * (1 - abs(heading - 90)/90)
            
            # Overriding to force a specific trajectory towards hotspot then away
            lat += 0.00005
            lon += 0.00006
            
            alt += random.uniform(-0.5, 0.5)
            speed += random.uniform(-0.2, 0.2)
            speed = max(0.0, speed)
            
            # Decrease battery gradually
            if random.random() < 0.05 and battery > 0:
                battery -= 1

            # Distance to hotspot
            dist_sq = (lat - hotspot_lat)**2 + (lon - hotspot_lon)**2
            
            # Base pollution
            pm25 = 20.0 + random.uniform(-2, 2)
            pm10 = 40.0 + random.uniform(-4, 4)
            
            # Hotspot pollution (peaks exactly at center)
            if dist_sq < 0.00001:
                intensity = 1.0 - (dist_sq / 0.00001)
                pm25 += intensity * 150.0 + random.uniform(-5, 5)
                pm10 += intensity * 200.0 + random.uniform(-10, 10)
                
            reading = {
                "mission_id": mission_id,
                "data_source": "ESP32",
                "timestamp": datetime.utcnow().isoformat(),
                "latitude": lat,
                "longitude": lon,
                "altitude": alt,
                "pm25": pm25,
                "pm10": pm10,
                "temperature": 29.0 + random.uniform(-0.1, 0.1),
                "humidity": 65.0 + random.uniform(-0.5, 0.5),
                "speed": speed,
                "heading": heading,
                "battery": battery,
                "satellites": 14,
                "gps_status": "LOCKED",
                "signal_strength": -55.0 + random.uniform(-5, 5)
            }
            
            resp = httpx.post(f"{API_URL}/readings/", json=reading)
            
            if resp.status_code == 201:
                aqi = resp.json().get('aqi', 'N/A')
                print(f"Sent reading: GPS({lat:.4f}, {lon:.4f}) | PM2.5: {pm25:.1f} | AQI: {aqi} | Bat: {battery}%")
            else:
                print(f"Failed to send reading: {resp.text}")
                
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nSimulator stopped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QUDRACOPTER Live Simulator")
    parser.add_argument("--mission", type=str, default="QDR-LIVE-001", help="Mission ID")
    parser.add_argument("--drone", type=str, default="QDRONE-ESP32", help="Drone ID")
    args = parser.parse_args()
    
    run_simulator(args.mission, args.drone)
