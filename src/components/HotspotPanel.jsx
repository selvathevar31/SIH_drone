import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function HotspotPanel({ hotspots }) {
  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-surface-secondary border border-border flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="text-safe w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase mb-1">No Hotspots</h2>
          <p className="text-xs text-text-muted">Air quality is currently stable.</p>
        </div>
      </div>
    );
  }

  // Get worst hotspot
  const hotspot = hotspots.reduce((prev, current) => {
    return (prev.peak_aqi > current.peak_aqi) ? prev : current;
  });

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-hazardous"></div>
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-hazardous w-5 h-5 animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Pollution Hotspot</h2>
        </div>
        <span className="text-xs font-mono px-2 py-1 bg-surface-elevated border border-border rounded text-text-secondary">
          #{hotspot.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <span className="text-xs text-text-muted mb-1 block">Peak AQI</span>
          <span className="text-2xl font-mono font-bold text-hazardous">{hotspot.peak_aqi || '--'}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-xs text-text-muted mb-0.5 block">Peak PM2.5</span>
            <span className="text-sm font-mono font-bold text-text-primary">
              {hotspot.peak_pm25 ? hotspot.peak_pm25.toFixed(1) : '--'} <span className="text-text-muted text-[10px]">µg/m³</span>
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted mb-0.5 block">Peak PM10</span>
            <span className="text-sm font-mono font-bold text-text-primary">
              {hotspot.peak_pm10 ? hotspot.peak_pm10.toFixed(1) : '--'} <span className="text-text-muted text-[10px]">µg/m³</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="p-3 bg-surface-secondary border border-border rounded-md mb-4 flex flex-col gap-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Center Location</span>
          <div className="font-mono text-xs text-text-secondary flex justify-between">
            <span>Lat: {hotspot.latitude.toFixed(5)}</span>
            <span>Lng: {hotspot.longitude.toFixed(5)}</span>
          </div>
          <div className="font-mono text-xs text-text-muted mt-1">Radius: {hotspot.radius_meters}m</div>
        </div>
        
        <button className="w-full py-2.5 bg-hazardous/10 hover:bg-hazardous/20 border border-hazardous/30 text-hazardous rounded transition-colors text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2">
          Investigate Zone <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
