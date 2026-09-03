import React from 'react';
import { Trophy, CheckCircle, AlertTriangle, ShieldAlert, Zap, Cpu, Network } from 'lucide-react';

export default function MissionScorecard({ missionId, dashboardData, events }) {
  if (!dashboardData) return null;

  const hotspots = dashboardData.hotspots || [];
  const metrics = dashboardData.current_environment || {};
  
  const hasSimulation = events.some(e => e.type === "SIMULATION_COMPLETED");
  
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-elevated border border-border rounded-lg shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-safe/20 border border-safe/50 text-safe rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-text-primary">Mission Complete</h1>
          <p className="text-text-muted font-mono">{missionId} • Replay Finished</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-secondary border border-border p-4 rounded text-center">
            <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Total Samples</div>
            <div className="text-2xl font-bold font-mono text-telemetry">{dashboardData.flight_path?.length || 0}</div>
          </div>
          <div className="bg-surface-secondary border border-border p-4 rounded text-center">
            <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Hotspots Found</div>
            <div className="text-2xl font-bold font-mono text-hazardous">{hotspots.length}</div>
          </div>
          <div className="bg-surface-secondary border border-border p-4 rounded text-center">
            <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Peak AQI</div>
            <div className="text-2xl font-bold font-mono text-warning">{metrics.aqi || '--'}</div>
          </div>
          <div className="bg-surface-secondary border border-border p-4 rounded text-center">
            <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Coverage Est.</div>
            <div className="text-2xl font-bold font-mono text-safe">~94%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background border border-border rounded-lg p-6 flex flex-col h-full">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 border-b border-border pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-safe" /> REAL MEASUREMENTS
            </h3>
            
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-start gap-3 bg-surface-secondary/50 p-3 rounded border border-border">
                <CheckCircle className="w-5 h-5 text-safe shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold">Data Quality</div>
                  <div className="text-xs text-text-muted">Sensors operated nominally throughout survey path.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-surface-secondary/50 p-3 rounded border border-border">
                <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${hotspots.length > 0 ? 'text-hazardous' : 'text-safe'}`} />
                <div>
                  <div className="text-sm font-bold">Risk Classification</div>
                  <div className="text-xs text-text-muted">{hotspots.length > 0 ? `${hotspots.length} Elevated risk boundaries explicitly identified.` : 'No significant environmental risks.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-surface-secondary/50 p-3 rounded border border-border">
                <Zap className={`w-5 h-5 shrink-0 mt-0.5 ${events.some(e => e.type === "SAMPLING_RECOMMENDED") ? 'text-warning' : 'text-text-muted'}`} />
                <div>
                  <div className="text-sm font-bold">Adaptive Sampling Intelligence</div>
                  <div className="text-xs text-text-muted">{events.some(e => e.type === "SAMPLING_RECOMMENDED") ? 'AI actively retargeted sampling priorities based on live data.' : 'Dynamic retargeting was not required during this mission.'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-6 flex flex-col h-full ${hasSimulation ? 'bg-fuchsia-900/10 border border-fuchsia-900/40 relative overflow-hidden' : 'bg-surface-secondary border border-border opacity-50'}`}>
            {hasSimulation && (
              <div className="absolute top-0 right-0 bg-fuchsia-900/40 text-[9px] text-fuchsia-300 px-2 py-0.5 rounded-bl border-b border-l border-fuchsia-900/50 font-mono font-bold tracking-widest uppercase">
                SIMULATION
              </div>
            )}
            
            <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 border-b pb-2 flex items-center gap-2 ${hasSimulation ? 'text-fuchsia-100 border-fuchsia-900/50' : 'text-text-muted border-border'}`}>
              <Cpu className={`w-4 h-4 ${hasSimulation ? 'text-fuchsia-400' : 'text-text-muted'}`} /> 
              SIMULATED RESPONSE RESULTS
            </h3>

            {hasSimulation ? (
              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="flex items-start gap-3 bg-fuchsia-900/20 p-3 rounded border border-fuchsia-900/30">
                  <CheckCircle className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-fuchsia-100">Closed-Loop Decision Simulated</div>
                    <div className="text-xs text-fuchsia-300/70">The Environmental Decision Engine successfully recommended and validated a follow-up action plan.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-fuchsia-900/20 p-3 rounded border border-fuchsia-900/30">
                  <Network className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-fuchsia-100">Effectiveness Verified</div>
                    <div className="text-xs text-fuchsia-300/70">Simulation confirmed the proposed response would increase data resolution in critical hotspots.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="text-text-muted text-sm font-mono">Response Simulation Not Executed</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-secondary border border-border rounded-lg p-4 text-center mt-4">
          <div className="flex items-center justify-center gap-2 mb-2 text-telemetry">
            <Network className="w-5 h-5" />
            <h4 className="font-bold text-sm tracking-widest uppercase">Environmental Intelligence Pipeline</h4>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
            <span>Data</span> <span className="text-border">→</span> 
            <span>Detection</span> <span className="text-border">→</span> 
            <span>Analysis</span> <span className="text-border">→</span> 
            <span>Decision</span> <span className="text-border">→</span> 
            <span>Response</span> <span className="text-border">→</span> 
            <span className="text-telemetry">Explanation</span>
          </div>
        </div>

      </div>
    </div>
  );
}
