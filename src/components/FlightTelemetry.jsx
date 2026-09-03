import React from 'react';
import { Plane, Compass, Signal, Battery, Target, Satellite, ShieldCheck, Database } from 'lucide-react';

const TelemetryItem = ({ icon: Icon, label, value, isNa }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 text-text-muted">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <span className={`text-sm font-mono ${isNa ? 'text-text-muted italic' : 'text-text-primary'}`}>
      {value != null ? value : 'N/A'}
    </span>
  </div>
);

export default function FlightTelemetry({ telemetry, mission }) {
  if (!telemetry) return null;

  const isCsvMode = mission?.data_source === 'CSV';

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-4 h-full flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Flight Telemetry</h2>
        {isCsvMode ? (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 border border-warning/30 text-warning text-[9px] font-mono font-bold uppercase rounded">
            <Database className="w-3 h-3" /> CSV SURVEY
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-safe/10 border border-safe/30 text-safe text-[9px] font-mono font-bold uppercase rounded animate-pulse">
            <ShieldCheck className="w-3 h-3" /> LIVE DRONE
          </span>
        )}
      </div>

      {isCsvMode ? (
        <div className="text-[10px] text-text-muted font-mono bg-surface-elevated/50 p-2 rounded border border-border/40">
          CSV SURVEY MODE: Flight controls and real-time telemetry stream are inactive. Environment data is parsed from the uploaded mission log.
        </div>
      ) : (
        <div className="text-[10px] text-text-muted font-mono bg-surface-elevated/50 p-2 rounded border border-border/40">
          LIVE DRONE MODE: Actively receiving live sensor and navigation telemetry from UAV.
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-between">
        <TelemetryItem 
          icon={Plane} 
          label="Altitude" 
          value={telemetry.altitude != null ? `${telemetry.altitude.toFixed(1)} m` : null} 
          isNa={telemetry.altitude == null}
        />
        <TelemetryItem 
          icon={Compass} 
          label="Speed" 
          value={telemetry.speed != null ? `${telemetry.speed.toFixed(1)} m/s` : null} 
          isNa={telemetry.speed == null}
        />
        <TelemetryItem 
          icon={Target} 
          label="Heading" 
          value={telemetry.heading != null ? `${telemetry.heading.toFixed(0)}°` : null} 
          isNa={telemetry.heading == null}
        />
        <TelemetryItem 
          icon={Signal} 
          label="Signal (dBm)" 
          value={telemetry.signal_strength != null ? telemetry.signal_strength.toFixed(1) : null} 
          isNa={telemetry.signal_strength == null}
        />
        <TelemetryItem 
          icon={Satellite} 
          label="GPS Status" 
          value={telemetry.gps_status ? `${telemetry.gps_status} (${telemetry.satellites ?? 0})` : null} 
          isNa={telemetry.gps_status == null}
        />
        
        <div className="py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-text-muted">
              <Battery className="w-4 h-4" />
              <span className="text-xs">Battery</span>
            </div>
            <span className={`text-sm font-mono ${telemetry.battery == null ? 'text-text-muted italic' : 'text-text-primary'}`}>
              {telemetry.battery != null ? `${telemetry.battery}%` : 'N/A'}
            </span>
          </div>
          {telemetry.battery != null ? (
            <div className="w-full bg-surface-elevated rounded-full h-1.5 border border-border">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${telemetry.battery > 20 ? 'bg-safe' : 'bg-hazardous'}`} 
                style={{ width: `${telemetry.battery}%` }}
              ></div>
            </div>
          ) : (
            <div className="w-full bg-surface-elevated rounded-full h-1.5 border border-border opacity-20"></div>
          )}
        </div>
      </div>
    </div>
  );
}
