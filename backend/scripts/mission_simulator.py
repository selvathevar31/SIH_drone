#!/usr/bin/env python3
"""
FLUXX Drone Mission Simulator
Simulates a drone flight performing an environmental survey with:
- Takeoff, lawnmower survey grid, hotspot gradient approach, return path, landing.
- Telemetry simulation (battery, satellites, heading, speed, altitude).
- Ingestion through standard HTTP API endpoints.
- Periodic hotspot triggering.
"""

import sys
import os
import time
import math
import random
import argparse
from datetime import datetime, timedelta
import httpx

# Base URL for API calls
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Coordinate math helper (Haversine distance in meters)
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_lawnmower_points(start_lat, start_lon, steps_count):
    """
    Generates a deterministic grid (lawnmower pattern) of coordinates.
    Spans a grid size of approximately 300m x 300m.
    """
    points = []
    # Grid size in degrees (~300m)
    lat_range = 0.003
    lon_range = 0.003
    
    # We divide the steps among legs of the lawnmower.
    # Let's say we have 4 vertical legs.
    legs = 4
    steps_per_leg = steps_count // legs
    
    for leg in range(legs):
        # Determine longitude for this vertical leg
        leg_lon = start_lon + (leg * (lon_range / (legs - 1)))
        
        # Vertical movement goes up on even legs, down on odd legs
        is_even = (leg % 2 == 0)
        
        for step in range(steps_per_leg):
            t = step / (steps_per_leg - 1) if steps_per_leg > 1 else 0.0
            if is_even:
                leg_lat = start_lat + (t * lat_range)
            else:
                leg_lat = start_lat + ((1.0 - t) * lat_range)
            points.append((leg_lat, leg_lon))
            
    # Fill remaining steps if steps_count is not perfectly divisible
    while len(points) < steps_count:
        points.append(points[-1])
        
    return points

