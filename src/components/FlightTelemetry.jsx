import React from 'react';
import { Plane, Compass, Signal, Battery, Target, Satellite } from 'lucide-react';

const TelemetryItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 text-text-muted">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <span className="text-sm font-mono text-text-primary">{value != null ? value : 'N/A'}</span>
  </div>
);

export default function FlightTelemetry({ telemetry }) {
  if (!telemetry) return null;

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-4 h-full flex flex-col">
      <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase mb-4">Flight Telemetry</h2>
      
      <div className="flex-1 flex flex-col justify-between">
        <TelemetryItem icon={Plane} label="Altitude" value={telemetry.altitude != null ? `${telemetry.altitude.toFixed(1)} m` : null} />
        <TelemetryItem icon={Compass} label="Speed" value={telemetry.speed != null ? `${telemetry.speed.toFixed(1)} m/s` : null} />
        <TelemetryItem icon={Target} label="Heading" value={telemetry.heading != null ? `${telemetry.heading.toFixed(0)}°` : null} />
        <TelemetryItem icon={Signal} label="Signal (dBm)" value={telemetry.signal_strength != null ? telemetry.signal_strength.toFixed(1) : null} />
        <TelemetryItem icon={Satellite} label="GPS Status" value={telemetry.gps_status ? `${telemetry.gps_status} (${telemetry.satellites ?? 0})` : null} />
        
        <div className="py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-text-muted">
              <Battery className="w-4 h-4" />
              <span className="text-xs">Battery</span>
            </div>
            <span className="text-sm font-mono text-text-primary">{telemetry.battery != null ? `${telemetry.battery}%` : 'N/A'}</span>
          </div>
          {telemetry.battery != null && (
            <div className="w-full bg-surface-elevated rounded-full h-1.5 border border-border">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${telemetry.battery > 20 ? 'bg-safe' : 'bg-hazardous'}`} 
                style={{ width: `${telemetry.battery}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
