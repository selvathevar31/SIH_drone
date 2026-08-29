import React from 'react';
import { Info, AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';

const getEventIcon = (type) => {
  switch (type) {
    case 'info': return <Info className="w-4 h-4 text-telemetry" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-hazardous" />;
    case 'location': return <MapPin className="w-4 h-4 text-safe" />;
    case 'success': return <CheckCircle2 className="w-4 h-4 text-safe" />;
    default: return <Info className="w-4 h-4 text-text-muted" />;
  }
};

export default function RecentEvents({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-4 h-full flex flex-col">
        <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase mb-4">Mission Events</h2>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm font-mono italic">
          No events recorded.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-4 h-full flex flex-col">
      <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase mb-4">Mission Events</h2>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col gap-3">
          {events.map((event, i) => (
            <div key={event.id || i} className="flex gap-3 items-start p-2 rounded hover:bg-surface-secondary transition-colors">
              <div className="mt-0.5 shrink-0 bg-surface-elevated p-1.5 rounded border border-border">
                {getEventIcon(event.type)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-primary">{event.message}</span>
                <span className="text-[10px] text-text-muted font-mono mt-1">{event.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
