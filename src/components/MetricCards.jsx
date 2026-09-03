import React from 'react';

const Card = ({ title, value, unit, secondaryLabel, secondaryValue, isMain, color }) => (
  <div className={`p-4 rounded-lg border border-border bg-surface-primary hover:bg-surface-elevated transition-colors flex flex-col justify-between ${isMain ? 'ring-1 ring-border shadow-md bg-surface-elevated' : ''}`}>
    <h3 className="text-text-muted text-xs font-semibold tracking-wider uppercase mb-2">{title}</h3>
    <div className="flex items-end gap-1 mb-3">
      <span className={`font-mono font-bold ${isMain ? 'text-4xl' : 'text-2xl'} text-text-primary leading-none`}>
        {value !== null && value !== undefined ? value : '--'}
      </span>
      <span className="text-text-muted text-sm font-mono pb-0.5">{unit}</span>
    </div>
    {(secondaryLabel || secondaryValue) && (
      <div className="flex items-center justify-between border-t border-border pt-2 mt-auto">
        <span className="text-[10px] font-bold tracking-wide uppercase text-text-muted">
          {secondaryLabel}
        </span>
        <span className="text-xs font-mono font-bold" style={{ color: color || '#94A3B8' }}>
          {secondaryValue !== null && secondaryValue !== undefined ? secondaryValue : '--'}
        </span>
      </div>
    )}
  </div>
);

const getAqiColor = (val) => {
  if (val == null) return '#94A3B8';
  if (val <= 50) return '#22C55E';
  if (val <= 100) return '#84CC16'; // Yellow-green
  if (val <= 200) return '#EAB308'; // Yellow
  if (val <= 300) return '#F97316'; // Orange
  if (val <= 400) return '#EF4444'; // Red
  return '#7F1D1D'; // Dark red
};

export default function MetricCards({ stats }) {
  if (!stats) return null;

  const aqiColor = getAqiColor(stats.avg_aqi);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {/* PRIMARY */}
      <div className="col-span-2 relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${aqiColor}, transparent 70%)`}}></div>
        <Card 
          title="Average AQI" 
          value={stats.avg_aqi} 
          unit="" 
          secondaryLabel="Maximum AQI"
          secondaryValue={stats.max_aqi}
          color={getAqiColor(stats.max_aqi)}
          isMain={true}
        />
      </div>
      
      <div className="col-span-2 lg:col-span-1">
        <Card 
          title="PM2.5" 
          value={stats.avg_pm25} 
          unit="µg/m³" 
          secondaryLabel="Max"
          secondaryValue={stats.max_pm25}
        />
      </div>
      
      <div className="col-span-2 lg:col-span-1">
        <Card 
          title="PM10" 
          value={stats.avg_pm10} 
          unit="µg/m³" 
          secondaryLabel="Max"
          secondaryValue={stats.max_pm10}
        />
      </div>

      {/* SECONDARY */}
      <div className="col-span-1 lg:col-span-1">
        <Card 
          title="Hotspots" 
          value={stats.hotspot_count} 
          unit="" 
          secondaryLabel="Readings"
          secondaryValue={stats.total_readings}
        />
      </div>
      
      <div className="col-span-1 lg:col-span-1 flex flex-col gap-2">
        {/* Tiny cards for environment */}
        <div className="flex-1 rounded border border-border bg-surface-primary p-2 flex justify-between items-center">
          <span className="text-[10px] uppercase text-text-muted font-bold">Temp</span>
          <span className="text-xs font-mono">{stats.avg_temperature != null ? `${stats.avg_temperature.toFixed(1)}°C` : '--'}</span>
        </div>
        <div className="flex-1 rounded border border-border bg-surface-primary p-2 flex justify-between items-center">
          <span className="text-[10px] uppercase text-text-muted font-bold">Hum</span>
          <span className="text-xs font-mono">{stats.avg_humidity != null ? `${stats.avg_humidity.toFixed(1)}%` : '--'}</span>
        </div>
        <div className="flex-1 rounded border border-border bg-surface-primary p-2 flex justify-between items-center">
          <span className="text-[10px] uppercase text-text-muted font-bold">Alt</span>
          <span className="text-xs font-mono">{stats.avg_altitude != null ? `${stats.avg_altitude.toFixed(1)}m` : '--'}</span>
        </div>
      </div>
    </div>
  );
}
