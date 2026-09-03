import React from 'react';
import { Compass, Target, Info } from 'lucide-react';

export default function SamplingStatus({ samplingData }) {
  const hasZones = samplingData && samplingData.recommended_zones && samplingData.recommended_zones.length > 0;
  const zones = hasZones ? samplingData.recommended_zones : [];
  
  // Find highest priority zone
  const highestZone = hasZones ? zones[0] : null;

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold font-mono text-text-primary uppercase tracking-wider border-b border-border/40 pb-2 flex justify-between items-center">
        <span>Adaptive Profiling Status</span>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${hasZones ? 'bg-telemetry/10 text-telemetry border-telemetry/30 animate-pulse' : 'bg-surface-secondary text-text-muted border-border'}`}>
          {hasZones ? 'ADAPTIVE' : 'STATIC'}
        </span>
      </h3>

      <div className="flex flex-col gap-3 font-mono text-xs">
        
        {/* Recommended zones count */}
        <div className="flex justify-between items-center border-b border-border/20 pb-2">
          <span className="text-[10px] text-text-muted uppercase">Recommended Zones</span>
          <span className="font-bold text-text-primary">{zones.length}</span>
        </div>

        {/* Highest priority zone details */}
        {highestZone ? (
          <>
            <div className="flex flex-col gap-1 border-b border-border/20 pb-2">
              <span className="text-[10px] text-text-muted uppercase">Highest Priority Zone</span>
              <div className="flex items-center gap-1.5 text-text-primary text-[11px] font-bold">
                <Target className="w-3.5 h-3.5 text-telemetry" />
                <span>Lat: {highestZone.latitude.toFixed(5)}, Lng: {highestZone.longitude.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                <span>Radius: {highestZone.radius}m</span>
                <span className="text-telemetry font-bold uppercase">{highestZone.priority} PRIORITY</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase">Target Reason</span>
              <p className="text-[10px] text-text-secondary leading-relaxed bg-surface-secondary/40 p-2 rounded border border-border/30">
                {highestZone.reason}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-xs text-text-muted italic flex flex-col gap-2 items-center">
            <Info className="w-5 h-5 text-text-muted" />
            <span>No recommended zones generated. Telemetry coverage is currently adequate.</span>
          </div>
        )}

        <div className="text-[9px] text-warning italic border-t border-border/20 pt-2 flex items-start gap-1">
          <span>⚠️</span>
          <span>Recommendations only. Consult telemetry parameters. Do NOT use as autonomous flight command.</span>
        </div>

      </div>
    </div>
  );
}
