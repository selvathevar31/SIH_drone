import React from 'react';
import { Play, Pause, CheckCircle, Flame, Target, Compass, RefreshCw } from 'lucide-react';

export default function MissionEvents({ events }) {
  const getEventIcon = (type) => {
    switch (type) {
      case 'MISSION_STARTED':
        return <Play className="w-3.5 h-3.5 text-safe" />;
      case 'MISSION_COMPLETED':
        return <CheckCircle className="w-3.5 h-3.5 text-safe" />;
      case 'MISSION_PAUSED':
        return <Pause className="w-3.5 h-3.5 text-warning" />;
      case 'MISSION_RESUMED':
        return <Play className="w-3.5 h-3.5 text-telemetry" />;
      case 'HIGH_POLLUTION':
        return <Flame className="w-3.5 h-3.5 text-warning animate-pulse" />;
      case 'HOTSPOT_DETECTED':
        return <Target className="w-3.5 h-3.5 text-hazardous" />;
      case 'SAMPLING_RECOMMENDED':
        return <Compass className="w-3.5 h-3.5 text-telemetry" />;
      default:
        return <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-hazardous text-hazardous bg-hazardous/5';
      case 'HIGH':
        return 'border-warning text-warning bg-warning/5';
      default:
        return 'border-border text-text-secondary bg-surface-elevated/40';
    }
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold font-mono text-text-primary uppercase tracking-wider border-b border-border/40 pb-2">
        Unified Mission Timeline
      </h3>

      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 relative pl-4 border-l border-border/40 ml-2">
        {events && events.length > 0 ? (
          events.map((event, idx) => (
            <div key={idx} className="relative flex flex-col gap-1">
              
              {/* Event bullet pin overlay */}
              <div className="absolute -left-[23px] top-1 bg-background border border-border rounded-full p-0.5 flex items-center justify-center">
                {getEventIcon(event.type)}
              </div>

              <div className={`border p-2.5 rounded font-mono text-[10px] ${getSeverityStyle(event.severity)}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold uppercase tracking-wider">{event.title}</span>
                  <span className="text-[8px] text-text-muted">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-text-muted leading-relaxed">{event.message}</p>
                
                {event.latitude && (
                  <div className="text-[8px] text-text-muted mt-1 uppercase flex justify-between">
                    <span>Coordinates: {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}</span>
                  </div>
                )}
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-8 text-xs font-mono text-text-muted italic -ml-4">
            No timeline events recorded.
          </div>
        )}
      </div>
    </div>
  );
}
