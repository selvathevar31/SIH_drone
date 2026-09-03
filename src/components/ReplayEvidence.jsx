import React from 'react';
import { X, Search, ShieldAlert, Cpu } from 'lucide-react';

export default function ReplayEvidence({ event, reasoning, onClose }) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface-primary border border-border rounded-lg shadow-2xl w-full max-w-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-elevated">
          <h3 className="font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Search className="w-5 h-5 text-telemetry" /> 
            Explain Event: {event.title}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">What Happened?</span>
              <p className="text-sm font-medium text-text-primary bg-surface-secondary p-3 rounded border border-border">{event.message}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Why Did It Happen?</span>
              <p className="text-sm font-medium text-text-primary bg-surface-secondary p-3 rounded border border-border">{reasoning.inference}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">What Data Supports It?</span>
            <div className="bg-background border border-border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="p-2 font-mono text-text-muted">TIMESTAMP</th>
                    <th className="p-2 font-mono text-text-muted">LOCATION</th>
                    <th className="p-2 font-mono text-text-muted">EVIDENCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 font-mono border-b border-border/50">{new Date(event.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 font-mono border-b border-border/50">
                      {event.latitude ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}` : 'N/A'}
                    </td>
                    <td className="p-2 font-mono border-b border-border/50">
                      {event.type.includes('POLLUTION') || event.type.includes('HOTSPOT') ? 'Elevated PM2.5 / AQI' : event.type}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">What Did The System Recommend?</span>
              <p className="text-sm font-medium text-telemetry bg-telemetry/5 p-3 rounded border border-telemetry/30">
                {reasoning.decision} {reasoning.recommendation}
              </p>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Was This Real Or Simulated?</span>
              <div className={`p-3 rounded border flex items-center gap-3 ${reasoning.source === 'SIMULATION' ? 'bg-fuchsia-400/10 border-fuchsia-400/50 text-fuchsia-400' : reasoning.source.includes('ANALYSIS') ? 'bg-warning/10 border-warning/50 text-warning' : 'bg-safe/10 border-safe/50 text-safe'}`}>
                {reasoning.source === 'SIMULATION' ? <Cpu className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                <span className="font-bold tracking-widest uppercase text-sm">{reasoning.source}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
