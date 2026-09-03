import React from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin } from 'lucide-react';

export default function MissionAlerts({ alerts, onLocateOnMap }) {
  const getIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-hazardous shrink-0 animate-pulse" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-telemetry shrink-0" />;
    }
  };

  const getBorderColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-hazardous/40 bg-hazardous/5';
      case 'HIGH':
        return 'border-warning/30 bg-warning/5';
      default:
        return 'border-telemetry/20 bg-telemetry/5';
    }
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold font-mono text-text-primary uppercase tracking-wider border-b border-border/40 pb-2 flex justify-between items-center">
        <span>Mission Alerts</span>
        {alerts && alerts.length > 0 && (
          <span className="text-[10px] bg-hazardous/10 text-hazardous px-2 py-0.5 rounded border border-hazardous/30 font-bold animate-pulse">
            {alerts.length} ACTIVE
          </span>
        )}
      </h3>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        {alerts && alerts.length > 0 ? (
          alerts.slice(0, 5).map((alert, idx) => (
            <div 
              key={idx} 
              className={`border p-3 rounded flex gap-3 items-start justify-between transition-all ${getBorderColor(alert.severity)}`}
            >
              <div className="flex gap-2.5 items-start">
                {getIcon(alert.severity)}
                <div className="flex flex-col font-mono text-[10px]">
                  <span className="font-bold text-text-primary uppercase tracking-wide">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-text-muted mt-0.5 leading-relaxed">{alert.message}</span>
                  <span className="text-[8px] text-text-muted mt-1 uppercase">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              {alert.location && alert.location.latitude && (
                <button
                  onClick={() => onLocateOnMap({ latitude: alert.location.latitude, longitude: alert.location.longitude })}
                  className="bg-surface-elevated hover:bg-surface-secondary border border-border/50 p-1.5 rounded transition-colors text-text-muted hover:text-telemetry"
                  title="Locate Alert Zone on Map"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-xs font-mono text-text-muted italic">
            No environmental alerts active.
          </div>
        )}
      </div>
    </div>
  );
}
