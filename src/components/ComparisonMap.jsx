import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapBoundsController({ data, mapMode }) {
  const map = useMap();

  useEffect(() => {
    if (data && data.length > 0) {
      const bounds = L.latLngBounds(data.map(p => [p.latitude, p.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [data, mapMode, map]);

  return null;
}

export default function ComparisonMap({ spatialData, mapMode, selectedMetric }) {
  const getMetricData = (point) => {
    if (selectedMetric === 'AQI') return point.aqi;
    if (selectedMetric === 'PM2.5') return point.pm25;
    if (selectedMetric === 'PM10') return point.pm10;
    return point.aqi;
  };

  const getMarkerColor = (point) => {
    const metricData = getMetricData(point);
    
    if (mapMode === 'CHANGE') {
      if (!metricData.change) return '#94a3b8'; // gray
      if (metricData.change > 5) return '#ef4444'; // red (worsened)
      if (metricData.change < -5) return '#22c55e'; // green (improved)
      return '#94a3b8'; // stable
    }

    const value = mapMode === 'CURRENT' ? metricData.current : metricData.previous;
    if (value === null || value === undefined) return '#475569';
    
    if (selectedMetric === 'AQI') {
      if (value <= 50) return '#22c55e';
      if (value <= 100) return '#eab308';
      return '#ef4444';
    } else if (selectedMetric === 'PM2.5') {
      if (value <= 12) return '#22c55e';
      if (value <= 35) return '#eab308';
      return '#ef4444';
    } else {
      if (value <= 54) return '#22c55e';
      if (value <= 154) return '#eab308';
      return '#ef4444';
    }
  };

  return (
    <MapContainer 
      center={[0, 0]} 
      zoom={2} 
      className="w-full h-full bg-[#0B0F19] rounded z-0"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      
      <MapBoundsController data={spatialData} mapMode={mapMode} />

      {spatialData && spatialData.map((point, index) => {
        const metricData = getMetricData(point);
        const color = getMarkerColor(point);
        
        let pctChangeText = 'N/A';
        if (metricData.previous && metricData.change !== null) {
          const pct = (metricData.change / metricData.previous) * 100;
          pctChangeText = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
        }

        return (
          <CircleMarker
            key={index}
            center={[point.latitude, point.longitude]}
            radius={5}
            pathOptions={{ 
              color: color, 
              fillColor: color, 
              fillOpacity: 0.8,
              weight: 1
            }}
          >
            <Popup className="qudracopter-popup">
              <div className="bg-surface-elevated text-text-primary p-3 rounded shadow-lg border border-border min-w-[200px]">
                <h4 className="font-bold text-sm mb-2 text-telemetry border-b border-border/50 pb-1 uppercase tracking-widest">{selectedMetric}</h4>
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Current:</span> 
                    <span>{metricData.current !== null ? metricData.current.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Previous:</span> 
                    <span>{metricData.previous !== null ? metricData.previous.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50 mt-1">
                    <span className="text-text-muted">Change:</span> 
                    <span className={metricData.change > 0 ? 'text-hazardous' : metricData.change < 0 ? 'text-safe' : 'text-text-primary'}>
                      {metricData.change > 0 ? '+' : ''}{metricData.change !== null ? metricData.change.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Change %:</span> 
                    <span className={metricData.change > 0 ? 'text-hazardous' : metricData.change < 0 ? 'text-safe' : 'text-text-primary'}>
                      {pctChangeText}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-text-muted text-center border-t border-border/50 pt-2">
                  Match Distance: {point.distance_meters}m
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
