import React, { useMemo } from 'react';
import { AlertTriangle, Crosshair, BrainCircuit, Activity, Navigation, Wind } from 'lucide-react';

export default function IntelligencePanel({ telemetry, stats, hotspots, mission }) {
  // Derive AI Insights
  const insights = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return [];
    
    const items = [];
    const maxAqiPoint = telemetry.reduce((prev, curr) => (curr.aqi > (prev.aqi || 0) ? curr : prev), {});
    
    if (maxAqiPoint && maxAqiPoint.aqi > 100) {
      items.push({
        type: 'source',
        text: `Primary pollution source zone identified near [${maxAqiPoint.latitude?.toFixed(4)}, ${maxAqiPoint.longitude?.toFixed(4)}].`,
        color: 'text-poor'
      });
    }

    if (stats?.avg_aqi > 100) {
      items.push({
        type: 'recommendation',
        text: 'Recommend intensified adaptive sampling in the high-AQI sector.',
        color: 'text-telemetry'
      });
    }

    // Trend analysis (compare first half and second half)
    if (telemetry.length > 20) {
      const half = Math.floor(telemetry.length / 2);
      const firstHalf = telemetry.slice(0, half).reduce((sum, p) => sum + (p.aqi || 0), 0) / half;
      const secondHalf = telemetry.slice(half).reduce((sum, p) => sum + (p.aqi || 0), 0) / (telemetry.length - half);
      
      if (secondHalf > firstHalf * 1.2) {
        items.push({
          type: 'trend',
          text: 'AQI trend is significantly worsening along the current flight vector.',
          color: 'text-hazardous'
        });
      } else if (secondHalf < firstHalf * 0.8) {
        items.push({
          type: 'trend',
          text: 'AQI trend is improving; drone is exiting the pollution plume.',
          color: 'text-safe'
        });
      }
    }

    return items;
  }, [telemetry, stats]);

  const alerts = useMemo(() => {
    const list = [];
    if (stats?.max_aqi > 200) {
      list.push({ title: 'HAZARDOUS AQI DETECTED', desc: `Peak AQI reached ${Math.round(stats.max_aqi)}`, level: 'critical' });
    }
    if (hotspots && hotspots.length > 0) {
      list.push({ title: 'HOTSPOTS IDENTIFIED', desc: `${hotspots.length} distinct pollution clusters located.`, level: 'warning' });
    }
    if (!telemetry || telemetry.length === 0) {
      list.push({ title: 'NO TELEMETRY', desc: 'Awaiting sensor data stream.', level: 'info' });
    }
    return list;
  }, [stats, hotspots, telemetry]);

  const getSeverityColor = (severity) => {
    if (!severity) return '#EF4444';
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
    if (s.includes('very poor')) return '#EF4444';
    if (s.includes('poor')) return '#F97316';
    if (s.includes('moderate')) return '#EAB308';
    if (s.includes('satisfactory')) return '#84CC16';
    if (s.includes('good')) return '#22C55E';
    return '#EF4444';
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* MISSION PROGRESS */}
      <div className="bg-surface-primary border border-border rounded-lg p-3 shadow-md flex-shrink-0">
        <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2 border-b border-border/50 pb-1">
          <Navigation className="w-3 h-3 text-telemetry" /> Mission Progress
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-surface-secondary/50 p-2 rounded border border-border/50">
            <span className="text-text-muted uppercase text-[9px] font-bold tracking-widest mb-1">Samples</span>
            <span className="font-bold text-text-primary">{stats?.total_readings || 0}</span>
          </div>
          <div className="flex flex-col bg-surface-secondary/50 p-2 rounded border border-border/50">
            <span className="text-text-muted uppercase text-[9px] font-bold tracking-widest mb-1">Distance</span>
            <span className="font-bold text-text-primary">{mission?.distance_km ? `${mission.distance_km.toFixed(2)} km` : 'N/A'}</span>
          </div>
          <div className="flex flex-col bg-surface-secondary/50 p-2 rounded border border-border/50">
            <span className="text-text-muted uppercase text-[9px] font-bold tracking-widest mb-1">Duration</span>
            <span className="font-bold text-text-primary">{mission?.duration_sec ? `${Math.floor(mission.duration_sec / 60)}m ${mission.duration_sec % 60}s` : 'N/A'}</span>
          </div>
          <div className="flex flex-col bg-surface-secondary/50 p-2 rounded border border-border/50">
            <span className="text-text-muted uppercase text-[9px] font-bold tracking-widest mb-1">Battery</span>
            <span className="font-bold text-safe">{mission?.battery_level ? `${mission.battery_level}%` : 'N/A'}</span>
          </div>
        </div>
      </div>
      
      {/* AI INSIGHTS */}
      <div className="bg-surface-primary border border-border rounded-lg p-3 shadow-md flex-1">
        <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2 border-b border-border/50 pb-1">
          <BrainCircuit className="w-3 h-3 text-telemetry" /> AI Intelligence
        </h3>
        <div className="flex flex-col gap-2">
          {insights.length === 0 ? (
            <div className="text-xs text-text-muted italic">No anomalies detected.</div>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="bg-surface-secondary/50 rounded p-2 text-xs border border-border/30">
                <span className={`font-mono font-bold ${insight.color}`}>{`> `}</span>
                <span className="text-text-primary">{insight.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* HOTSPOTS */}
      <div className="bg-surface-primary border border-border rounded-lg p-3 shadow-md flex-1 overflow-y-auto max-h-[250px]">
        <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2 border-b border-border/50 pb-1">
          <Crosshair className="w-3 h-3 text-poor" /> Hotspot Intelligence
        </h3>
        {!hotspots || hotspots.length === 0 ? (
          <div className="text-xs text-text-muted italic text-center py-4">No significant hotspot detected</div>
        ) : (
          <div className="flex flex-col gap-2">
            {hotspots.map((hs, idx) => (
              <div key={idx} className="bg-surface-secondary rounded p-2 text-xs border border-border flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-primary uppercase tracking-wide">HS-{idx + 1}</span>
                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: getSeverityColor(hs.severity), color: '#fff' }}>
                    AQI: {Math.round(hs.peak_aqi)}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted text-[10px]">
                  <span>{hs.reading_count} supporting readings</span>
                  <span>{hs.severity}</span>
                </div>
                <div className="text-[10px] font-mono text-text-secondary">
                  [{hs.latitude?.toFixed(5)}, {hs.longitude?.toFixed(5)}]
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALERTS */}
      <div className="bg-surface-primary border border-border rounded-lg p-3 shadow-md">
        <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-2 flex items-center gap-2 border-b border-border/50 pb-1">
          <AlertTriangle className="w-3 h-3 text-hazardous" /> System Alerts
        </h3>
        <div className="flex flex-col gap-2">
          {alerts.length === 0 ? (
            <div className="text-xs text-text-muted italic">System Nominal</div>
          ) : (
            alerts.map((alert, idx) => (
              <div key={idx} className={`p-2 rounded text-xs border ${
                alert.level === 'critical' ? 'bg-hazardous/10 border-hazardous/30 text-hazardous' : 
                alert.level === 'warning' ? 'bg-poor/10 border-poor/30 text-poor' : 
                'bg-telemetry/10 border-telemetry/30 text-telemetry'
              }`}>
                <div className="font-bold uppercase tracking-wide">{alert.title}</div>
                <div className="opacity-80 mt-0.5">{alert.desc}</div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
