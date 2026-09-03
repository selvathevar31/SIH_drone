import React from 'react';

export default function LiveTelemetryPanel({ liveData, isLive }) {
  if (!isLive) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col items-center justify-center min-h-[150px]">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Historical mode active</span>
        <span className="text-[10px] font-mono text-text-muted mt-1">Real-time control feed offline.</span>
      </div>
    );
  }

  if (!liveData || !liveData.latest_environment) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col items-center justify-center min-h-[150px]">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Telemetry unavailable</span>
        <span className="text-[10px] font-mono text-text-muted mt-1">Waiting for drone payload connection...</span>
      </div>
    );
  }

  const env = liveData.latest_environment;
  const alt = liveData.current_altitude;

  const getStatusColor = (val, type) => {
    if (val == null) return 'text-text-muted';
    if (type === 'aqi') {
      if (val > 200) return 'text-hazardous font-bold';
      if (val > 100) return 'text-warning font-bold';
      return 'text-safe font-bold';
    }
    if (type === 'pm25') {
      if (val > 90) return 'text-hazardous font-bold';
      if (val > 60) return 'text-warning font-bold';
      return 'text-safe font-bold';
    }
    return 'text-text-primary';
  };

  const getStatusLabel = (val, type) => {
    if (val == null) return 'N/A';
    if (type === 'aqi') {
      if (val > 200) return 'VERY POOR';
      if (val > 100) return 'POOR';
      return 'GOOD';
    }
    if (type === 'pm25') {
      if (val > 90) return 'CRITICAL';
      if (val > 60) return 'HIGH';
      return 'NORMAL';
    }
    return 'NORMAL';
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold font-mono text-telemetry uppercase tracking-wider border-b border-border/40 pb-2">
        ● Live Telemetry Feed
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* PM2.5 */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">PM2.5</span>
          <span className="text-lg font-bold font-mono text-text-primary">
            {env.pm25 != null ? `${env.pm25.toFixed(1)}` : 'N/A'} <span className="text-[9px] text-text-muted font-normal">µg/m³</span>
          </span>
          <span className={`text-[9px] font-mono mt-1 ${getStatusColor(env.pm25, 'pm25')}`}>
            {getStatusLabel(env.pm25, 'pm25')}
          </span>
        </div>

        {/* PM10 */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">PM10</span>
          <span className="text-lg font-bold font-mono text-text-primary">
            {env.pm10 != null ? `${env.pm10.toFixed(1)}` : 'N/A'} <span className="text-[9px] text-text-muted font-normal">µg/m³</span>
          </span>
          <span className="text-[9px] font-mono text-text-muted mt-1">NORMAL</span>
        </div>

        {/* AQI */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">AQI</span>
          <span className="text-lg font-bold font-mono text-text-primary">
            {env.aqi != null ? env.aqi : 'N/A'}
          </span>
          <span className={`text-[9px] font-mono mt-1 ${getStatusColor(env.aqi, 'aqi')}`}>
            {getStatusLabel(env.aqi, 'aqi')}
          </span>
        </div>

        {/* Temp */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Temperature</span>
          <span className="text-sm font-bold font-mono text-text-primary">
            {env.temperature != null ? `${env.temperature.toFixed(1)}°C` : 'N/A'}
          </span>
        </div>

        {/* Humidity */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Humidity</span>
          <span className="text-sm font-bold font-mono text-text-primary">
            {env.humidity != null ? `${env.humidity.toFixed(0)}%` : 'N/A'}
          </span>
        </div>

        {/* Altitude */}
        <div className="bg-surface-elevated border border-border/80 p-3 rounded flex flex-col">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Altitude</span>
          <span className="text-sm font-bold font-mono text-text-primary">
            {alt != null ? `${alt.toFixed(1)} m` : 'N/A'}
          </span>
        </div>

      </div>
    </div>
  );
}
