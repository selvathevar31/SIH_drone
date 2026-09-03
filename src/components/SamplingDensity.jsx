import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';
import { getSamplingDensity, getFlightPath, getPersistentHotspots } from '../services/api';
import { AlertTriangle, Map } from 'lucide-react';

export default function SamplingDensity({ missionId, timeParams }) {
  const [points, setPoints] = useState([]);
  const [flightPath, setFlightPath] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!missionId) return;

    setLoading(true);
    Promise.all([
      getSamplingDensity(missionId, timeParams),
      getFlightPath(missionId, timeParams).catch(() => []),
      getPersistentHotspots().catch(() => ({ persistent_hotspots: [] }))
    ]).then(([densityData, pathData, hsData]) => {
      if (isMounted) {
        setPoints(densityData);
        setFlightPath(pathData.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]));
        setHotspots(hsData.persistent_hotspots || []);
      }
    }).catch(err => {
      console.error("Failed to load sampling density", err);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [missionId, timeParams]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-telemetry font-mono font-bold tracking-widest uppercase">Calculating Density...</div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
        <div className="text-text-secondary text-sm">Waiting for valid GPS coordinates.</div>
      </div>
    );
  }

  // Calculate center
  const lats = points.map(p => p[0]);
  const lngs = points.map(p => p[1]);
  const center = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2
  ];

  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden h-full flex flex-col min-h-[400px] relative">
      <div className="absolute top-4 left-4 z-[400] pointer-events-none">
        <div className="bg-surface-elevated/90 backdrop-blur-md border border-border rounded shadow-lg p-3 w-64 pointer-events-auto text-xs font-mono">
          <h2 className="font-bold tracking-widest text-text-primary uppercase flex items-center gap-2 mb-2 border-b border-border pb-2">
            <Map className="w-4 h-4" /> Sampling Density
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Samples:</span>
              <span className="text-telemetry font-bold">{points.length}</span>
            </div>
            
            <div className="mt-2 bg-surface-secondary/50 p-2 rounded border border-border/50">
              <div className="text-[10px] text-text-muted uppercase mb-1">Survey Path (White)</div>
              <div className="text-[10px] text-text-muted uppercase">Measurement Density (Heatmap)</div>
            </div>
            
            <div className="mt-1 bg-warning/10 border border-warning/30 text-warning px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> 
              <span>Adaptive path data unavailable. Showing static flight path only.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer 
          center={center} 
          zoom={16} 
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Base Heatmap (Gradient for Density) */}
          <HeatmapLayer 
            points={points} 
            radius={25} 
            blur={15} 
            max={5.0} // Adjust max to make it show hotspots better based on overlapping points
          />

          {/* Hotspot overlays */}
          {hotspots.map((hs, i) => (
            <Circle
              key={`hs-${i}`}
              center={[hs.latitude, hs.longitude]}
              radius={100}
              pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
            >
              <Popup className="custom-popup">
                <div className="font-mono text-xs p-1">
                  <div className="font-bold text-hazardous mb-1">Persistent Hotspot</div>
                  <div>ID: {hs.hotspot_id}</div>
                  <div>Peak AQI: {hs.peak_aqi}</div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Flight Path Overlay */}
          {flightPath.length > 0 && (
            <Polyline 
              positions={flightPath} 
              pathOptions={{ color: 'white', weight: 1, opacity: 0.5, dashArray: '4, 6' }} 
            />
          )}

          {/* Start Point */}
          {flightPath.length > 0 && (
            <CircleMarker 
              center={flightPath[0]}
              radius={4}
              pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 1 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
