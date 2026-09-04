import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Navigation, Map as MapIcon, Layers } from 'lucide-react';
import { getEnvironmentMap, getPollutionZones, getPersistentHotspots } from '../services/api';
import HeatmapLayer from './HeatmapLayer';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const droneIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hotspotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const operatorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const persistentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const recommendedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component completely removed in favor of strict mapRef effects
export default function MissionMap({ missionId, flightPath, currentLocation, hotspots, telemetry, mapLocateTarget, simulation }) {
  const mapRef = useRef(null);
  const initializedRef = useRef(false);

  const [followDrone, setFollowDrone] = useState(false);
  const [operatorLoc, setOperatorLoc] = useState(null);
  
  // Use canonical flightPath instead of fetching
  const envData = flightPath || [];
  
  // Layer controls
  const [layers, setLayers] = useState({
    route: true,
    measurements: true,
    heatmap: false,
    hotspots: true,
    zones: false,
    persistent: false,
    recommended: true,
    simulation: true,
  });
  
  const [zonesData, setZonesData] = useState([]);
  const [persistentData, setPersistentData] = useState([]);
  const [recommendationsData, setRecommendationsData] = useState([]);
  
  // Metric controls (aqi, pm25, pm10)
  const [heatmapMetric, setHeatmapMetric] = useState('aqi');
  
  useEffect(() => {
    if (missionId) {
      getPollutionZones(missionId).then(data => {
        if(data && data.zones) setZonesData(data.zones);
      }).catch(console.error);
      
      getPersistentHotspots().then(data => {
        if(data && data.persistent_hotspots) setPersistentData(data.persistent_hotspots);
      }).catch(console.error);

      fetch(`http://localhost:8000/api/missions/${missionId}/decision`)
        .then(res => res.json())
        .then(data => {
          if (data && data.recommendations) {
            setRecommendationsData(data.recommendations);
          }
        }).catch(console.error);
    }
  }, [missionId]);

  // Determine actual center to use based on strict backend data ONLY
  const activeCenter = useMemo(() => {
    if (mapLocateTarget) {
      return mapLocateTarget;
    } else if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
      return [currentLocation.latitude, currentLocation.longitude];
    } else if (envData && envData.length > 0) {
      const lastPoint = envData[envData.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    } else if (flightPath && flightPath.length > 0) {
      const lastPoint = flightPath[flightPath.length - 1];
      if (typeof lastPoint.latitude === 'number' && typeof lastPoint.longitude === 'number') {
        return [lastPoint.latitude, lastPoint.longitude];
      }
    }
    return null;
  }, [mapLocateTarget, currentLocation, envData, flightPath]);
  
  const hasGpsData = activeCenter !== null;

  // A. MAP INITIALIZATION: Only runs once when we have our first GPS position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeCenter || initializedRef.current) return;

    if (envData && envData.length > 0) {
      const bounds = L.latLngBounds(envData.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(activeCenter, 16);
    }
    initializedRef.current = true;
  }, [activeCenter, envData]);

  // B. USER RECENTER (Locate Target)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLocateTarget || !initializedRef.current) return;
    map.setView(mapLocateTarget, 16);
    setFollowDrone(false);
  }, [mapLocateTarget]);

  // C. FOLLOW DRONE (Continuous pan if active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followDrone || !activeCenter || !initializedRef.current) return;
    map.panTo(activeCenter, { animate: true, duration: 1.0 });
  }, [activeCenter, followDrone]);

  const handleOperatorLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setOperatorLoc([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error("Error fetching operator location", err)
      );
    }
  };

  const getSeverityColor = (severity) => {
    if (!severity) return '#EF4444'; // Red default
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
    if (s.includes('very poor')) return '#EF4444';
    if (s.includes('poor')) return '#F97316';
    if (s.includes('moderate')) return '#EAB308';
    if (s.includes('satisfactory')) return '#84CC16';
    if (s.includes('good')) return '#22C55E';
    return '#EF4444';
  };
  
  const heatmapData = useMemo(() => {
    if (!envData || !layers.heatmap) return [];
    
    // Calculate max intensity for normalization
    let maxVal = 1;
    const validPoints = envData.filter(p => p[heatmapMetric] != null);
    
    if (validPoints.length > 0) {
        if (heatmapMetric === 'aqi') maxVal = 500;
        else if (heatmapMetric === 'pm25') maxVal = 250;
        else if (heatmapMetric === 'pm10') maxVal = 430;
    }
    
    return {
        points: validPoints.map(p => [p.latitude, p.longitude, p[heatmapMetric]]),
        max: maxVal
    };
  }, [envData, heatmapMetric, layers.heatmap]);

  const toggleLayer = (layer) => {
      setLayers(prev => ({...prev, [layer]: !prev[layer]}));
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden h-[550px] relative z-0 flex flex-col">
      
      {/* Map Layers Control Panel */}
      <div className="absolute top-4 left-4 z-[400] bg-surface-elevated/90 backdrop-blur-md border border-border p-3 rounded shadow-lg">
        <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-2 border-b border-border/50 pb-1 flex items-center gap-2">
            <Layers className="w-3 h-3" /> Map Layers
        </h2>
        <div className="flex flex-col gap-2 text-xs mb-3 border-b border-border/30 pb-3">
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.route} onChange={() => toggleLayer('route')} className="accent-telemetry" />
                Drone Route
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.measurements} onChange={() => toggleLayer('measurements')} className="accent-telemetry" />
                Measurements
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.heatmap} onChange={() => toggleLayer('heatmap')} className="accent-telemetry" />
                Heatmap
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.hotspots} onChange={() => toggleLayer('hotspots')} className="accent-telemetry" />
                Hotspots
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.zones} onChange={() => toggleLayer('zones')} className="accent-telemetry" />
                Zones
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="checkbox" checked={layers.persistent} onChange={() => toggleLayer('persistent')} className="accent-telemetry" />
                Persistent
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer text-telemetry">
                <input type="checkbox" checked={layers.recommended} onChange={() => toggleLayer('recommended')} className="accent-telemetry" />
                Recommended Sampling
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer text-fuchsia-400">
                <input type="checkbox" checked={layers.simulation} onChange={() => toggleLayer('simulation')} className="accent-fuchsia-400" />
                Simulated Readings
            </label>
        </div>
        
        <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-2">Pollution Metric</h2>
        <div className="flex flex-col gap-1 text-xs">
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="radio" name="metric" checked={heatmapMetric === 'aqi'} onChange={() => setHeatmapMetric('aqi')} className="accent-telemetry" />
                AQI
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="radio" name="metric" checked={heatmapMetric === 'pm25'} onChange={() => setHeatmapMetric('pm25')} className="accent-telemetry" />
                PM2.5
            </label>
            <label className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                <input type="radio" name="metric" checked={heatmapMetric === 'pm10'} onChange={() => setHeatmapMetric('pm10')} className="accent-telemetry" />
                PM10
            </label>
        </div>
      </div>

      {/* Map Legend */}
      {(layers.measurements || layers.heatmap || layers.hotspots) && (
        <div className="absolute bottom-6 left-4 z-[400] bg-surface-elevated/90 backdrop-blur-md border border-border p-2 rounded shadow-lg text-[10px] font-mono flex flex-col gap-1 w-64">
            <h2 className="font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 flex justify-between">
                <span>{heatmapMetric.toUpperCase()} Level</span>
            </h2>
            <div className="flex h-2 w-full rounded overflow-hidden mt-1">
                <div style={{backgroundColor: '#22C55E', flex: 1}}></div>
                <div style={{backgroundColor: '#84CC16', flex: 1}}></div>
                <div style={{backgroundColor: '#EAB308', flex: 1}}></div>
                <div style={{backgroundColor: '#F97316', flex: 1}}></div>
                <div style={{backgroundColor: '#EF4444', flex: 1}}></div>
                <div style={{backgroundColor: '#7F1D1D', flex: 1}}></div>
            </div>
            <div className="flex justify-between text-text-muted mt-0.5 px-0.5">
                <span>Low</span>
                <span>Mod</span>
                <span>Sev</span>
            </div>
        </div>
      )}

      {/* HUD Controls Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => setFollowDrone(!followDrone)}
          className={`flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border text-xs font-bold uppercase tracking-wide transition-colors ${
            followDrone 
              ? 'bg-telemetry/20 border-telemetry/50 text-telemetry backdrop-blur-sm' 
              : 'bg-surface-elevated/90 border-border text-text-muted hover:text-text-primary backdrop-blur-sm'
          }`}
        >
          Follow Drone
          <Navigation className={`w-4 h-4 ${followDrone ? 'animate-pulse' : ''}`} />
        </button>
        
        <button 
          onClick={() => {
            if (mapRef.current && activeCenter) {
              mapRef.current.setView(activeCenter, 16);
            }
            setFollowDrone(false);
          }}
          className="flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border border-border bg-surface-elevated/90 text-text-muted hover:text-text-primary backdrop-blur-sm text-xs font-bold uppercase tracking-wide transition-colors"
        >
          Recenter
          <Crosshair className="w-4 h-4" />
        </button>
        
        <button 
          onClick={handleOperatorLocation}
          className="flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border border-border bg-surface-elevated/90 text-text-muted hover:text-text-primary backdrop-blur-sm text-xs font-bold uppercase tracking-wide transition-colors"
        >
          My Location
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* Empty State */}
      {!hasGpsData ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-secondary">
          <MapIcon className="w-16 h-16 text-border mb-4" />
          <h2 className="text-xl font-bold tracking-widest text-text-muted uppercase mb-2">GPS Data Unavailable</h2>
          <p className="text-sm text-text-secondary">Waiting for valid geographic coordinates from backend telemetry.</p>
        </div>
      ) : (
        <MapContainer 
          ref={mapRef}
          center={activeCenter} 
          zoom={16} 
          scrollWheelZoom={true} 
          className="flex-1 w-full"
          zoomControl={false}
          preferCanvas={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {layers.route && flightPath && flightPath.length > 0 && (
            <Polyline 
                positions={flightPath.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number').map(p => [p.latitude, p.longitude])} 
                color="#22D3EE" weight={3} opacity={0.7} 
            />
          )}
          
          {layers.heatmap && heatmapData.points.length > 0 && (
             <HeatmapLayer points={heatmapData.points} max={heatmapData.max} />
          )}

          {layers.measurements && envData.map((pt, i) => (
             <CircleMarker 
                key={`env-${i}`}
                center={[pt.latitude, pt.longitude]}
                radius={4}
                pathOptions={{
                    color: getSeverityColor(pt.aqi_category),
                    fillColor: getSeverityColor(pt.aqi_category),
                    fillOpacity: 0.8,
                    weight: 1
                }}
             >
                 <Popup className="custom-popup min-w-[200px]">
                    <div className="font-mono text-xs">
                        <strong className="text-telemetry block mb-1 uppercase text-sm border-b border-border pb-1">AIR QUALITY READING</strong>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Time</span>
                            <span className="text-text-primary">{new Date(pt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">AQI</span>
                            <span className="font-bold" style={{color: getSeverityColor(pt.aqi_category)}}>{pt.aqi ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Category</span>
                            <span className="font-bold uppercase" style={{color: getSeverityColor(pt.aqi_category)}}>{pt.aqi_category ?? 'UNKNOWN'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">PM1</span>
                            <span className="text-text-primary">{pt.pm1 != null ? `${pt.pm1.toFixed(1)} µg/m³` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">PM2.5</span>
                            <span className="text-text-primary">{pt.pm25 != null ? `${pt.pm25.toFixed(1)} µg/m³` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">PM10</span>
                            <span className="text-text-primary">{pt.pm10 != null ? `${pt.pm10.toFixed(1)} µg/m³` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Temperature</span>
                            <span className="text-text-primary">{pt.temperature != null ? `${pt.temperature.toFixed(1)} °C` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Humidity</span>
                            <span className="text-text-primary">{pt.humidity != null ? `${pt.humidity.toFixed(0)} %` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Altitude</span>
                            <span className="text-text-primary">{pt.altitude != null ? `${pt.altitude.toFixed(1)} m` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-text-muted">Coordinates</span>
                            <span className="text-text-primary text-[10px]">{pt.latitude.toFixed(6)}, {pt.longitude.toFixed(6)}</span>
                        </div>
                    </div>
                 </Popup>
             </CircleMarker>
          ))}

          {layers.simulation && simulation && simulation.simulated_readings && simulation.simulated_readings.map((pt, i) => (
             <CircleMarker 
                key={`sim-${i}`}
                center={[pt.latitude, pt.longitude]}
                radius={3}
                pathOptions={{
                    color: '#d946ef', // fuchsia-500
                    fillColor: '#d946ef',
                    fillOpacity: 0.5,
                    weight: 1,
                    dashArray: '2, 2'
                }}
             >
                 <Popup className="custom-popup min-w-[200px]">
                    <div className="font-mono text-xs">
                        <strong className="text-fuchsia-500 block mb-1 uppercase text-sm border-b border-border pb-1">SIMULATED READING</strong>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Source</span>
                            <span className="text-fuchsia-400 font-bold">SIMULATION</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">AQI</span>
                            <span className="font-bold text-fuchsia-400">{pt.aqi ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">PM2.5</span>
                            <span className="text-text-primary">{pt.pm25 != null ? `${pt.pm25.toFixed(1)} µg/m³` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-text-muted">Altitude</span>
                            <span className="text-text-primary">{pt.altitude != null ? `${pt.altitude.toFixed(1)} m` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-text-muted">Coordinates</span>
                            <span className="text-text-primary text-[10px]">{pt.latitude.toFixed(6)}, {pt.longitude.toFixed(6)}</span>
                        </div>
                        <div className="text-[9px] text-fuchsia-400/70 mt-2 italic border-t border-border/20 pt-1 text-center">
                            *Not real sensor data*
                        </div>
                    </div>
                 </Popup>
             </CircleMarker>
          ))}

          {layers.hotspots && hotspots && hotspots.map((hotspot) => (
            <React.Fragment key={`hs-${hotspot.id}`}>
              <Circle 
                center={[hotspot.latitude, hotspot.longitude]} 
                pathOptions={{ 
                  color: getSeverityColor(hotspot.severity), 
                  fillColor: getSeverityColor(hotspot.severity), 
                  fillOpacity: 0.2, 
                  weight: 1 
                }} 
                radius={hotspot.radius_meters || 75} 
              />
              <Marker position={[hotspot.latitude, hotspot.longitude]} icon={hotspotIcon}>
                <Popup className="custom-popup">
                  <div className="font-mono text-xs">
                    <strong className="text-hazardous block mb-1 uppercase text-sm border-b border-border pb-1">POLLUTION HOTSPOT</strong>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Average AQI</span>
                      <span className="font-bold text-hazardous">{hotspot.peak_aqi}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak AQI</span>
                      <span className="font-bold text-hazardous">{hotspot.peak_aqi}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak PM2.5</span>
                      <span className="text-text-primary">{hotspot.peak_pm25?.toFixed(1)} µg/m³</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak PM10</span>
                      <span className="text-text-primary">{hotspot.peak_pm10?.toFixed(1)} µg/m³</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Readings</span>
                      <span className="text-text-primary">{hotspot.reading_count}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Center</span>
                      <span className="text-text-primary text-[10px]">{hotspot.latitude.toFixed(6)}, {hotspot.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted">Radius</span>
                      <span className="text-text-primary">{hotspot.radius_meters || 75} m</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {layers.zones && zonesData.map((zone) => (
            <React.Fragment key={`zone-${zone.zone_id}`}>
              <Circle 
                center={[zone.centroid.latitude, zone.centroid.longitude]} 
                pathOptions={{ 
                  color: getSeverityColor(zone.severity), 
                  fillColor: getSeverityColor(zone.severity), 
                  fillOpacity: 0.1, 
                  weight: 2,
                  dashArray: '5, 5'
                }} 
                radius={zone.radius_meters || 100} 
              />
              <Marker position={[zone.centroid.latitude, zone.centroid.longitude]} icon={operatorIcon}>
                <Popup className="custom-popup">
                  <div className="font-mono text-xs">
                    <strong className="text-telemetry block mb-1 uppercase text-sm border-b border-border pb-1">POLLUTION ZONE: {zone.zone_id}</strong>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Severity</span>
                      <span className="font-bold" style={{color: getSeverityColor(zone.severity)}}>{zone.severity || 'UNKNOWN'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Average AQI</span>
                      <span className="font-bold text-text-primary">{Math.round(zone.aqi.average)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak AQI</span>
                      <span className="font-bold text-hazardous">{zone.aqi.maximum}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Avg PM2.5</span>
                      <span className="text-text-primary">{zone.pm25?.average ? Math.round(zone.pm25.average) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Avg PM10</span>
                      <span className="text-text-primary">{zone.pm10?.average ? Math.round(zone.pm10.average) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Dominant</span>
                      <span className="text-text-primary">{zone.dominant_pollutant || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Readings</span>
                      <span className="text-text-primary">{zone.measurement_count} pts</span>
                    </div>
                    {zone.priority && (
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-text-muted">Priority</span>
                        <span className="font-bold uppercase text-hazardous">{zone.priority.classification} ({zone.priority.score})</span>
                      </div>
                    )}
                    {zone.altitude && zone.altitude.min_meters !== null && (
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-text-muted">Altitude</span>
                        <span className="text-text-primary">{Math.round(zone.altitude.min_meters)}-{Math.round(zone.altitude.max_meters)}m</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted">Radius</span>
                      <span className="text-text-primary">{zone.radius_meters} m</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {layers.persistent && persistentData.map((ph) => (
            <React.Fragment key={`ph-${ph.hotspot_id}`}>
              <Circle 
                center={[ph.latitude, ph.longitude]} 
                pathOptions={{ 
                  color: '#f97316', 
                  fillColor: '#f97316', 
                  fillOpacity: 0.3, 
                  weight: 3,
                  className: 'animate-pulse'
                }} 
                radius={100} 
              />
              <Marker position={[ph.latitude, ph.longitude]} icon={persistentIcon}>
                <Popup className="custom-popup">
                  <div className="font-mono text-xs">
                    <strong className="text-warning block mb-1 uppercase text-sm border-b border-border pb-1">PERSISTENT HOTSPOT</strong>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Surveys detected</span>
                      <span className="font-bold text-warning">{ph.surveys_detected}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">First detected</span>
                      <span className="text-text-primary">{new Date(ph.first_detected).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Last detected</span>
                      <span className="text-text-primary">{new Date(ph.last_detected).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Average AQI</span>
                      <span className="font-bold text-hazardous">{Math.round(ph.average_aqi)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak AQI</span>
                      <span className="font-bold text-hazardous">{ph.peak_aqi}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Average PM2.5</span>
                      <span className="text-text-primary">{ph.average_pm25?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Peak PM2.5</span>
                      <span className="text-text-primary">{ph.peak_pm25?.toFixed(1) || 'N/A'}</span>
                    </div>
                    {ph.trend_analysis && (
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-text-muted">Trend</span>
                        <span className={`font-bold ${ph.trend_analysis.trend === 'WORSENING' ? 'text-hazardous' : ph.trend_analysis.trend === 'IMPROVING' ? 'text-safe' : 'text-text-primary'}`}>{ph.trend_analysis.trend}</span>
                      </div>
                    )}
                    {ph.priority && (
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-text-muted">Priority</span>
                        <span className="font-bold uppercase text-hazardous">{ph.priority.classification}</span>
                      </div>
                    )}
                    {ph.altitude && ph.altitude.min_meters !== null && (
                      <div className="flex justify-between py-1">
                        <span className="text-text-muted">Altitude</span>
                        <span className="text-text-primary">{Math.round(ph.altitude.min_meters)}-{Math.round(ph.altitude.max_meters)}m</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {layers.recommended && recommendationsData.map((rec, idx) => (
            <React.Fragment key={`rec-zone-${idx}`}>
              <Circle 
                center={[rec.location.latitude, rec.location.longitude]} 
                pathOptions={{ 
                  color: '#3B82F6', 
                  fillColor: '#3B82F6', 
                  fillOpacity: 0.15, 
                  weight: 2,
                  dashArray: '5, 10'
                }} 
                radius={rec.radius_meters || 75} 
              />
              <Marker position={[rec.location.latitude, rec.location.longitude]} icon={recommendedIcon}>
                <Popup className="custom-popup">
                  <div className="font-mono text-xs">
                    <strong className="text-telemetry block mb-1 uppercase text-sm border-b border-border pb-1">RECOMMENDED ACTION: {rec.action}</strong>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Priority</span>
                      <span className="font-bold text-telemetry uppercase">{rec.priority}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-text-muted">Reason</span>
                      <span className="text-text-primary text-[10px] break-words max-w-[150px]">{rec.reason}</span>
                    </div>
                    <div className="text-[9px] text-warning mt-2 italic border-t border-border/20 pt-1 font-bold">
                      STATUS: RECOMMENDATION ONLY
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {operatorLoc && (
            <Marker position={operatorLoc} icon={operatorIcon}>
              <Popup className="custom-popup">
                <div className="font-mono text-xs text-safe font-bold uppercase tracking-wide">
                  Operator Location
                </div>
              </Popup>
            </Marker>
          )}

          {activeCenter && (
            <Marker position={activeCenter} icon={droneIcon}>
              <Popup className="custom-popup">
                <div className="font-mono text-xs text-text-primary">
                  <strong className="text-telemetry block border-b border-border/50 pb-1 mb-1 uppercase tracking-wide">Drone Location</strong>
                  <div className="flex justify-between py-0.5"><span className="text-text-muted">Lat:</span> <span>{activeCenter[0].toFixed(5)}</span></div>
                  <div className="flex justify-between py-0.5"><span className="text-text-muted">Lng:</span> <span>{activeCenter[1].toFixed(5)}</span></div>
                  {currentLocation?.altitude != null && <div className="flex justify-between py-0.5"><span className="text-text-muted">Alt:</span> <span>{currentLocation.altitude.toFixed(1)} m</span></div>}
                  {telemetry && (
                    <>
                      <div className="flex justify-between py-0.5"><span className="text-text-muted">Speed:</span> <span>{telemetry.speed != null ? `${telemetry.speed.toFixed(1)} m/s` : 'N/A'}</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-text-muted">Heading:</span> <span>{telemetry.heading != null ? `${telemetry.heading.toFixed(0)}°` : 'N/A'}</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-text-muted">GPS:</span> <span>{telemetry.gps_status || 'UNKNOWN'}</span></div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

        </MapContainer>
      )}
    </div>
  );
}
