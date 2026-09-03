import React, { useEffect, useRef } from 'react';
import { AlertCircle, ShieldAlert, Target, PlayCircle, MapPin, Search, CheckCircle } from 'lucide-react';

export default function MissionEventTimeline({ events, currentTimestamp }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the active event
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('.active-event');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTimestamp]);

  const getEventIcon = (type) => {
    if (type.includes('HOTSPOT') || type.includes('POLLUTION')) return <ShieldAlert className="w-4 h-4 text-hazardous" />;
    if (type.includes('SAMPLING') || type.includes('DECISION')) return <Target className="w-4 h-4 text-warning" />;
    if (type.includes('SIMULATION')) return <PlayCircle className="w-4 h-4 text-fuchsia-400" />;
    if (type.includes('MISSION_COMPLETED')) return <CheckCircle className="w-4 h-4 text-safe" />;
    if (type.includes('GPS')) return <MapPin className="w-4 h-4 text-info" />;
    return <Search className="w-4 h-4 text-telemetry" />;
  };

  const getEventColor = (type, isActive) => {
    if (!isActive) return 'border-border/50 bg-background/30 text-text-muted';
    if (type.includes('HOTSPOT') || type.includes('POLLUTION')) return 'border-hazardous/50 bg-hazardous/10 text-hazardous';
    if (type.includes('SAMPLING') || type.includes('DECISION')) return 'border-warning/50 bg-warning/10 text-warning';
    if (type.includes('SIMULATION')) return 'border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-400';
    if (type.includes('MISSION_COMPLETED')) return 'border-safe/50 bg-safe/10 text-safe';
    return 'border-telemetry/50 bg-telemetry/10 text-telemetry';
  };

  return (
    <div className="p-4 flex flex-col gap-4 relative" ref={scrollRef}>
      {/* Vertical line connecting events */}
      <div className="absolute left-8 top-6 bottom-6 w-px bg-border/50"></div>
      
      {events.map((ev, idx) => {
        const evTime = new Date(ev.timestamp).getTime();
        const isPast = evTime <= currentTimestamp;
        // The active event is the last one in the past
        const nextTime = idx < events.length - 1 ? new Date(events[idx+1].timestamp).getTime() : Infinity;
        const isActive = isPast && currentTimestamp < nextTime;
        
        if (!isPast && !isActive && idx > events.findIndex(e => new Date(e.timestamp).getTime() > currentTimestamp) + 2) {
            // Hide events that are far in the future
            return null;
        }

        return (
          <div 
            key={ev.event_id} 
            className={`relative z-10 pl-10 pr-2 transition-all duration-300 ${isActive ? 'active-event opacity-100' : isPast ? 'opacity-70' : 'opacity-30 blur-[1px]'}`}
          >
            {/* Timeline node */}
            <div className={`absolute left-[11px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${isPast ? 'bg-surface-primary border-telemetry' : 'bg-background border-border'}`}></div>
            
            <div className={`p-3 rounded border ${getEventColor(ev.type, isPast)}`}>
              <div className="flex items-center gap-2 mb-1">
                {getEventIcon(ev.type)}
                <span className="text-[10px] font-mono opacity-80">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                {ev.source === 'SIMULATION' && (
                  <span className="ml-auto text-[9px] bg-fuchsia-400 text-black px-1.5 py-0.5 rounded-sm font-bold tracking-widest">SIM</span>
                )}
              </div>
              <h4 className="font-bold text-sm tracking-wide">{ev.title}</h4>
              {isActive && (
                <p className="text-xs opacity-90 mt-2 leading-relaxed">
                  {ev.message}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
