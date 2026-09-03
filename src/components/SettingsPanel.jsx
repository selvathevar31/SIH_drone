import React, { useState } from 'react';
import { Settings, Play, RefreshCw, Terminal } from 'lucide-react';

export default function SettingsPanel() {
  const [loadingAction, setLoadingAction] = useState(null);

  const handleStartDemo = async () => {
    setLoadingAction("START");
    try {
      const res = await fetch(`http://localhost:8000/api/demo/start?speed=2.0`, { method: 'POST' });
      if (!res.ok) {
        alert("To run simulator locally, execute 'python scripts/mission_simulator.py' in the backend directory.");
      } else {
        alert("Simulator started. Switch to Overview to monitor live feed.");
      }
    } catch (err) {
      console.error(err);
      alert("Execution failed. Run 'python scripts/mission_simulator.py' in the backend directory.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Settings className="w-6 h-6 text-telemetry" />
          <h1 className="text-xl font-bold uppercase tracking-widest text-text-primary">System Settings</h1>
        </div>

        <div className="bg-surface-primary border border-border rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-warning" /> Developer & Simulation
          </h2>
          
          <p className="text-sm text-text-secondary mb-6">
            These tools are for SIH demonstration and development purposes. Triggering a simulation will generate synthetic telemetry and environmental events.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartDemo}
              disabled={loadingAction !== null}
              className="flex items-center justify-center gap-2 bg-telemetry hover:bg-telemetry/80 text-background px-4 py-2 rounded font-bold uppercase tracking-wider text-xs transition-colors"
            >
              <Play className="w-4 h-4" /> Start Simulator Pipeline
            </button>
            <button
              onClick={() => alert('Mission Reset must be performed via API or Data Explorer.')}
              className="flex items-center justify-center gap-2 bg-surface-elevated hover:bg-surface-secondary border border-border text-text-primary px-4 py-2 rounded font-bold uppercase tracking-wider text-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reset Missions
            </button>
          </div>
        </div>

        <div className="bg-surface-primary border border-border rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 border-b border-border/50 pb-2">
            General Preferences
          </h2>
          <p className="text-sm text-text-secondary italic">
            No configurable user preferences at this time.
          </p>
        </div>

      </div>
    </div>
  );
}
