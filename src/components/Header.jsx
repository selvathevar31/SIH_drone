import React from 'react';
import { Navigation2, ChevronDown, Radio } from 'lucide-react';

export default function Header({ missions, selectedMission, setSelectedMission, isLive, setIsLive, backendOnline, lastUpdated }) {
  return (
    <header className="h-16 border-b border-border bg-surface-primary flex items-center justify-between px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-surface-elevated flex items-center justify-center border border-border">
          <Navigation2 className="text-telemetry w-6 h-6 transform rotate-45" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide text-text-primary">QUDRACOPTER</h1>
          <p className="text-[10px] uppercase tracking-wider text-telemetry font-mono">Aerial Air Quality Intelligence</p>
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs uppercase tracking-wide">Mission</span>
          <div className="relative">
            <select 
              value={selectedMission} 
              onChange={(e) => setSelectedMission(e.target.value)}
              className="appearance-none bg-surface-secondary border border-border rounded-md px-3 py-1.5 pr-8 text-sm font-mono text-text-primary focus:outline-none focus:border-telemetry transition-colors cursor-pointer"
            >
              {missions.length === 0 && <option value="">No Missions</option>}
              {missions.map(m => (
                <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-1.5 pointer-events-none" />
          </div>
        </div>

        {/* Live / History Toggle */}
        <div className="flex items-center bg-surface-secondary rounded-full p-1 border border-border">
          <button 
            onClick={() => setIsLive(false)}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors ${!isLive ? 'bg-surface-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            History
          </button>
          <button 
            onClick={() => setIsLive(true)}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 transition-colors ${isLive ? 'bg-surface-elevated text-safe shadow-sm border border-safe/20' : 'text-text-muted hover:text-text-primary'}`}
          >
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse"></span>}
            Live
          </button>
        </div>

        <div className="flex items-center gap-6 text-sm border-l border-border pl-6">
          {lastUpdated && (
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Last Updated</span>
              <span className="font-mono text-text-secondary text-xs">{lastUpdated}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${backendOnline ? 'text-safe' : 'text-hazardous'}`} />
            <span className={`text-xs font-semibold tracking-wide uppercase ${backendOnline ? 'text-safe' : 'text-hazardous'}`}>
              Backend {backendOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
      </div>
    </header>
  );
}
