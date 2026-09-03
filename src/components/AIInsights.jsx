import React, { useState, useEffect } from 'react';
import { queryAI, getAIInsights } from '../services/api';
import { Sparkles, Send, MapPin, Brain, ShieldAlert, Cpu } from 'lucide-react';

export default function AIInsights({ missionId, onLocateOnMap }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const suggestedQuestions = [
    "Where is pollution highest?",
    "What was the average AQI?",
    "How many hotspots were detected?",
    "Did pollution increase?",
    "What is the worst altitude?"
  ];

  // Fetch automatic insights on mission change
  useEffect(() => {
    if (!missionId) return;
    setInsightsLoading(true);
    getAIInsights(missionId)
      .then(res => {
        setInsights(res);
      })
      .catch(err => {
        console.error("Failed to load AI insights", err);
      })
      .finally(() => {
        setInsightsLoading(false);
      });
      
    // Reset query result when mission changes
    setResult(null);
    setQuestion('');
  }, [missionId]);

  const handleAsk = async (qText) => {
    const q = qText || question;
    if (!q.trim() || !missionId) return;
    
    setLoading(true);
    try {
      const res = await queryAI(missionId, q);
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult({
        query_type: "error",
        answer: "Failed to communicate with the environmental intelligence service. Please check backend connection.",
        confidence: "low",
        data_source: "System Error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col gap-5 min-h-[400px]">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-telemetry animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">AI Environmental Intelligence</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-telemetry/10 border border-telemetry/30 text-telemetry rounded-full text-[10px] font-mono uppercase tracking-wider font-bold">
          <Cpu className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> ENGINE ONLINE
        </div>
      </div>

      {/* Suggested & Question Input */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-text-muted uppercase font-mono tracking-widest">Ask about this mission...</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Where is PM2.5 highest?"
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              className="flex-1 bg-surface-elevated border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-telemetry font-mono"
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
              className="bg-telemetry text-background font-bold text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-telemetry-dark transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              ASK
            </button>
          </div>
        </div>

        {/* Suggested Queries */}
        <div>
          <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest block mb-1.5">Suggested:</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(q);
                  handleAsk(q);
                }}
                className="text-[10px] font-mono bg-surface-elevated border border-border/80 hover:border-telemetry/50 hover:text-text-primary text-text-muted px-2.5 py-1 rounded transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Query Result Box */}
      {result && (
        <div className="bg-surface-elevated/50 border border-border rounded p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start border-b border-border/30 pb-2">
            <div>
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest block">Result</span>
              <h3 className="text-xs font-bold font-mono text-text-primary uppercase tracking-wide">
                {result.query_type.replace('_', ' ')}
              </h3>
            </div>
            <div className="flex gap-2">
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${result.confidence === 'high' ? 'bg-safe/10 border border-safe/30 text-safe' : 'bg-warning/10 border border-warning/30 text-warning'}`}>
                Confidence: {result.confidence}
              </span>
            </div>
          </div>

          <div className="text-xs text-text-primary leading-relaxed font-mono">
            {result.answer}
          </div>

          {/* Supporting & Locations */}
          {Object.keys(result.supporting_values).length > 0 && (
            <div className="grid grid-cols-2 gap-2 bg-surface-secondary/40 p-2.5 rounded border border-border/30 text-[10px] font-mono">
              {Object.entries(result.supporting_values).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-border/20 py-1 last:border-b-0">
                  <span className="text-text-muted uppercase">{key.replace('_', ' ')}:</span>
                  <span className="font-bold text-text-primary">{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Map Location Integration */}
          {result.locations && result.locations.length > 0 && (
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
                <MapPin className="w-3.5 h-3.5 text-telemetry" />
                <span>Loc: {result.locations[0].latitude.toFixed(5)}, {result.locations[0].longitude.toFixed(5)}</span>
              </div>
              <button
                onClick={() => onLocateOnMap(result.locations[0])}
                className="text-[10px] bg-telemetry/15 hover:bg-telemetry/35 text-telemetry font-bold border border-telemetry/30 uppercase tracking-widest px-2.5 py-1 rounded transition-colors"
              >
                LOCATE ON MAP
              </button>
            </div>
          )}

          {/* Data Grounding */}
          <div className="text-[9px] font-mono text-text-muted border-t border-border/30 pt-2 flex flex-col gap-0.5">
            <span className="uppercase tracking-widest text-[8px]">Source:</span>
            <span className="text-text-secondary">{result.data_source}</span>
          </div>
        </div>
      )}

      {/* Automatic Insights */}
      <div className="mt-auto border-t border-border/50 pt-4">
        <h3 className="text-xs font-bold tracking-wider text-text-primary uppercase mb-3 flex items-center gap-1.5 font-mono">
          <Brain className="w-4 h-4 text-telemetry" /> Automated Insights
        </h3>
        
        {insightsLoading ? (
          <div className="text-center py-4 text-xs font-mono text-text-muted animate-pulse">
            Analyzing mission telemetry...
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-surface-elevated/40 border border-border/80 rounded p-3 hover:border-telemetry/20 transition-all">
                <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-telemetry mb-1">
                  {idx + 1}. {insight.title}
                </h4>
                <p className="text-xs font-mono text-text-secondary">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs font-mono text-text-muted italic">
            No insights available.
          </div>
        )}
      </div>

    </div>
  );
}
