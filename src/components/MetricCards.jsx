import React from 'react';
import { Wind, Droplets, Thermometer, ArrowUpToLine, Gauge, Activity } from 'lucide-react';

const getAqiColor = (val) => {
  if (val == null) return '#94A3B8';
  if (val <= 50) return '#22C55E';
  if (val <= 100) return '#84CC16'; 
  if (val <= 200) return '#EAB308'; 
  if (val <= 300) return '#F97316'; 
  if (val <= 400) return '#EF4444'; 
  return '#7F1D1D'; 
};

export default function MetricCards({ stats }) {
  if (!stats) return null;

  const aqiColor = getAqiColor(stats.avg_aqi);
  
  const formatNum = (val, isInteger = false) => {
    if (val == null) return '--';
    if (isInteger) return Math.round(val).toString();
    return Number(val).toFixed(1);
  };

  const getAqiLabel = (val) => {
    if (val == null) return 'N/A';
    if (val <= 50) return 'GOOD';
    if (val <= 100) return 'SATISFACTORY';
    if (val <= 200) return 'MODERATE';
    if (val <= 300) return 'POOR';
    if (val <= 400) return 'VERY POOR';
    return 'SEVERE';
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1 flex items-center gap-2 border-b border-border/50 pb-1">
        <Activity className="w-3 h-3 text-telemetry" /> Current Environment
      </h3>

      {/* Hero AQI Card */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface-elevated p-4 shadow-md flex-shrink-0">
        <div className="absolute inset-0 opacity-15" style={{ background: `radial-gradient(circle at top right, ${aqiColor}, transparent 70%)`}}></div>
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1">Average AQI</span>
          <div className="text-4xl font-mono font-bold leading-none mb-1" style={{ color: aqiColor }}>
            {formatNum(stats.avg_aqi)}
          </div>
          <span className="text-xs font-bold tracking-wider mb-2" style={{ color: aqiColor }}>
            {getAqiLabel(stats.avg_aqi)}
          </span>
          <div className="flex w-full justify-between border-t border-border/50 pt-2 text-[10px]">
            <span className="text-text-muted uppercase tracking-wide">Peak</span>
            <span className="font-mono font-bold text-text-primary">{formatNum(stats.max_aqi, true)}</span>
          </div>
        </div>
      </div>

      {/* Particulates Grid */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <div className="bg-surface-primary border border-border rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">PM2.5</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-mono font-bold text-text-primary leading-none">{formatNum(stats.avg_pm25)}</span>
            <span className="text-[9px] text-text-muted pb-0.5">µg/m³</span>
          </div>
        </div>
        <div className="bg-surface-primary border border-border rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">PM10</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-mono font-bold text-text-primary leading-none">{formatNum(stats.avg_pm10)}</span>
            <span className="text-[9px] text-text-muted pb-0.5">µg/m³</span>
          </div>
        </div>
      </div>

      {/* Telemetry List */}
      <div className="flex flex-col gap-1.5 flex-1 mt-1">
        <div className="bg-surface-primary border border-border rounded px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-text-secondary">
            <Thermometer className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Temp</span>
          </div>
          <span className="text-sm font-mono font-bold text-text-primary">{formatNum(stats.avg_temperature)}°C</span>
        </div>
        
        <div className="bg-surface-primary border border-border rounded px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-text-secondary">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Hum</span>
          </div>
          <span className="text-sm font-mono font-bold text-text-primary">{formatNum(stats.avg_humidity)}%</span>
        </div>
        
        <div className="bg-surface-primary border border-border rounded px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-text-secondary">
            <ArrowUpToLine className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Alt</span>
          </div>
          <span className="text-sm font-mono font-bold text-text-primary">{formatNum(stats.avg_altitude)}m</span>
        </div>

        <div className="bg-surface-primary border border-border rounded px-3 py-2 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-2 text-text-secondary">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Readings</span>
          </div>
          <span className="text-sm font-mono font-bold text-text-primary">{formatNum(stats.total_readings, true)}</span>
        </div>
      </div>
      
    </div>
  );
}
