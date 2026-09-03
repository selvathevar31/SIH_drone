import React, { useState } from 'react';
import { queryAI } from '../services/api';
import {
  Sparkles, Send, MapPin, 
  FlaskConical, ArrowRight, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';

const CONFIDENCE_CONFIG = {
  high:   { color: 'text-safe',    bg: 'bg-safe/10',    border: 'border-safe/30',    icon: CheckCircle2 },
  medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: Info },
  low:    { color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/30',  icon: AlertTriangle },
};

const INTENT_LABELS = {
  highest_aqi:             'DATA · Highest AQI',
  average_aqi:             'DATA · Average AQI',
  highest_pm25:            'DATA · Highest PM2.5',
  average_pm25:            'DATA · Average PM2.5',
  highest_pm10:            'DATA · Highest PM10',
  average_pm10:            'DATA · Average PM10',
  pollution_by_altitude:   'DATA · Altitude Profile',
  pollution_trend:         'DATA · Pollution Trend',
  hotspot_analysis:        'DATA · Hotspot Analysis',
  highest_hotspot:         'DATA · Worst Hotspot',
  hotspot_count:           'DATA · Hotspot Count',
  mission_summary:         'DATA · Mission Summary',
  mission_comparison:      'DATA · Historical Comparison',
  data_plus_knowledge:     'HYBRID · Data + Standards',
  environmental_explanation: 'KNOWLEDGE · Environmental Reference',
  unknown:                 'UNKNOWN · Unsupported Query',
};

const PIPELINE_STEPS = [
  { key: 'question',  label: 'QUESTION',  icon: '❓' },
  { key: 'data',      label: 'DB RETRIEVAL', icon: '🗄️' },
  { key: 'knowledge', label: 'KNOWLEDGE',  icon: '📚' },
  { key: 'evidence',  label: 'EVIDENCE',   icon: '🔬' },
  { key: 'answer',    label: 'ANSWER',     icon: '✅' },
];

export default function AIAssistant({ missionId, onLocateOnMap }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showDataEvidence, setShowDataEvidence] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [activeCategory, setActiveCategory] = useState('DATA');

  const categories = {
    DATA: [
      'Where was the highest PM2.5 recorded?',
      'What was the highest AQI?',
      'How many hotspots were detected?',
    ],
    ANALYZE: [
      'Is pollution increasing or decreasing?',
      'How does PM2.5 change with altitude?',
      'Summarize this mission.',
    ],
    HYBRID: [
      'Is the highest PM2.5 recorded in this mission concerning?',
      'Is the AQI level dangerous?',
      'Should we be worried about the pollution levels?',
    ],
    EXPLAIN: [
      'What does PM2.5 mean?',
      'What is AQI?',
      'Why does PM2.5 matter?',
    ],
    COMPARE: [
      'Compare this mission with the previous survey.',
      'Is this mission worse than the previous one?',
    ],
  };

  const handleAsk = async (qText) => {
    const q = qText || question;
    if (!q.trim() || !missionId) return;

    setLoading(true);
    setShowDataEvidence(false);
    setShowKnowledge(false);
    try {
      const res = await queryAI(missionId, q);
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult({
        intent: 'error',
        answer: 'Failed to communicate with the AI service. Please check backend connection.',
        confidence: 0,
        confidence_label: 'low',
        data_source: 'System Error',
        evidence: [],
        knowledge_sources: [],
        facts: [],
        inferences: [],
        recommendations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine pipeline trace state from result
  const activePipelineSteps = result ? {
    question:  true,
    data:      result.evidence?.length > 0,
    knowledge: result.knowledge_sources?.length > 0,
    evidence:  result.evidence?.length > 0 || result.knowledge_sources?.length > 0,
    answer:    !!result.answer,
  } : {};

  const confCfg = result
    ? (CONFIDENCE_CONFIG[result.confidence_label] || CONFIDENCE_CONFIG.medium)
    : null;

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col gap-4 min-h-[400px]">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-telemetry animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">
            Grounded AI Assistant
          </h2>
        </div>
        <span className="text-[9px] font-mono text-text-muted border border-border/30 px-1.5 py-0.5 rounded uppercase tracking-widest">
          RAG v2
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex border-b border-border/30 gap-1 pb-1 flex-wrap">
          {Object.keys(categories).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider rounded transition-colors ${
                activeCategory === cat
                  ? 'bg-telemetry text-background shadow'
                  : 'bg-surface-secondary text-text-muted hover:text-text-primary border border-border/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories[activeCategory].map((q, idx) => (
            <button
              key={idx}
              onClick={() => { setQuestion(q); handleAsk(q); }}
              className="text-[10px] font-mono bg-surface-elevated border border-border/80 hover:border-telemetry/50 hover:text-text-primary text-text-muted px-2.5 py-1 rounded transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-text-muted uppercase font-mono tracking-widest">Ask a custom question...</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Is the pollution level dangerous?"
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              className="flex-1 bg-surface-elevated border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-telemetry font-mono"
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
              className="bg-telemetry text-background font-bold text-xs uppercase tracking-wider px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
            >
              {loading
                ? <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
              ASK
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface-elevated/50 border border-border rounded flex flex-col overflow-hidden">

          {/* Pipeline Trace Banner */}
          <div className="flex items-center gap-0 px-3 py-2 bg-surface-secondary/60 border-b border-border/40 overflow-x-auto">
            {PIPELINE_STEPS.map((step, idx) => (
              <React.Fragment key={step.key}>
                <div className={`flex items-center gap-1 shrink-0 transition-all ${
                  activePipelineSteps[step.key]
                    ? 'text-telemetry opacity-100'
                    : 'text-text-muted opacity-30'
                }`}>
                  <span className="text-[10px]">{step.icon}</span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider">{step.label}</span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight className={`w-2.5 h-2.5 mx-1 shrink-0 ${
                    activePipelineSteps[step.key] ? 'text-telemetry/60' : 'text-border'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Intent + Confidence */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest block">Detected Intent</span>
                <h3 className="text-xs font-bold font-mono text-text-primary">
                  {INTENT_LABELS[result.intent] || result.intent?.replace(/_/g, ' ').toUpperCase()}
                </h3>
              </div>
              {confCfg && (
                <span className={`flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${confCfg.color} ${confCfg.bg} ${confCfg.border}`}>
                  <confCfg.icon className="w-3 h-3" />
                  {(result.confidence_label || 'N/A').toUpperCase()}
                  {result.confidence != null && ` · ${(result.confidence * 100).toFixed(0)}%`}
                </span>
              )}
            </div>

            {/* Answer */}
            <div className="text-sm text-text-primary leading-relaxed font-mono border-l-2 border-telemetry/40 pl-3">
              {result.answer}
            </div>

            {/* Facts / Inferences / Recommendations */}
            {(result.facts?.length > 0 || result.inferences?.length > 0 || result.recommendations?.length > 0) && (
              <div className="flex flex-col gap-1.5 bg-surface-secondary/40 p-3 rounded border border-border/30">
                {result.facts?.map((fact, idx) => (
                  <div key={`fact-${idx}`} className="flex justify-between items-start gap-3">
                    <p className="text-[10px] font-mono text-text-secondary leading-relaxed">{fact}</p>
                    <span className="text-[8px] font-mono font-bold bg-safe/10 border border-safe/30 text-safe px-1.5 py-0.5 rounded uppercase shrink-0">FACT</span>
                  </div>
                ))}
                {result.inferences?.map((inf, idx) => (
                  <div key={`inf-${idx}`} className="flex justify-between items-start gap-3 border-t border-border/20 pt-1.5">
                    <p className="text-[10px] font-mono text-text-secondary leading-relaxed">{inf}</p>
                    <span className="text-[8px] font-mono font-bold bg-warning/10 border border-warning/30 text-warning px-1.5 py-0.5 rounded uppercase shrink-0">INFERENCE</span>
                  </div>
                ))}
                {result.recommendations?.map((rec, idx) => (
                  <div key={`rec-${idx}`} className="flex justify-between items-start gap-3 border-t border-border/20 pt-1.5">
                    <p className="text-[10px] font-mono text-text-primary leading-relaxed">{rec}</p>
                    <span className="text-[8px] font-mono font-bold bg-telemetry/10 border border-telemetry/30 text-telemetry px-1.5 py-0.5 rounded uppercase shrink-0">ACTION</span>
                  </div>
                ))}
              </div>
            )}

            {/* Map Location */}
            {result.evidence?.length > 0 && result.evidence[0].latitude && (
              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
                  <MapPin className="w-3 h-3 text-telemetry" />
                  <span>Peak: {result.evidence[0].latitude?.toFixed(5)}, {result.evidence[0].longitude?.toFixed(5)}</span>
                </div>
                <button
                  onClick={() => onLocateOnMap({ latitude: result.evidence[0].latitude, longitude: result.evidence[0].longitude })}
                  className="text-[10px] bg-telemetry/15 hover:bg-telemetry/35 text-telemetry font-bold border border-telemetry/30 uppercase tracking-widest px-2.5 py-1 rounded transition-colors"
                >
                  LOCATE ON MAP
                </button>
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
}
