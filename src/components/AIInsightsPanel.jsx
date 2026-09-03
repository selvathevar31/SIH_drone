import React, { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ArrowRight, Eye } from 'lucide-react';
import { getMissions } from '../services/api';

// Simple API caller for intelligence endpoint
async function getMissionIntelligence(missionId) {
  const res = await fetch(`http://localhost:8000/api/missions/${missionId}/intelligence`);
  if (!res.ok) throw new Error("Failed to load intelligence summary");
  return res.json();
}

export default function AIInsightsPanel({ missionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    setError(null);
    getMissionIntelligence(missionId)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load environmental intelligence analysis.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [missionId]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 text-telemetry animate-spin mb-2" />
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Analyzing environmental signatures...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col items-center justify-center min-h-[300px]">
        <AlertTriangle className="w-6 h-6 text-warning mb-2" />
        <span className="text-xs font-mono text-text-muted">{error || "No data available."}</span>
      </div>
    );
  }

  const { summary, facts, inferences, recommendations, confidence } = data;

  const trendColor = 
    summary.overall_trend === 'increasing' ? 'text-hazardous bg-hazardous/10 border-hazardous/30' :
    summary.overall_trend === 'decreasing' ? 'text-safe bg-safe/10 border-safe/30' :
    'text-text-secondary bg-surface-secondary border-border';

  const riskColor = 
    summary.risk_level === 'CRITICAL' ? 'text-hazardous border-hazardous' :
    summary.risk_level === 'HIGH' ? 'text-warning border-warning' :
    'text-safe border-safe';

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col gap-5 min-h-[400px]">
      
      {/* Header */}
      <div className="border-b border-border/50 pb-3">
        <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-telemetry animate-pulse" />
          AI Environmental Intelligence
        </h2>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-surface-elevated border border-border rounded p-3 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest block mb-1">Risk Level</span>
          <span className={`text-xs font-bold font-mono uppercase border px-2 py-0.5 rounded mx-auto ${riskColor}`}>
            {summary.risk_level}
          </span>
        </div>
        <div className="bg-surface-elevated border border-border rounded p-3 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest block mb-1">Pollution Trend</span>
          <span className={`text-xs font-bold font-mono uppercase border px-2 py-0.5 rounded mx-auto ${trendColor}`}>
            {summary.overall_trend}
          </span>
        </div>
        <div className="bg-surface-elevated border border-border rounded p-3 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest block mb-1">Hotspots</span>
          <span className="text-lg font-bold font-mono text-text-primary">
            {summary.hotspot_count}
          </span>
        </div>
      </div>

      {/* Key Findings */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest block border-b border-border/30 pb-1">Key Findings</span>
        
        <div className="flex flex-col gap-2.5">
          {facts.map((fact, idx) => (
            <div key={`fact-${idx}`} className="flex justify-between items-start gap-4 bg-surface-secondary/30 p-2.5 rounded border border-border/40">
              <p className="text-xs font-mono text-text-secondary leading-relaxed">{fact}</p>
              <span className="text-[8px] font-mono font-bold bg-safe/10 border border-safe/30 text-safe px-1.5 py-0.5 rounded uppercase shrink-0">Fact</span>
            </div>
          ))}
          {inferences.map((inf, idx) => (
            <div key={`inf-${idx}`} className="flex justify-between items-start gap-4 bg-surface-secondary/30 p-2.5 rounded border border-border/40">
              <p className="text-xs font-mono text-text-secondary leading-relaxed">{inf}</p>
              <span className="text-[8px] font-mono font-bold bg-warning/10 border border-warning/30 text-warning px-1.5 py-0.5 rounded uppercase shrink-0">Inference</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Action */}
      <div className="flex flex-col gap-3 mt-auto">
        <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest block border-b border-border/30 pb-1">Recommended Action</span>
        
        <div className="flex flex-col gap-2.5">
          {recommendations.map((rec, idx) => (
            <div key={`rec-${idx}`} className="flex justify-between items-start gap-4 bg-telemetry/5 border border-telemetry/20 p-2.5 rounded">
              <p className="text-xs font-mono text-text-primary leading-relaxed">{rec}</p>
              <span className="text-[8px] font-mono font-bold bg-telemetry/10 border border-telemetry/30 text-telemetry px-1.5 py-0.5 rounded uppercase shrink-0 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> RECOMMENDATION ONLY</span>
            </div>
          ))}
          {recommendations.length === 0 && (
            <span className="text-xs font-mono text-text-muted italic">No immediate actions recommended.</span>
          )}
        </div>
      </div>

      {/* Footer Info & View Evidence */}
      <div className="border-t border-border/50 pt-3 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
          <span>Confidence Indicator: {(confidence * 100).toFixed(0)}%</span>
          <span>DataSource: {data.data_source}</span>
        </div>
        
        <button 
          onClick={() => setShowEvidence(!showEvidence)}
          className="w-full py-2 bg-surface-elevated hover:bg-surface-secondary border border-border text-xs font-mono text-text-primary rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          {showEvidence ? "Hide Evidence Data" : "View Supporting Evidence"}
        </button>

        {showEvidence && (
          <div className="p-3 bg-background rounded max-h-40 overflow-y-auto text-[9px] font-mono text-text-secondary whitespace-pre border border-border">
            {JSON.stringify({ facts, inferences, recommendations, summary }, null, 2)}
          </div>
        )}
      </div>
      
    </div>
  );
}
