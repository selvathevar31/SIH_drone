import React, { useState, useEffect } from 'react';
import {
  Play, Pause, Square, RefreshCw, Activity, Database,
  Shield, Server, Radio, Battery, Wind, Sparkles, FastForward
} from 'lucide-react';

const DEMO_PHASES = [
  'INITIALIZED', 'TAKEOFF', 'SURVEYING', 'ANALYZING', 'HOTSPOT_DETECTED', 
  'ADAPTIVE_SAMPLING', 'DECISION', 'RESPONSE_SIMULATION', 'COMPLETED'
];

export default function DemoControlPanel({ 
  selectedMission, 
  setSelectedMission,
  liveData, 
  isLive, 
  setIsLive,
  freshness,
  onResetSuccess 
}) {
  const [health, setHealth] = useState({
    backend: "OFFLINE",
    database: "DISCONNECTED",
    ai: "FALLBACK",
    gis: "READY"
  });

  const [loadingAction, setLoadingAction] = useState(null);
  const [demoSpeed, setDemoSpeed] = useState(1);

  // Poll system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealth({
            backend: data.backend || "ONLINE",
            database: data.database || "CONNECTED",
            ai: data.ai || "AVAILABLE",
            gis: data.gis || "READY",
            simulator: "READY",
            rag: "ONLINE"
          });
        } else {
          setHealth(h => ({ ...h, backend: "OFFLINE", database: "DISCONNECTED" }));
        }
      } catch {
        setHealth(h => ({ ...h, backend: "OFFLINE", database: "DISCONNECTED" }));
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStateChange = async (targetStatus) => {
    if (!selectedMission) return;
    setLoadingAction(targetStatus);
    try {
      const res = await fetch(`http://localhost:8000/api/missions/${selectedMission}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        if (targetStatus === 'SURVEYING') setIsLive(true);
        else if (targetStatus === 'ABORTED' || targetStatus === 'COMPLETED') setIsLive(false);
      }
    } catch (err) {
      console.error("Failed to update simulator state:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartDemo = async () => {
    setLoadingAction("START");
    try {
      const res = await fetch(`http://localhost:8000/api/demo/start?speed=${demoSpeed}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.mission_id) {
          setSelectedMission(data.mission_id);
          setIsLive(true);
        }
      } else {
        alert("Run python scripts/mission_simulator.py to start simulation. Auto-start requires backend support.");
      }
    } catch (err) {
      console.error(err);
      alert("Auto-start failed. Run 'python scripts/mission_simulator.py' in backend directory.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetData = async () => {
    if (!selectedMission) return;
    if (!window.confirm("Wipe this mission data?")) return;
    setLoadingAction("RESET");
    try {
      const res = await fetch(`http://localhost:8000/api/missions/${selectedMission}`, { method: 'DELETE' });
      if (res.ok) {
        setIsLive(false);
        if (onResetSuccess) onResetSuccess();
      }
    } catch (err) {
      console.error("Failed to delete mission:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const getHealthDotColor = (status) => {
    if (["ONLINE", "CONNECTED", "AVAILABLE", "READY"].includes(status)) return "bg-safe animate-pulse";
    if (["WARNING", "FALLBACK"].includes(status)) return "bg-warning";
    return "bg-hazardous";
  };

  const isSimActive = selectedMission && selectedMission.startsWith("SIM-");
  const simState = liveData?.status || "NOT RUNNING";

  // Determine current phase index
  const currentPhaseIndex = DEMO_PHASES.indexOf(simState);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 border-b border-border/40 pb-4">
      
      {/* 1. Simulation Control Widget */}
      <div className="lg:col-span-3 bg-surface-primary border border-border p-4 rounded-lg flex flex-col gap-4 shadow">
        <div className="flex justify-between items-center border-b border-border/30 pb-2">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-5 h-5 text-telemetry" /> SIH Demo Control Center
          </h2>
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-text-muted bg-surface-secondary px-2 py-1 rounded">
              CLI: <code className="text-telemetry">python mission_simulator.py</code>
            </span>
          </div>
        </div>

        {/* Demo Pipeline Progress */}
        <div className="w-full flex items-center justify-between mt-2 overflow-x-auto custom-scrollbar pb-2">
          {DEMO_PHASES.map((phase, idx) => (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center gap-1 w-24">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  idx < currentPhaseIndex ? 'bg-safe border-safe' : 
                  idx === currentPhaseIndex ? 'bg-telemetry border-telemetry shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 
                  'bg-background border-border'
                }`} />
                <span className={`text-[8px] font-bold text-center tracking-wider ${
                  idx <= currentPhaseIndex ? 'text-text-primary' : 'text-text-muted'
                }`}>{phase.replace('_', ' ')}</span>
              </div>
              {idx < DEMO_PHASES.length - 1 && (
                <div className={`w-8 h-[2px] ${idx < currentPhaseIndex ? 'bg-safe' : 'bg-border/50'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-elevated border border-border p-3 rounded">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-text-muted uppercase">Flight State</span>
              <span className="text-xs font-mono font-bold text-text-primary uppercase">{simState}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-text-muted uppercase">Battery</span>
              <span className="text-xs font-mono font-bold text-text-primary flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-safe" /> {liveData?.battery ?? 'N/A'}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-text-muted uppercase">AQI / PM2.5</span>
              <span className="text-xs font-mono font-bold text-text-primary">
                {liveData?.latest_environment?.aqi ?? 'N/A'} ({liveData?.latest_environment?.pm25 ?? 'N/A'} µg)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-text-muted uppercase">Elapsed Time</span>
              <span className="text-xs font-mono font-bold text-text-primary">
                {liveData?.total_readings ? `${(liveData.total_readings * 2)}s` : '0s'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 w-full md:w-auto">
            {!isSimActive || simState === 'COMPLETED' || simState === 'ABORTED' ? (
              <button
                onClick={handleStartDemo}
                disabled={loadingAction !== null}
                className="flex items-center gap-1.5 bg-telemetry hover:bg-telemetry/80 text-background text-xs font-bold uppercase px-4 py-2 rounded"
              >
                <Play className="w-4 h-4" /> Start Demo
              </button>
            ) : simState === 'PAUSED' ? (
              <button
                onClick={() => handleStateChange('SURVEYING')}
                disabled={loadingAction !== null}
                className="flex items-center gap-1.5 bg-safe text-background text-xs font-bold uppercase px-3 py-2 rounded"
              >
                <Play className="w-4 h-4" /> Resume
              </button>
            ) : (
              <button
                onClick={() => handleStateChange('PAUSED')}
                disabled={loadingAction !== null}
                className="flex items-center gap-1.5 bg-warning text-background text-xs font-bold uppercase px-3 py-2 rounded"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}

            {isSimActive && simState !== 'COMPLETED' && simState !== 'ABORTED' && (
              <button
                onClick={() => handleStateChange('ABORTED')}
                disabled={loadingAction !== null}
                className="flex items-center gap-1.5 bg-hazardous text-text-primary text-xs font-bold uppercase px-3 py-2 rounded border border-hazardous/40"
              >
                <Square className="w-4 h-4" /> Abort
              </button>
            )}

            <button
              onClick={handleResetData}
              disabled={loadingAction !== null}
              className="flex items-center gap-1.5 bg-surface-secondary hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border text-xs font-bold uppercase px-3 py-2 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAction === 'RESET' ? 'animate-spin' : ''}`} /> Reset
            </button>
            
            <div className="flex items-center gap-1 bg-surface-secondary border border-border rounded p-1 ml-2">
              <FastForward className="w-3.5 h-3.5 text-text-muted mx-1" />
              {[0.5, 1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setDemoSpeed(s)}
                  className={`px-2 py-1 text-[10px] font-bold rounded ${demoSpeed === s ? 'bg-telemetry text-background shadow' : 'text-text-muted'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. System Health Status Panel */}
      <div className="lg:col-span-1 bg-surface-primary border border-border p-4 rounded-lg flex flex-col gap-3 shadow">
        <h2 className="text-xs font-bold text-text-primary uppercase tracking-widest border-b border-border/30 pb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-safe" /> System Health
        </h2>
        
        <div className="grid grid-cols-1 gap-1 text-[10px] font-mono">
          <HealthRow icon={Server} label="Backend" status={health.backend} color={getHealthDotColor(health.backend)} />
          <HealthRow icon={Database} label="Database" status={health.database} color={getHealthDotColor(health.database)} />
          <HealthRow icon={Radio} label="Telemetry" status={freshness === 'LIVE' ? 'ONLINE' : 'FALLBACK'} color={getHealthDotColor(freshness === 'LIVE' ? 'ONLINE' : 'FALLBACK')} />
          <HealthRow icon={Sparkles} label="AI Engine" status={health.ai} color={getHealthDotColor(health.ai)} />
          <HealthRow icon={Database} label="RAG System" status={health.rag || 'ONLINE'} color={getHealthDotColor('ONLINE')} />
          <HealthRow icon={Activity} label="Simulator" status={health.simulator || 'READY'} color={getHealthDotColor('READY')} />
          <HealthRow icon={Play} label="Replay Engine" status="READY" color={getHealthDotColor('READY')} />
          <HealthRow icon={Wind} label="GIS Map" status={health.gis} color={getHealthDotColor(health.gis)} />
        </div>
      </div>

    </div>
  );
}

function HealthRow({ icon: Icon, label, status, color }) {
  return (
    <div className="flex items-center justify-between border-b border-border/20 pb-1 pt-1">
      <span className="text-text-muted flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="flex items-center gap-1.5 font-bold text-text-primary uppercase tracking-wider">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {status === 'FALLBACK' && label === 'AI Engine' ? 'GROUNDED FALLBACK' : status}
      </span>
    </div>
  );
}
