import React, { useMemo } from 'react';

const getSeverityColor = (severity) => {
  if (!severity) return '#EF4444';
  const s = severity.toLowerCase();
  if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
  if (s.includes('very poor') || s.includes('bad')) return '#EF4444';
  if (s.includes('poor')) return '#F97316';
  if (s.includes('moderate')) return '#EAB308';
  if (s.includes('satisfactory')) return '#84CC16';
  if (s.includes('good')) return '#22C55E';
  return '#EF4444';
};

const getAqiLabel = (val) => {
  if (val == null) return 'Unknown';
  if (val <= 50) return 'Good';
  if (val <= 100) return 'Moderate';
  if (val <= 200) return 'Poor';
  if (val <= 300) return 'Very Poor';
  return 'Hazardous';
};

export default function KeyInsights({ telemetry, stats, hotspots }) {
  const insights = useMemo(() => {
    const items = [];

    // 1. Highest Pollution Zone
    if (telemetry && telemetry.length > 0) {
      const maxAqiPoint = telemetry.reduce((prev, curr) => (curr.aqi > (prev.aqi || 0) ? curr : prev), {});
      if (maxAqiPoint && maxAqiPoint.aqi != null) {
        items.push({
          id: 'highest_zone',
          label: 'Highest Pollution Zone',
          value: `[${maxAqiPoint.latitude?.toFixed(4)}, ${maxAqiPoint.longitude?.toFixed(4)}]`,
          subtext: `AQI ${Math.round(maxAqiPoint.aqi)} — ${getAqiLabel(maxAqiPoint.aqi)}`
        });
      }
    }

    // 2. Peak AQI
    if (stats && stats.max_aqi != null) {
      items.push({
        id: 'peak_aqi',
        label: 'Peak AQI',
        value: Math.round(stats.max_aqi).toString(),
        subtext: getAqiLabel(stats.max_aqi)
      });
    }

    // 3. Hotspots Detected
    if (hotspots && hotspots.length > 0) {
      items.push({
        id: 'hotspots',
        label: 'Hotspots Detected',
        value: hotspots.length.toString(),
        subtext: `${hotspots.length} distinct pollution cluster${hotspots.length > 1 ? 's' : ''} identified`
      });
    }

    // 4. Sampling Priority (from IntelligencePanel logic)
    if (stats && stats.avg_aqi > 100) {
      items.push({
        id: 'sampling_priority',
        label: 'Sampling Priority',
        value: 'High-AQI Sector',
        subtext: 'Recommend intensified adaptive sampling'
      });
    } else if (stats) {
      items.push({
        id: 'sampling_priority',
        label: 'Sampling Priority',
        value: 'Routine Survey',
        subtext: 'Maintain standard spatial coverage'
      });
    }

    // 5. Dominant Pollutant (Estimate based on standard AQI breakdown, typically PM2.5 for this drone)
    if (stats && stats.avg_pm25 > 15) {
      items.push({
        id: 'dominant_pollutant',
        label: 'Dominant Pollutant',
        value: 'PM2.5',
        subtext: 'Primary driver of current AQI'
      });
    }

    return items;
  }, [telemetry, stats, hotspots]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-surface-primary border border-border rounded-lg shadow-sm flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-surface-secondary/30">
          <h2 className="text-sm font-bold tracking-widest text-text-primary uppercase">Key Insights</h2>
        </div>
        <div className="flex flex-col flex-1 p-2">
          {insights.length === 0 ? (
            <div className="p-4 text-xs text-text-muted italic">Insufficient data to generate insights.</div>
          ) : (
            insights.map((insight, idx) => (
              <React.Fragment key={insight.id}>
                <div className="flex flex-col py-3 px-3 hover:bg-surface-secondary/50 rounded transition-colors">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                    {idx + 1}. {insight.label}
                  </span>
                  <span className="text-lg font-mono font-bold text-text-primary leading-tight">
                    {insight.value}
                  </span>
                  {insight.subtext && (
                    <span className="text-xs text-text-secondary mt-1">
                      {insight.subtext}
                    </span>
                  )}
                </div>
                {idx < insights.length - 1 && <div className="h-px bg-border/50 mx-3" />}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {/* Hotspot Intelligence List */}
      {hotspots && hotspots.length > 0 && (
        <div className="bg-surface-primary border border-border rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[300px]">
          <div className="px-5 py-3 border-b border-border bg-surface-secondary/30">
            <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Hotspot Intelligence</h2>
          </div>
          <div className="flex flex-col flex-1 p-3 overflow-y-auto custom-scrollbar gap-2">
            {hotspots.map((hs, idx) => (
              <div key={idx} className="bg-surface-secondary/50 rounded border border-border p-3 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary uppercase tracking-wide text-xs">HS-{idx + 1}</span>
                    <span className="text-text-muted text-[10px]">{hs.reading_count} supporting readings</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getSeverityColor(hs.severity)}15`, color: getSeverityColor(hs.severity), border: `1px solid ${getSeverityColor(hs.severity)}30` }}>
                      AQI {Math.round(hs.peak_aqi)}
                    </span>
                    <span className="text-[9px] text-text-secondary mt-1 uppercase tracking-wider">{hs.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