def main():
    parser = argparse.ArgumentParser(description="FLUXX End-to-End Drone Mission Simulator")
    parser.add_argument("--speed", type=float, default=2.0, help="Simulation speed multiplier (delay = 1/speed seconds per reading)")
    parser.add_argument("--readings", type=int, default=150, help="Total number of telemetry readings to generate")
    parser.add_argument("--mission-name", type=str, default=None, help="Name/ID of the mission")
    parser.add_argument("--seed", type=int, default=42, help="Seed for deterministic random generations")
    parser.add_argument("--start-lat", type=float, default=12.971598, help="Starting latitude (Bangalore default)")
    parser.add_argument("--start-lon", type=float, default=77.594562, help="Starting longitude (Bangalore default)")
    parser.add_argument("--inject-errors", action="store_true", help="Inject a small number of malformed readings for validation checks")
    
    args = parser.parse_args()
    
    # Initialize random seed for determinism
    random.seed(args.seed)
    
    # Verify backend is online
    try:
        health_res = httpx.get(f"{API_BASE_URL}/api/health")
        if health_res.status_code != 200 or health_res.json().get("backend") != "ONLINE":
            print(f"[ERROR] Backend at {API_BASE_URL} is not responding cleanly. Health state: {health_res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to connect to backend at {API_BASE_URL}: {e}")
        sys.exit(1)
        
    # Generate Mission ID
    mission_id = args.mission_name
    if not mission_id:
        mission_id = f"SIM-{int(time.time())}"
    elif not mission_id.startswith("SIM-"):
        mission_id = f"SIM-{mission_id}"
        
    # Set simulation delay
    # Normal: 1 reading every 2 seconds (0.5 readings/sec)
    # Demo: configurable speed (e.g. speed=5 -> 200ms delay)
    delay_sec = max(0.01, 1.0 / args.speed) if args.speed > 0 else 0.5
    
    print(f"[FLUXX] Starting simulation for Mission '{mission_id}' using speed multiplier {args.speed:.1f} (delay: {delay_sec*1000:.0f}ms)")
    
    # Create Mission in backend
    mission_payload = {
        "mission_id": mission_id,
        "drone_id": "SIM-DRONE-88",
        "status": "PLANNED",
        "data_source": "DEMO"
    }
    
    create_res = httpx.post(f"{API_BASE_URL}/api/missions/", json=mission_payload)
    if create_res.status_code not in (200, 201):
        print(f"[ERROR] Failed to register mission: {create_res.text}")
        sys.exit(1)
        
    print(f"[FLUXX] Registered mission in database.")
    
    # Set up Hotspot parameters
    # The hotspot is located at the center-ish of our lawnmower grid
    hotspot_center_lat = args.start_lat + 0.0015
    hotspot_center_lon = args.start_lon + 0.0015
    hotspot_radius = 100.0  # 100 meters
    
    # Setup step divisions
    total_steps = max(40, args.readings)
    takeoff_steps = 10
    landing_steps = 10
    return_steps = 15
    survey_steps = total_steps - takeoff_steps - landing_steps - return_steps
    
    # Generate spatial coordinates
    survey_coords = generate_lawnmower_points(args.start_lat, args.start_lon, survey_steps)
    
    # Initialize parameters
    current_lat = args.start_lat
    current_lon = args.start_lon
    current_alt = 0.0
    battery = 100.0
    start_time = datetime.utcnow()
    
    # Run Simulation Loop
    state = "PLANNED"
    
    # Define transition helper
    def set_mission_status(new_status):
        nonlocal state
        if state != new_status:
            state = new_status
            print(f"[FLUXX] State Transition: {new_status}")
            patch_payload = {"status": new_status}
            httpx.patch(f"{API_BASE_URL}/api/missions/{mission_id}", json=patch_payload)
            
    # Set status to TAKEOFF
    set_mission_status("TAKEOFF")
    
    for i in range(total_steps):
        # Check active state in backend to verify pause/stop commands
        try:
            db_state_res = httpx.get(f"{API_BASE_URL}/api/missions/{mission_id}/live-state")
            if db_state_res.status_code == 200:
                db_status = db_state_res.json().get("status")
                # Wait loop if paused
                while db_status == "PAUSED":
                    print("[FLUXX] Simulation PAUSED by operator. Waiting...")
                    time.sleep(1.0)
                    db_state_res = httpx.get(f"{API_BASE_URL}/api/missions/{mission_id}/live-state")
                    db_status = db_state_res.json().get("status") if db_state_res.status_code == 200 else "PAUSED"
                # Abort if stopped or aborted
                if db_status in ("STOPPED", "ABORTED"):
                    print("[FLUXX] Simulation ABORTED/STOPPED by operator. Terminating.")
                    break
        except Exception as e:
            # Non-blocking connection issue check
            pass

        # 1. Update Position and Altitude based on phase
        prev_lat, prev_lon = current_lat, current_lon
        
        if i < takeoff_steps:
            # TAKEOFF Phase
            current_lat = args.start_lat
            current_lon = args.start_lon
            # Climb altitude to 50m
            current_alt = 5.0 * (i + 1)
            heading = 0.0
            speed = 0.0
            
        elif i < takeoff_steps + survey_steps:
            # SURVEY Phase
            set_mission_status("SURVEYING")
            coord_idx = i - takeoff_steps
            current_lat, current_lon = survey_coords[coord_idx]
            current_alt = 50.0 + random.uniform(-2.0, 2.0)  # Hover variations
            
            # Heading derived from movement
            lat_diff = current_lat - prev_lat
            lon_diff = current_lon - prev_lon
            heading = math.degrees(math.atan2(lon_diff, lat_diff)) % 360.0
            speed = random.uniform(4.0, 7.0)  # normal flight speed
            
        elif i < takeoff_steps + survey_steps + return_steps:
            # RETURN Phase
            set_mission_status("RETURNING")
            # Move linearly back to starting coordinates
            progress = (i - (takeoff_steps + survey_steps)) / return_steps
            current_lat = survey_coords[-1][0] + progress * (args.start_lat - survey_coords[-1][0])
            current_lon = survey_coords[-1][1] + progress * (args.start_lon - survey_coords[-1][1])
            # Lower altitude to 35m for return
            current_alt = 50.0 - progress * (50.0 - 35.0)
            
            lat_diff = current_lat - prev_lat
            lon_diff = current_lon - prev_lon
            heading = math.degrees(math.atan2(lon_diff, lat_diff)) % 360.0
            speed = random.uniform(8.0, 11.0)  # faster return speed
            
        else:
            # LANDING Phase
            set_mission_status("LANDING")
            current_lat = args.start_lat
            current_lon = args.start_lon
            # Decrease altitude to 0
            land_idx = i - (takeoff_steps + survey_steps + return_steps)
            current_alt = 35.0 * (1.0 - (land_idx + 1) / landing_steps)
            heading = 0.0
            speed = 0.0

        # 2. Correlate Environmental Readings with Hotspot Location
        distance_to_hotspot = calculate_distance(current_lat, current_lon, hotspot_center_lat, hotspot_center_lon)
        
        # Base values for normal region
        pm25 = random.uniform(30.0, 50.0)
        pm10 = pm25 * random.uniform(1.3, 1.6)
        pm1 = pm25 * random.uniform(0.3, 0.45)
        
        # If in hotspot radius, scale values up
        if distance_to_hotspot <= hotspot_radius:
            # When surveying, mark state as hotspot detected
            if state == "SURVEYING" and pm25 > 80:
                set_mission_status("HOTSPOT_DETECTED")
                
            scale = 1.0 - (distance_to_hotspot / hotspot_radius)
            # Add up to 140 µg/m³ at the hotspot center
            pm25 += (140.0 * scale)
            pm10 += (210.0 * scale)
            pm1 += (45.0 * scale)
            
        # Add slight altitude correlation: values drop slightly higher up
        altitude_modifier = max(0.6, 1.0 - (current_alt / 250.0))
        pm25 *= altitude_modifier
        pm10 *= altitude_modifier
        pm1 *= altitude_modifier
        
        # Basic temperature and humidity
        temp = 28.5 + random.uniform(-1.0, 1.0) - (current_alt * 0.05)  # cools with alt
        humidity = 62.0 + random.uniform(-2.0, 2.0) + (current_alt * 0.08)
        
        # Battery depletion
        battery = max(0.0, 100.0 - (i * (35.0 / total_steps))) # Linear discharge
        
        # Time progression
        reading_time = start_time + timedelta(seconds=i * 2)
        
        # Satellites
        satellites = random.randint(14, 18)
        gps_status = "3D_FIX" if current_alt > 2.0 else "NO_FIX"
        
        # Create reading payload
        payload = {
            "mission_id": mission_id,
            "data_source": "DEMO",
            "timestamp": reading_time.isoformat() + "Z",
            "latitude": current_lat,
            "longitude": current_lon,
            "altitude": current_alt,
            "pm1": round(pm1, 2),
            "pm25": round(pm25, 2),
            "pm10": round(pm10, 2),
            "temperature": round(temp, 1),
            "humidity": round(humidity, 1),
            "speed": round(speed, 1),
            "heading": round(heading, 1),
            "battery": int(battery),
            "satellites": satellites,
            "gps_status": gps_status,
            "signal_strength": round(random.uniform(-75.0, -45.0), 1)
        }
        
        # 3. Inject errors if flag is set (e.g. 5% of readings)
        if args.inject_errors and i > 0 and i % 25 == 0:
            err_type = i % 3
            if err_type == 0:
                # Malformed coordinates
                payload["latitude"] = 999.0
                print(f"[FLUXX] [INJECT-ERR] Out-of-bounds latitude (999.0)")
            elif err_type == 1:
                # Missing PM2.5
                payload["pm25"] = None
                print(f"[FLUXX] [INJECT-ERR] Missing PM2.5 telemetry")
            else:
                # Malformed timestamp
                payload["timestamp"] = "INVALID_TIMESTAMP"
                print(f"[FLUXX] [INJECT-ERR] Malformed timestamp")
                
        # Send Reading to ingestion endpoint
        try:
            res = httpx.post(f"{API_BASE_URL}/api/readings", json=payload)
            if res.status_code == 201:
                # Successfully ingested
                # Periodically trigger hotspot detection (e.g. every 15 readings)
                if i > 0 and i % 15 == 0:
                    httpx.post(f"{API_BASE_URL}/api/missions/{mission_id}/detect-hotspots")
            else:
                # Validation rejected as expected on injected errors
                if args.inject_errors:
                    print(f"[FLUXX] [VALIDATION-REJECTED] Ingest status: {res.status_code}. Detail: {res.text.strip()}")
                else:
                    print(f"[ERROR] Failed to ingest reading index {i}: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[ERROR] Network error during ingestion: {e}")
            
        # Simulate delay
        time.sleep(delay_sec)
        
    # Trigger final hotspot calculation
    httpx.post(f"{API_BASE_URL}/api/missions/{mission_id}/detect-hotspots")
    
    # Calculate flight stats and mark COMPLETED
    end_time = start_time + timedelta(seconds=total_steps * 2)
    duration = total_steps * 2
    
    # Distance: sum up segments
    # For a simple approximation: lawnmower grid + takeoff/return
    distance_km = 0.85
    
    patch_payload = {
        "status": "COMPLETED",
        "end_time": end_time.isoformat() + "Z",
        "duration_seconds": duration,
        "distance_km": distance_km
    }
    
    set_mission_status("COMPLETED")
    httpx.patch(f"{API_BASE_URL}/api/missions/{mission_id}", json=patch_payload)
    print(f"[FLUXX] Mission completed! Survey data logged.")

if __name__ == "__main__":
    main()
