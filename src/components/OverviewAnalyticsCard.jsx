import React from 'react';
import { Activity, Map as MapIcon, Compass, Crosshair, Clock, Box } from 'lucide-react';

export default function OverviewAnalyticsCard({ dashboardData, telemetryData }) {
  const stats = dashboardData?.mission_stats || {};
  const samples = (telemetryData || []).length;
  const hotspots = dashboardData?.hotspots?.length || 0;

  let durationStr = '00:00';
  let maxAltitude = stats.max_altitude || 0;
  
  if (telemetryData && telemetryData.length > 0) {
    const start = new Date(telemetryData[0].timestamp).getTime();
    const end = new Date(telemetryData[telemetryData.length - 1].timestamp).getTime();
    const diff = end - start;
    if (!isNaN(diff)) {
      const mins = Math.floor(diff / 60000);
      durationStr = `${mins} min`;
    }

    const validAlts = telemetryData
      .map(d => parseFloat(d.altitude))
      .filter(a => !isNaN(a) && a !== null);
      
    if (validAlts.length > 0) {
      maxAltitude = Math.round(Math.max(...validAlts));
    }
  }

  const metrics = [
    { label: 'Distance Covered', value: `${stats.distance_km || 0} km`, icon: <Activity className="w-5 h-5 text-telemetry" /> },
    { label: 'Samples Collected', value: samples, icon: <DatabaseIcon /> },
    { label: 'Flight Duration', value: durationStr, icon: <Clock className="w-5 h-5 text-safe" /> },
    { label: 'Max Altitude', value: `${maxAltitude} m`, icon: <Compass className="w-5 h-5 text-warning" /> },
    { label: 'Hotspots Identified', value: hotspots, icon: <Crosshair className="w-5 h-5 text-hazardous" /> },
    { label: 'Area Surveyed', value: `${((stats.distance_km || 0) * 0.2).toFixed(1)} km²`, icon: <MapIcon className="w-5 h-5 text-telemetry" /> },
  ];

  return (
    <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Flight / Mission Analytics</h3>
        <p className="text-text-secondary text-xs">Key metrics from this mission</p>
      </div>

      <div className="grid grid-cols-2 gap-y-6 gap-x-4 flex-1 content-start">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-secondary border border-border flex items-center justify-center">
              {m.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">{m.label}</span>
              <span className="text-sm font-mono font-bold text-text-primary">{m.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple cylinder database icon matching reference
function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-telemetry">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}
