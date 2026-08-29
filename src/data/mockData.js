export const mission = {
  id: "QDR-2026-0826",
  droneId: "QDRONE-01",
  status: "IN FLIGHT",
  duration: "18:42",
  distance: "2.4 km",
  dataPoints: "1,842",
  startLocation: "19.0215° N, 73.1000° E",
  currentLocation: "19.0221° N, 73.1016° E"
};

export const environment = {
  aqi: 126,
  pm25: 52,
  pm10: 79,
  temperature: 29.6,
  humidity: 68
};

export const telemetry = {
  altitude: "52 m",
  speed: "4.8 m/s",
  heading: "142°",
  gps: "LOCKED",
  satellites: 14,
  battery: 78,
  signal: "STRONG"
};

export const flightPath = [
  [19.0215, 73.1000],
  [19.0216, 73.1002],
  [19.0218, 73.1004],
  [19.0220, 73.1007],
  [19.0222, 73.1010],
  [19.0223, 73.1013],
  [19.0221, 73.1016],
  [19.0219, 73.1018]
];

// Conceptual pollution zones for map rendering (lat, lng, radius in meters, color)
export const pollutionZones = [
  { id: 1, center: [19.0216, 73.1003], radius: 40, aqi: 45, color: '#22C55E' }, // Green
  { id: 2, center: [19.0219, 73.1007], radius: 60, aqi: 85, color: '#EAB308' }, // Yellow
  { id: 3, center: [19.0222, 73.1010], radius: 80, aqi: 130, color: '#F97316' }, // Orange
  { id: 4, center: [19.0221, 73.1014], radius: 50, aqi: 176, color: '#EF4444' }  // Red (Hotspot)
];

export const hotspot = {
  id: "HOTSPOT #01",
  aqi: 176,
  pm25: 91,
  pm10: 128,
  lat: "19.0220° N",
  lng: "73.1013° E",
  status: "HIGH POLLUTION"
};

export const trendData = [
  { time: "10:00", aqi: 42, pm25: 12, pm10: 25 },
  { time: "10:02", aqi: 45, pm25: 14, pm10: 28 },
  { time: "10:04", aqi: 48, pm25: 15, pm10: 30 },
  { time: "10:06", aqi: 65, pm25: 22, pm10: 45 },
  { time: "10:08", aqi: 85, pm25: 35, pm10: 55 },
  { time: "10:10", aqi: 110, pm25: 48, pm10: 72 },
  { time: "10:12", aqi: 130, pm25: 60, pm10: 85 },
  { time: "10:14", aqi: 155, pm25: 75, pm10: 105, isHotspot: true },
  { time: "10:16", aqi: 176, pm25: 91, pm10: 128 },
  { time: "10:18", aqi: 126, pm25: 52, pm10: 79 }
];

export const recentEvents = [
  { id: 1, time: "10:18:42", message: "HOTSPOT DETECTED - AQI crossed 150", type: "critical" },
  { id: 2, time: "10:17:31", message: "PM2.5 threshold exceeded", type: "warning" },
  { id: 3, time: "10:15:08", message: "Drone entered Zone B", type: "info" },
  { id: 4, time: "10:11:42", message: "GPS lock confirmed", type: "success" },
  { id: 5, time: "10:00:00", message: "Mission started", type: "info" }
];
