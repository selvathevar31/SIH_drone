import pytest
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.stats import calculate_mission_stats, haversine

class MockReading:
    def __init__(self, lat, lon, timestamp=None, speed=None, altitude=None):
        self.latitude = lat
        self.longitude = lon
        self.timestamp = timestamp or datetime.utcnow()
        self.speed = speed
        self.altitude = altitude

def test_1_haversine_two_points():
    # San Francisco to Los Angeles roughly
    d = haversine(37.7749, -122.4194, 34.0522, -118.2437)
    # Approx 559 km (559000 m)
    assert 550000 < d < 570000

def test_2_three_points_sum():
    p1 = MockReading(0, 0)
    p2 = MockReading(1, 0) # 1 degree lat is ~111km
    p3 = MockReading(2, 0)
    
    stats = calculate_mission_stats([p1, p2, p3])
    # 2 degrees is ~222km
    assert 220 < stats["total_distance_km"] < 224

def test_3_duplicate_coordinates_zero_distance():
    p1 = MockReading(10, 10)
    p2 = MockReading(10, 10)
    stats = calculate_mission_stats([p1, p2])
    assert stats["total_distance_km"] == 0

def test_4_invalid_latitude():
    p1 = MockReading(0, 0)
    p2 = MockReading(100, 0) # invalid lat
    p3 = MockReading(1, 0)
    stats = calculate_mission_stats([p1, p2, p3])
    # Distance should be from p1 to p3 directly, skipping p2
    assert 110 < stats["total_distance_km"] < 112

def test_5_invalid_longitude():
    p1 = MockReading(0, 0)
    p2 = MockReading(0, 190) # invalid lon
    p3 = MockReading(1, 0)
    stats = calculate_mission_stats([p1, p2, p3])
    assert 110 < stats["total_distance_km"] < 112

def test_6_readings_ordered_by_timestamp():
    now = datetime.utcnow()
    p1 = MockReading(0, 0, timestamp=now)
    p3 = MockReading(2, 0, timestamp=now + timedelta(seconds=2))
    p2 = MockReading(1, 0, timestamp=now + timedelta(seconds=1))
    
    # distance is 222km because ordered
    stats = calculate_mission_stats([p1, p3, p2])
    assert 220 < stats["total_distance_km"] < 224

def test_7_average_speed_ignores_invalid():
    p1 = MockReading(0, 0, speed=10)
    p2 = MockReading(1, 0, speed=-5)
    p3 = MockReading(2, 0, speed=None)
    p4 = MockReading(3, 0, speed=20)
    stats = calculate_mission_stats([p1, p2, p3, p4])
    assert stats["average_telemetry_speed_mps"] == 15.0

def test_8_max_speed():
    p1 = MockReading(0, 0, speed=10)
    p2 = MockReading(1, 0, speed=-5)
    p3 = MockReading(2, 0, speed=25)
    stats = calculate_mission_stats([p1, p2, p3])
    assert stats["max_speed"] == 25.0

def test_9_max_altitude():
    p1 = MockReading(0, 0, altitude=100)
    p2 = MockReading(1, 0, altitude=None)
    p3 = MockReading(2, 0, altitude=150)
    stats = calculate_mission_stats([p1, p2, p3])
    assert stats["max_altitude"] == 150.0

def test_10_duration():
    now = datetime.utcnow()
    p1 = MockReading(0, 0, timestamp=now)
    p2 = MockReading(1, 0, timestamp=now + timedelta(seconds=50))
    stats = calculate_mission_stats([p1, p2])
    assert stats["duration_seconds"] == 50

def test_11_demo_mission_distance():
    # Simulate a 1500 reading demo mission
    now = datetime.utcnow()
    readings = []
    # moving 0.0001 degrees each sec
    for i in range(1500):
        readings.append(MockReading(0, i * 0.0001, timestamp=now + timedelta(seconds=i)))
    
    stats = calculate_mission_stats(readings)
    assert stats["total_distance_km"] > 0
    assert stats["total_readings"] == 1500
