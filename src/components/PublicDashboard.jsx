import React, { useState, useEffect } from 'react';
import {
  getPublicOverview,
  getPublicMissions,
  getPublicMap,
  getPublicTrend,
  getPublicHotspots,
  askPublicAI
} from '../services/api';
import {
  Sparkles, Send, MapPin, Shield, Info, BookOpen, AlertTriangle,
  Clock, Globe, CloudRain, Thermometer, Wind, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const publicHotspotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getAQIColorClass = (aqi) => {
  if (!aqi) return 'text-text-muted border-border bg-surface-secondary';
  if (aqi <= 50) return 'text-safe border-safe bg-safe/10';
  if (aqi <= 100) return 'text-safe/80 border-safe/60 bg-safe/5';
  if (aqi <= 150) return 'text-warning border-warning bg-warning/10';
  if (aqi <= 200) return 'text-warning/80 border-warning/60 bg-warning/5';
  return 'text-danger border-danger bg-danger/10';
};

const CONFIDENCE_CONFIG = {
  high:   { color: 'text-safe',    bg: 'bg-safe/10',    border: 'border-safe/30',    icon: CheckCircle2 },
  medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: Info },
  low:    { color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/30',  icon: AlertTriangle },
};

export default function PublicDashboard() {
  // Global states
  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [overview, setOverview] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [hotspots, setHotspots] = useState([]);

  // AI assistant states
  const [question, setQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  // Suggested queries
  const suggestions = [
    "Is the AQI level dangerous?",
    "What does PM2.5 mean?",
    "Where was the highest pollution detected?",
    "Why does PM2.5 matter?"
  ];

  // Fetch initial missions and overview
  useEffect(() => {
    async function loadInitial() {
      try {
        const ov = await getPublicOverview();
        setOverview(ov);

        const mList = await getPublicMissions();
        setMissions(mList.items || []);
        if (mList.items && mList.items.length > 0) {
          setSelectedMissionId(mList.items[0].mission_id);
        }

        const hs = await getPublicHotspots();
        setHotspots(hs.items || []);
      } catch (err) {
        console.error("Error loading public data:", err);
      }
    }
    loadInitial();
  }, []);

  // Fetch selected mission details (map & trend)
  useEffect(() => {
    if (!selectedMissionId) return;

    async function loadMissionDetails() {
      try {
        const map = await getPublicMap(selectedMissionId);
        setMapData(map);

        const trend = await getPublicTrend(selectedMissionId);
        setTrendData(trend.trend || []);
      } catch (err) {
        console.error("Error loading mission details:", err);
      }
    }
    loadMissionDetails();
  }, [selectedMissionId]);

  const handleAsk = async (qText) => {
    const q = qText || question;
    if (!q.trim() || !selectedMissionId) return;

    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await askPublicAI(selectedMissionId, q);
      setAiResult(res);
    } catch (err) {
      console.error(err);
      setAiResult({
        answer: "Failed to query the AI assistant. Please try again later.",
        facts: [],
        inferences: [],
        recommendations: [],
        confidence: "low",
        knowledge_sources: []
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Center position helper for public map
  const mapCenter = mapData?.route && mapData.route.length > 0
    ? mapData.route[0]
    : [12.971598, 77.594562];

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/50 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-telemetry" />
              <h1 className="text-xl font-bold tracking-tight text-text-primary uppercase font-mono">FLUXX Community Portal</h1>
            </div>
            <p className="text-xs text-text-muted">Public-safe environmental quality and local drone-survey analytics.</p>
          </div>
          
          {/* Mission Switcher */}
          <div className="flex items-center gap-2 bg-surface-elevated border border-border px-3 py-1.5 rounded">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Select Survey:</span>
            <select
              value={selectedMissionId}
              onChange={e => setSelectedMissionId(e.target.value)}
              className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer font-mono font-bold"
            >
              {missions.map(m => (
                <option key={m.mission_id} value={m.mission_id} className="bg-surface-elevated text-text-primary">
                  {m.mission_id} ({new Date(m.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 1: Environmental status overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-surface-primary border border-border p-4 rounded-lg flex flex-col justify-between min-h-[100px]">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-telemetry" /> AQI
            </span>
            <div>
              <span className="text-3xl font-bold font-mono text-text-primary">{overview?.aqi || 'N/A'}</span>
              <span className={`text-[9px] font-mono font-bold ml-2 px-1.5 py-0.5 rounded border ${getAQIColorClass(overview?.aqi)}`}>
                {overview?.aqi_category || 'UNKNOWN'}
              </span>
            </div>
          </div>

          <div className="bg-surface-primary border border-border p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-warning" /> PM2.5
            </span>
            <div>
              <span className="text-2xl font-bold font-mono text-text-primary">
                {overview?.pm25 != null ? overview.pm25.toFixed(1) : 'N/A'}
              </span>
              <span className="text-[9px] font-mono text-text-muted ml-1">µg/m³</span>
            </div>
          </div>

          <div className="bg-surface-primary border border-border p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-warning/80" /> PM10
            </span>
            <div>
              <span className="text-2xl font-bold font-mono text-text-primary">
                {overview?.pm10 != null ? overview.pm10.toFixed(1) : 'N/A'}
              </span>
              <span className="text-[9px] font-mono text-text-muted ml-1">µg/m³</span>
            </div>
          </div>

          <div className="bg-surface-primary border border-border p-4 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-hazardous" /> Temp
            </span>
            <div>
              <span className="text-2xl font-bold font-mono text-text-primary">
                {overview?.temperature != null ? overview.temperature.toFixed(1) : 'N/A'}
              </span>
              <span className="text-[9px] font-mono text-text-muted ml-1">°C</span>
            </div>
          </div>

          <div className="bg-surface-primary border border-border p-4 rounded-lg flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-safe" /> Last Update
            </span>
            <div>
              <span className="text-xs font-mono text-text-secondary">
                {overview?.timestamp ? new Date(overview.timestamp).toLocaleString() : 'Waiting for connection...'}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: Map & Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaflet Map */}
          <div className="border border-border rounded-lg bg-surface-primary p-4 flex flex-col h-[400px]">
            <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-telemetry" /> Current Survey Map Overlay
            </h2>
            <div className="flex-1 rounded border border-border/50 overflow-hidden relative z-10">
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapData?.route && mapData.route.length > 0 && (
                  <Polyline positions={mapData.route} color="#00f3ff" weight={3} opacity={0.7} />
                )}
                {mapData?.points?.map((pt, idx) => (
                  <Circle
                    key={idx}
                    center={[pt.latitude, pt.longitude]}
                    radius={10}
                    pathOptions={{
                      color: pt.aqi > 150 ? '#ff0055' : pt.aqi > 100 ? '#ffaa00' : '#00e676',
                      fillColor: pt.aqi > 150 ? '#ff0055' : pt.aqi > 100 ? '#ffaa00' : '#00e676',
                      fillOpacity: 0.6
                    }}
                  />
                ))}
                {mapData?.hotspots?.map((hs, idx) => (
                  <Marker key={idx} position={[hs.latitude, hs.longitude]} icon={publicHotspotIcon}>
                    <Popup>
                      <div className="text-xs font-mono">
                        <p className="font-bold text-danger uppercase mb-1">Hotspot Area</p>
                        <p>Severity: {hs.severity}</p>
                        <p>Peak AQI: {hs.peak_aqi}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="border border-border rounded-lg bg-surface-primary p-4 flex flex-col h-[400px]">
            <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-warning" /> Survey Air Quality Trend
            </h2>
            <div className="flex-grow flex flex-col w-full min-h-[300px] mt-2">
              {trendData.length < 2 ? (
                <div className="flex-grow flex flex-col items-center justify-center border border-dashed border-border/40 rounded p-6">
                  <Info className="w-8 h-8 text-text-muted mb-2" />
                  <p className="text-xs font-mono text-text-muted text-center">
                    Insufficient time-series data to generate trend visualization.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="publicAqiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00f3ff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#666" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <YAxis stroke="#666" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181818', borderColor: '#2e2e2e', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                      labelFormatter={formatTime}
                    />
                    <Area type="monotone" dataKey="aqi" name="AQI" stroke="#00f3ff" strokeWidth={2} fillOpacity={1} fill="url(#publicAqiGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Hotspots and Grounded public AI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hotspots Card list */}
          <div className="md:col-span-1 border border-border rounded-lg bg-surface-primary p-4 flex flex-col gap-4">
            <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider border-b border-border/30 pb-2">
              Pollution Hotspots Detected
            </h2>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px] custom-scrollbar">
              {hotspots.length === 0 ? (
                <p className="text-xs text-text-muted font-mono italic">No hotspots detected in this zone.</p>
              ) : (
                hotspots.map((hs, idx) => (
                  <div key={idx} className="p-3 bg-surface-secondary border border-border/60 rounded flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Severity</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                        hs.severity === 'CRITICAL' ? 'bg-danger/20 border border-danger/40 text-danger' : 'bg-warning/20 border border-warning/40 text-warning'
                      }`}>
                        {hs.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-text-muted">Peak AQI:</span>
                      <span className="font-bold text-text-primary">{hs.peak_aqi}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                      <span>Radius: {hs.radius?.toFixed(0)}m</span>
                      <span>{new Date(hs.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ask FLUXX AI */}
          <div className="md:col-span-2 border border-border rounded-lg bg-surface-primary p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-telemetry animate-pulse" /> Ask Grounded FLUXX AI
              </h2>
              <span className="flex items-center gap-1 text-[9px] font-mono text-safe bg-safe/10 border border-safe/20 px-1.5 py-0.5 rounded">
                <Shield className="w-3 h-3" /> Grounded Only
              </span>
            </div>

            {/* Suggesions */}
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQuestion(s); handleAsk(s); }}
                  className="text-[10px] font-mono bg-surface-secondary border border-border hover:border-telemetry/50 text-text-secondary hover:text-text-primary px-2.5 py-1 rounded transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input query */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about air quality standards, PM2.5, or summaries..."
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                className="flex-1 bg-surface-elevated border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-telemetry font-mono"
              />
              <button
                onClick={() => handleAsk()}
                disabled={aiLoading || !question.trim()}
                className="bg-telemetry text-background font-bold text-xs uppercase tracking-wider px-4 py-2 rounded hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                {aiLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
                Ask
              </button>
            </div>

            {/* AI Result panel */}
            {aiResult && (
              <div className="bg-surface-elevated/40 border border-border rounded p-3 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border/20 pb-2">
                  <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Public-safe AI answer</span>
                  {aiResult.confidence && (
                    <span className={`flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      (CONFIDENCE_CONFIG[aiResult.confidence] || CONFIDENCE_CONFIG.medium).color
                    } ${(CONFIDENCE_CONFIG[aiResult.confidence] || CONFIDENCE_CONFIG.medium).bg} ${(CONFIDENCE_CONFIG[aiResult.confidence] || CONFIDENCE_CONFIG.medium).border}`}>
                      Confidence: {aiResult.confidence}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-primary leading-relaxed font-mono pl-2 border-l border-telemetry/40">
                  {aiResult.answer}
                </p>

                {/* Facts / Recommendations */}
                {(aiResult.facts?.length > 0 || aiResult.recommendations?.length > 0) && (
                  <div className="flex flex-col gap-1.5 bg-surface-secondary/50 p-2 rounded">
                    {aiResult.facts?.map((f, idx) => (
                      <p key={`f-${idx}`} className="text-[9px] font-mono text-text-secondary">• Fact: {f}</p>
                    ))}
                    {aiResult.recommendations?.map((r, idx) => (
                      <p key={`r-${idx}`} className="text-[9px] font-mono text-text-primary">• Rec: {r}</p>
                    ))}
                  </div>
                )}

                {/* Citations */}
                {aiResult.knowledge_sources?.length > 0 && (
                  <div className="border-t border-border/20 pt-2">
                    <button
                      onClick={() => setShowDocs(!showDocs)}
                      className="flex justify-between items-center w-full text-[9px] font-mono font-bold text-safe uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-safe" />
                        Approved References Cited ({aiResult.knowledge_sources.length})
                      </span>
                      {showDocs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    
                    {showDocs && (
                      <div className="flex flex-col gap-2 mt-2">
                        {aiResult.knowledge_sources.map((src, idx) => (
                          <div key={idx} className="p-2 bg-safe/5 border border-safe/20 rounded text-[9px] font-mono">
                            <p className="font-bold text-safe">{src.title}</p>
                            <p className="text-text-muted mt-0.5">Source: {src.source} {src.source_reference && `(${src.source_reference})`}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
