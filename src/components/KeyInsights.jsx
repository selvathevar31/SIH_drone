import React, { useMemo } from 'react';
import { Target, BarChart2, Radio, ArrowUpRight, Wind, ChevronRight, TrendingUp } from 'lucide-react';

const getSeverityColor = (severity) => {
  if (!severity) return '#EF4444';
  const s = severity.toLowerCase();
  if (s.includes('severe') || s.includes('hazardous')) return '#991B1B';
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
          subtext: `AQI ${Math.round(maxAqiPoint.aqi)} — ${getAqiLabel(maxAqiPoint.aqi)}`,
          icon: <Target className="w-4 h-4 text-hazardous" />,
          actionIcon: <Target className="w-3 h-3 text-telemetry" />,
          isCritical: maxAqiPoint.aqi > 200
        });
      }
    }

    // 2. Peak AQI
    if (stats && stats.max_aqi != null) {
      items.push({
        id: 'peak_aqi',
        label: 'Peak AQI',
        value: Math.round(stats.max_aqi).toString(),
        subtext: getAqiLabel(stats.max_aqi),
        icon: <BarChart2 className="w-4 h-4 text-hazardous" />,
        actionIcon: <TrendingUp className="w-3 h-3 text-hazardous" />
      });
    }

    // 3. Hotspots Detected
    if (hotspots && hotspots.length > 0) {
      items.push({
        id: 'hotspots',
        label: 'Hotspots Detected',
        value: hotspots.length.toString(),
        subtext: `${hotspots.length} distinct pollution cluster${hotspots.length > 1 ? 's' : ''} identified`,
        icon: <Radio className="w-4 h-4 text-telemetry" />,
        actionIcon: <Radio className="w-3 h-3 text-telemetry" />
      });
    }

    // 4. Sampling Priority
    if (stats && stats.avg_aqi > 100) {
      items.push({
        id: 'sampling_priority',
        label: 'Sampling Priority',
        value: 'High-AQI Sector',
        subtext: 'Recommend intensified adaptive sampling',
        icon: <ArrowUpRight className="w-4 h-4 text-telemetry" />,
        actionIcon: <ArrowUpRight className="w-3 h-3 text-telemetry" />
      });
    } else if (stats) {
      items.push({
        id: 'sampling_priority',
        label: 'Sampling Priority',
        value: 'Routine Survey',
        subtext: 'Maintain standard spatial coverage',
        icon: <ArrowUpRight className="w-4 h-4 text-safe" />,
        actionIcon: <ChevronRight className="w-3 h-3 text-text-muted" />
      });
    }

    // 5. Dominant Pollutant
    if (stats && stats.avg_pm25 > 15) {
      items.push({
        id: 'dominant_pollutant',
        label: 'Dominant Pollutant',
        value: 'PM2.5',
        subtext: 'Primary driver of current AQI',
        icon: <Wind className="w-4 h-4 text-telemetry" />,
        actionIcon: <BarChart2 className="w-3 h-3 text-telemetry" />
      });
    }

    return items;
  }, [telemetry, stats, hotspots]);

  return (
    <div className="bg-surface-primary border border-border shadow-card rounded-[16px] h-full flex flex-col overflow-hidden">
      
      {/* Panel Header */}
      <div className="px-6 py-5 border-b border-border bg-surface-primary">
        <h2 className="text-[12px] font-bold tracking-[0.15em] text-surface-dark uppercase mb-1">Key Insights</h2>
        <p className="text-[10px] font-medium text-text-secondary tracking-wide">
          Spatial intelligence from this mission
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
        {insights.length === 0 ? (
          <div className="text-[11px] text-text-muted italic">Insufficient data to generate insights.</div>
        ) : (
          insights.map((insight, idx) => (
            <React.Fragment key={insight.id}>
              <div className="flex items-start justify-between group">
                <div className="flex items-start gap-4">
                  <span className="text-[12px] font-mono font-bold text-telemetry pt-0.5 w-4">0{idx + 1}</span>
                  <div className="pt-0.5">{insight.icon}</div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold tracking-widest text-text-muted uppercase mb-2">
                      {insight.label}
                    </span>
                    <span className="text-[16px] font-mono font-bold text-surface-dark leading-tight tracking-tight mb-1.5 flex items-center gap-2">
                      {insight.value}
                    </span>
                    {insight.subtext && (
                      <span className="text-[11px] font-medium text-text-secondary leading-relaxed flex items-center gap-2">
                        {insight.subtext}
                        {insight.isCritical && (
                          <span className="px-1.5 py-0.5 rounded-sm bg-hazardous/10 text-hazardous text-[9px] uppercase tracking-widest">Critical</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-md bg-surface-secondary flex items-center justify-center shrink-0">
                  {insight.actionIcon}
                </div>
              </div>
              {idx < insights.length - 1 && <div className="h-px w-full bg-border/50" />}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
