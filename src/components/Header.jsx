import React from 'react';
import { Navigation2, ChevronDown } from 'lucide-react';

export default function Header({ 
  missions, 
  selectedMission, 
  setSelectedMission, 
  isLive, 
  setIsLive, 
  backendOnline, 
  lastUpdated,
  liveData,
  freshness
}) {
  
  // Calculate Drone Mode
  const getDroneStatus = () => {
    if (!backendOnline) return 'Offline';
    if (!isLive) return 'Historical Survey';
    if (liveData && liveData.status) {
      return liveData.status.charAt(0).toUpperCase() + liveData.status.slice(1).toLowerCase();
    }
    return 'Idle';
  };

  const getDroneStatusColor = () => {
    if (!backendOnline) return 'text-hazardous';
    if (!isLive) return 'text-text-secondary';
    const status = liveData?.status?.toUpperCase() || 'IDLE';
    switch (status) {
      case 'ACTIVE':
        return 'text-safe';
      case 'PAUSED':
        return 'text-warning';
      case 'COMPLETED':
        return 'text-safe';
      case 'FAILED':
        return 'text-hazardous';
      default:
        return 'text-text-muted';
    }
  };

  const getFreshnessBadge = () => {
    if (!backendOnline) return <span className="text-[10px] font-mono text-hazardous uppercase">OFFLINE</span>;
    if (freshness === 'REPLAY') return <span className="text-[10px] font-mono text-telemetry uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-telemetry rounded-full"></span>REPLAY TICK</span>;
    if (!isLive) return <span className="text-[10px] font-mono text-text-muted uppercase">HISTORICAL SNAPSHOT</span>;
    if (freshness === 'LIVE') {
      return (
        <span className="text-[10px] font-mono text-safe uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-safe rounded-full animate-pulse"></span>
          LIVE FEED
        </span>
      );
    }
    if (freshness && freshness.startsWith('STALE')) {
      return <span className="text-[10px] font-mono text-warning uppercase">{freshness}</span>;
    }
    return <span className="text-[10px] font-mono text-text-muted uppercase">CONNECTING...</span>;
  };

  const currentMode = freshness === 'REPLAY' ? 'Replay Mode' : isLive ? 'Live Mode' : 'Historical Mode';
  const modeColor = freshness === 'REPLAY' ? 'bg-telemetry text-background shadow-[0_0_10px_rgba(56,189,248,0.5)]' : isLive ? 'bg-safe text-background shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-surface-secondary text-text-secondary';


  return (
    <header className="h-16 border-b border-border/60 bg-surface-primary flex items-center justify-between px-8 shrink-0 relative z-50">
      
      {/* Brand Logo & Basic Mode */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="font-bold text-sm tracking-[0.15em] text-surface-dark uppercase">QUDRACOPTER</h1>
          <span className="text-[8px] font-bold tracking-[0.2em] text-telemetry uppercase">Aerial Air Quality Control</span>
        </div>
        <div className="h-6 w-px bg-border/80 mx-2" />
        <span className={`text-[10px] font-bold tracking-widest uppercase ${freshness === 'REPLAY' ? 'text-telemetry' : isLive ? 'text-safe' : 'text-text-secondary'}`}>
          {currentMode}
        </span>
      </div>

      {/* Center: System Status Strip */}
      <div className="flex items-center gap-6 text-[11px] text-text-muted">
        
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[9px]">System</span>
          <span className={`font-medium flex items-center gap-1 ${backendOnline ? 'text-safe' : 'text-hazardous'}`}>
            {backendOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[9px]">Drone</span>
          <span className={`font-medium flex items-center gap-1 ${getDroneStatusColor()}`}>
            {getDroneStatus()}
          </span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[9px]">Mission</span>
          <span className="font-medium text-text-primary">{selectedMission || 'NONE'}</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        <div className="flex items-center gap-2">
          {lastUpdated ? (
            <>
              <span className="uppercase tracking-widest text-[9px]">Last Updated</span>
              <span className="text-text-primary font-medium">{lastUpdated}</span>
              <span className="ml-1">{getFreshnessBadge()}</span>
            </>
          ) : (
            <span>{getFreshnessBadge()}</span>
          )}
        </div>

      </div>
      
      {/* Controls: Mission dropdown & Live toggle */}
      <div className="flex items-center gap-4">
        
        <div className="relative">
          <select 
            value={selectedMission} 
            onChange={(e) => setSelectedMission(e.target.value)}
            className="appearance-none bg-transparent border-none text-[11px] font-medium text-text-primary focus:outline-none cursor-pointer pr-4 hover:text-telemetry transition-colors uppercase tracking-wide"
          >
            {missions.length === 0 && <option value="">No Missions</option>}
            {missions.map(m => (
              <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-text-muted absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="h-4 w-px bg-border/80" />

        {/* Live / History Toggle */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLive(false)}
            className={`text-[10px] font-bold tracking-[0.1em] uppercase transition-colors ${!isLive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            History
          </button>
          <button 
            onClick={() => setIsLive(true)}
            className={`text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-1.5 transition-colors ${isLive ? 'text-safe' : 'text-text-muted hover:text-text-primary'}`}
          >
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse"></span>}
            Live
          </button>
        </div>
        
      </div>
    </header>
  );
}
