import React, { useState } from 'react';
import { Activity, ShieldAlert, Target, BrainCircuit, FileText } from 'lucide-react';
import ReplayEvidence from './ReplayEvidence';

export default function ReplayIntelligence({ currentEvent, telemetry, activeEvents }) {
  const [showEvidence, setShowEvidence] = useState(false);

  // Derive intelligence state based on active events
  const riskLevel = activeEvents.some(e => e.type === "HOTSPOT_DETECTED" && e.severity === "CRITICAL") ? "CRITICAL"
                  : activeEvents.some(e => e.type === "HOTSPOT_DETECTED" && e.severity === "HIGH") ? "HIGH"
                  : "NORMAL";
                  
  const hotspotsCount = activeEvents.filter(e => e.type === "HOTSPOT_DETECTED").length;
  
  const hasDecision = activeEvents.some(e => e.type === "SAMPLING_RECOMMENDED");
  const hasSimulation = activeEvents.some(e => e.type === "SIMULATION_STARTED");

  const trend = telemetry?.pm25 > 50 ? "INCREASING" : "STABLE";

  // Reconstruct reasoning based on latest events
  let reasoning = {
    fact: "Collecting baseline telemetry.",
    inference: "No significant anomalies detected.",
    decision: "Continue standard survey grid.",
    recommendation: "None",
    source: "REAL SENSOR DATA"
  };

  if (currentEvent) {
    if (currentEvent.type === "HOTSPOT_DETECTED") {
      reasoning = {
        fact: `PM2.5 reached elevated levels near hotspot ${hotspotsCount}.`,
        inference: "Measurements indicate a localized high-concentration zone.",
        decision: "Flag zone for potential adaptive sampling.",
        recommendation: "Monitor boundary growth.",
        source: "REAL SENSOR DATA"
      };
    } else if (currentEvent.type === "SAMPLING_RECOMMENDED") {
      reasoning = {
        fact: `Adaptive sampling boundaries generated for ${hotspotsCount} hotspots.`,
        inference: "Current grid lacks sufficient density to model the diffusion plume accurately.",
        decision: "Increase sampling around the identified hotspot.",
        recommendation: "Verify the hotspot boundary by altering flight path.",
        source: "ANALYSIS / INFERENCE"
      };
    } else if (currentEvent.type === "SIMULATION_STARTED" || currentEvent.type === "SIMULATION_COMPLETED") {
      reasoning = {
        fact: "User requested closed-loop simulation of the recommended response.",
        inference: "Projected data indicates increased spatial coverage.",
        decision: "Validate the synthetic model.",
        recommendation: "If results are EFFECTIVE, execute in live environment.",
        source: "SIMULATION"
      };
    }
  }

  return (
    <>
      <div className="bg-surface-elevated border border-border rounded-lg shadow h-full flex flex-col">
        <div className="bg-surface-secondary border-b border-border p-3 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-sm tracking-widest uppercase text-text-primary flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-telemetry" /> Live Intelligence
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${riskLevel === 'NORMAL' ? 'bg-safe/10 text-safe' : 'bg-hazardous/10 text-hazardous'}`}>
            Risk: {riskLevel}
          </span>
        </div>

        <div className="p-4 flex flex-col gap-6 flex-1 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded border border-border p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Trend</div>
              <div className={`text-lg font-bold ${trend === 'INCREASING' ? 'text-warning' : 'text-safe'}`}>{trend}</div>
            </div>
            <div className="bg-background rounded border border-border p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Hotspots</div>
              <div className="text-lg font-bold text-hazardous">{hotspotsCount}</div>
            </div>
          </div>

          {/* Reasoning Chain */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted border-b border-border pb-1">Current Reasoning</h4>
            
            <div className="flex flex-col gap-3">
              <div className="pl-3 border-l-2 border-info">
                <div className="text-[10px] font-bold text-info tracking-wider mb-1">FACT</div>
                <div className="text-sm text-text-primary leading-tight">{reasoning.fact}</div>
              </div>
              
              <div className="pl-3 border-l-2 border-warning">
                <div className="text-[10px] font-bold text-warning tracking-wider mb-1">INFERENCE</div>
                <div className="text-sm text-text-primary leading-tight">{reasoning.inference}</div>
              </div>

              {hasDecision && (
                <>
                  <div className="pl-3 border-l-2 border-safe">
                    <div className="text-[10px] font-bold text-safe tracking-wider mb-1">DECISION</div>
                    <div className="text-sm text-text-primary leading-tight">{reasoning.decision}</div>
                  </div>
                  <div className="pl-3 border-l-2 border-telemetry">
                    <div className="text-[10px] font-bold text-telemetry tracking-wider mb-1">RECOMMENDATION ONLY</div>
                    <div className="text-sm text-text-primary leading-tight">{reasoning.recommendation}</div>
                  </div>
                </>
              )}
              
              {hasSimulation && (
                <div className="pl-3 border-l-2 border-fuchsia-400 bg-fuchsia-400/5 p-2 rounded-r">
                  <div className="text-[10px] font-bold text-fuchsia-400 tracking-wider mb-1">SIMULATION</div>
                  <div className="text-sm text-text-primary leading-tight">Synthetic response projection active.</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-4 border-t border-border">
            <button 
              onClick={() => setShowEvidence(true)}
              disabled={!currentEvent}
              className="w-full py-2 bg-surface-secondary hover:bg-surface-primary border border-border rounded flex items-center justify-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Explain This Event
            </button>
          </div>
        </div>
      </div>

      {showEvidence && currentEvent && (
        <ReplayEvidence 
          event={currentEvent} 
          reasoning={reasoning}
          onClose={() => setShowEvidence(false)} 
        />
      )}
    </>
  );
}
