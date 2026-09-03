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
    if (!backendOnline) return 'OFFLINE';
    if (!isLive) return 'HISTORICAL SURVEY';
    if (liveData && liveData.status) {
      return liveData.status.toUpperCase();
    }
    return 'IDLE';
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

  const currentMode = freshness === 'REPLAY' ? 'REPLAY MODE' : isLive ? 'LIVE MODE' : 'HISTORICAL MODE';
  const modeColor = freshness === 'REPLAY' ? 'bg-telemetry text-background shadow-[0_0_10px_rgba(56,189,248,0.5)]' : isLive ? 'bg-safe text-background shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-surface-secondary text-text-secondary';


  return (
    <header className="h-20 border-b border-border bg-surface-primary flex items-center justify-between px-6 shrink-0 relative z-50">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-surface-elevated flex items-center justify-center border border-border">
          <Navigation2 className="text-telemetry w-6 h-6 transform rotate-45" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-wide text-text-primary">QUDRACOPTER</h1>
          <p className="text-[9px] uppercase tracking-wider text-telemetry font-mono">Aerial Air Quality Control</p>
        </div>
        <div className={`ml-4 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${modeColor}`}>
          {currentMode}
        </div>
      </div>

      {/* Grid of statuses requested in Spec 5 */}
      <div className="flex items-center gap-6 text-[10px] font-mono text-text-muted">
        
        {/* System Status */}
        <div className="flex flex-col">
          <span className="uppercase tracking-widest text-[8px] mb-0.5">System</span>
          <span className={`font-bold flex items-center gap-1 ${backendOnline ? 'text-safe' : 'text-hazardous'}`}>
            ● {backendOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Drone Status */}
        <div className="flex flex-col border-l border-border/55 pl-6">
          <span className="uppercase tracking-widest text-[8px] mb-0.5">Drone</span>
          <span className={`font-bold flex items-center gap-1 ${getDroneStatusColor()}`}>
            ● {getDroneStatus()}
          </span>
        </div>

        {/* Mission Status */}
        <div className="flex flex-col border-l border-border/55 pl-6">
          <span className="uppercase tracking-widest text-[8px] mb-0.5">Mission</span>
          <span className="font-bold text-text-primary">{selectedMission || 'NONE'}</span>
        </div>

        {/* Data Freshness */}
        <div className="flex flex-col border-l border-border/55 pl-6">
          <span className="uppercase tracking-widest text-[8px] mb-0.5">Last Updated</span>
          <span className="text-text-secondary flex flex-col gap-0.5">
            <span className="text-text-primary font-bold">{lastUpdated || 'N/A'}</span>
            {getFreshnessBadge()}
          </span>
        </div>

      </div>
      
      {/* Controls: Mission dropdown & Live toggle */}
      <div className="flex items-center gap-6">
        
        <div className="flex items-center gap-3">
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
            <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-2 pointer-events-none" />
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
        
      </div>
    </header>
  );
}
