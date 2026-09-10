import React from 'react';
import { Layers, MapPin } from 'lucide-react';

// Colour palette for per-city identification (cycles for > 5 cities)
const CITY_COLORS = [
  '#22d3ee', // cyan  (telemetry)
  '#f97316', // orange
  '#22c55e', // green
  '#a78bfa', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#38bdf8', // sky
];

export function cityColor(index) {
  return CITY_COLORS[index % CITY_COLORS.length];
}

/**
 * DatasetSelector — compact panel showing all loaded city/mission datasets.
 * Clicking a row makes it the active dataset (drives charts + panels).
 * All datasets remain in memory; switching never destroys data.
 */
export default function DatasetSelector({
  datasets,        // Array<{ missionId, cityLabel, telemetry, stats }>
  activeDatasetId,
  hoveredDatasetId,
  onSelect,        // (missionId) => void
}) {
  if (!datasets || datasets.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-secondary/50">
        <Layers className="w-3.5 h-3.5 text-telemetry" />
        <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
          Datasets
        </span>
        <span className="ml-auto text-[10px] font-mono text-text-muted">{datasets.length}</span>
      </div>

      {/* Dataset rows */}
      <div className="flex flex-col divide-y divide-border/50">
        {datasets.map((ds, idx) => {
          const color       = cityColor(idx);
          const isActive    = ds.missionId === activeDatasetId;
          const isHovered   = ds.missionId === hoveredDatasetId;
          const avgAQI      = ds.stats?.avg != null ? ds.stats.avg.toFixed(0) : '—';
          const count       = ds.telemetry?.length ?? 0;

          return (
            <button
              key={ds.missionId}
              onClick={() => onSelect(ds.missionId)}
              className={`
                flex items-center gap-2.5 px-3 py-2 text-left w-full transition-colors
                ${isActive
                  ? 'bg-surface-secondary'
                  : 'hover:bg-surface-secondary/50'}
                ${isHovered ? 'ring-1 ring-inset ring-border/60' : ''}
              `}
              title={ds.missionId}
            >
              {/* Colour dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/20"
                style={{ background: color }}
              />

              {/* City name + mission id */}
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[11px] font-bold truncate"
                  style={{ color: isActive ? color : undefined }}
                >
                  {ds.cityLabel}
                </span>
                <span className="text-[9px] font-mono text-text-muted truncate">
                  {ds.missionId}
                </span>
              </div>

              {/* Stats */}
              <div className="ml-auto flex flex-col items-end shrink-0">
                <span className="text-[10px] font-mono font-bold" style={{ color }}>
                  AQI {avgAQI}
                </span>
                <span className="text-[9px] text-text-muted font-mono flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {count}
                </span>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: color }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
