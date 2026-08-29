import os
import argparse
import random
from datetime import datetime, timedelta

def generate_csv(rows=1500):
    # Ensure directory exists
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'demo')
    os.makedirs(output_dir, exist_ok=True)
    
    file_path = os.path.join(output_dir, 'qudracopter_demo_mission.csv')
    
    # State setup
    start_time = datetime.utcnow() - timedelta(minutes=45)
    
    # GPS starting point (approx Mumbai)
    lat = 19.021500
    lon = 73.100000
    alt = 42.0
    
    # Telemetry
    speed = 4.2
    heading = 90.0
    battery = 100
    satellites = 14
    signal_strength = -55.0
    
    # Environmental
    temp = 29.1
    humidity = 68.0
    
    # Hotspot center
    hotspot_lat = 19.024500
    hotspot_lon = 73.103500
    
    with open(file_path, 'w') as f:
        # Header (raw sensor data only, NO aqi)
        f.write("timestamp,latitude,longitude,altitude,pm25,pm10,temperature,humidity,speed,heading,battery,satellites,gps_status,signal_strength\n")
        
        for i in range(rows):
            timestamp = start_time + timedelta(seconds=i*2)
            
            # Smooth GPS movement
            # Change heading slowly
            heading += random.uniform(-2.0, 2.0)
            heading = heading % 360
            
            # Very rough conversion of speed & heading to lat/lon degrees
            lat += (speed * 0.000005) * (1 - abs(heading - 180)/180)
            lon += (speed * 0.000006) * (1 - abs(heading - 90)/90)
            
            # Override for demo path to guarantee it hits the hotspot and leaves
            if i < rows * 0.4:
                lat += 0.00001
                lon += 0.000012
            elif i < rows * 0.6:
                lat += 0.000002
                lon += 0.000005
            else:
                lat -= 0.000008
                lon -= 0.000005
                
            # Altitude variation
            alt += random.uniform(-0.1, 0.1)
            alt = max(10.0, min(alt, 100.0))
            
            # Speed variation
            speed += random.uniform(-0.1, 0.1)
            speed = max(0.0, speed)
            
            # Battery decrease
            if i % (rows // 50) == 0 and battery > 0:
                battery -= 1
                
            # GPS status and satellites
            gps_status = "LOCKED"
            if i < 5:
                gps_status = "SEARCHING"
                satellites = random.randint(3, 6)
            else:
                if random.random() < 0.1:
                    satellites += random.choice([-1, 1])
                satellites = max(8, min(satellites, 18))
                
            # Signal strength
            signal_strength += random.uniform(-0.5, 0.5)
            signal_strength = max(-100.0, min(-40.0, signal_strength))
            
            # Temperature / Humidity
            temp += random.uniform(-0.02, 0.02)
            humidity += random.uniform(-0.05, 0.05)
            
            # Pollution profile
            dist_sq = (lat - hotspot_lat)**2 + (lon - hotspot_lon)**2
            
            # Base normal pollution
            pm25 = 20.0 + random.uniform(0, 15)
            pm10 = 35.0 + random.uniform(0, 25)
            
            # Hotspot
            if dist_sq < 0.000015:
                intensity = 1.0 - (dist_sq / 0.000015)
                # Max intensity at center adds heavily to base
                pm25 += intensity * 90.0 + random.uniform(-2, 2)
                pm10 += intensity * 120.0 + random.uniform(-5, 5)
            elif dist_sq < 0.00004:
                # Moderate zone (approaching)
                intensity = 1.0 - (dist_sq / 0.00004)
                pm25 += intensity * 40.0 + random.uniform(-2, 2)
                pm10 += intensity * 60.0 + random.uniform(-5, 5)
                
            pm25 = max(0.0, pm25)
            pm10 = max(0.0, pm10)
            
            # Write row
            row = f"{timestamp.isoformat()},{lat:.6f},{lon:.6f},{alt:.1f},{pm25:.1f},{pm10:.1f},{temp:.1f},{humidity:.1f},{speed:.1f},{heading:.0f},{battery},{satellites},{gps_status},{signal_strength:.0f}\n"
            f.write(row)
            
    print(f"Generated {rows} readings at {file_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate QUDRACOPTER Demo CSV")
    parser.add_argument("--rows", type=int, default=1500, help="Number of rows to generate")
    args = parser.parse_args()
    
    generate_csv(args.rows)
