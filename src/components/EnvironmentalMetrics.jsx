import React from 'react';
import { Wind, Droplets, Thermometer, Activity, TrendingUp, TrendingDown } from 'lucide-react';

const getAqiColor = (val) => {
  if (val == null) return '#94A3B8';
  if (val <= 50) return '#22C55E';
  if (val <= 100) return '#EAB308';
  if (val <= 200) return '#F97316';
  if (val <= 300) return '#EF4444';
  return '#991B1B';
};

const getAqiLabel = (val) => {
  if (val == null) return 'N/A';
  if (val <= 50) return 'GOOD';
  if (val <= 100) return 'MODERATE';
  if (val <= 200) return 'POOR';
  if (val <= 300) return 'VERY POOR';
  return 'SEVERE';
};

const formatNum = (val, isInteger = false) => {
  if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) return '--';
  const num = Number(val);
  if (isInteger) return Math.round(num).toString();
  return num.toFixed(1);
};

const getTrend = (telemetry, key) => {
  if (!telemetry || telemetry.length < 2) return null;
  const valid = telemetry.filter(t => t[key] !== null && t[key] !== undefined && t[key] !== '' && !Number.isNaN(Number(t[key])));
  if (valid.length < 2) return null;
  const current = Number(valid[valid.length - 1][key]);
  const previous = Number(valid[0][key]);
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return pct;
};

const Sparkline = ({ data, color }) => {
  const { areaPath, linePath, gradientId } = React.useMemo(() => {
    if (!data || data.length < 2) return { areaPath: null, linePath: null, gradientId: null };
    let validData = data.filter(d => d !== null && d !== undefined && d !== '' && !Number.isNaN(Number(d))).map(Number);
    if (validData.length < 2) return { areaPath: null, linePath: null, gradientId: null };

    // Downsample if there are too many points to avoid noise
    const MAX_POINTS = 30;
    if (validData.length > MAX_POINTS) {
      const step = Math.max(1, Math.floor(validData.length / MAX_POINTS));
      const downsampled = [];
      for (let i = 0; i < validData.length; i += step) {
        const chunk = validData.slice(i, i + step);
        if (chunk.length > 0) {
          downsampled.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
        }
      }
      validData = downsampled;
    }

    // Smooth out jagged lines slightly using a moving average
    const smoothedData = [];
    for (let i = 0; i < validData.length; i++) {
      const start = Math.max(0, i - 1);
      const end = Math.min(validData.length, i + 2);
      const window = validData.slice(start, end);
      smoothedData.push(window.reduce((a, b) => a + b, 0) / window.length);
    }
    validData = smoothedData;

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const padding = (max - min) * 0.1 || 1;
    const paddedMin = min - padding;
    const paddedMax = max + padding;
    const range = paddedMax - paddedMin;

    const coords = validData.map((d, i) => ({
      x: (i / (validData.length - 1)) * 100,
      y: 100 - ((d - paddedMin) / range) * 100
    }));

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ');
    const area = `${line} L 100,100 L 0,100 Z`;
    const grad = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

    return { areaPath: area, linePath: line, gradientId: grad };
  }, [data]);

  if (!areaPath) return null;

  return (
    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function EnvironmentalMetrics({ aqi, pm25, pm10, temp, hum, stats, telemetry = [] }) {
  const safeStats = stats || {};
  
  // Safe parsing for current values
  const safeAqi = (aqi === null || aqi === undefined || aqi === '' || Number.isNaN(Number(aqi))) ? null : Number(aqi);
  const aqiColor = getAqiColor(safeAqi);
  const aqiLabel = getAqiLabel(safeAqi);

  const aqiData = telemetry.map(t => t.aqi);
  const pm25Data = telemetry.map(t => t.pm25);
  const pm10Data = telemetry.map(t => t.pm10);
  const tempData = telemetry.map(t => t.temperature_C !== undefined ? t.temperature_C : t.temperature);
  const humData = telemetry.map(t => t.humidity_pct !== undefined ? t.humidity_pct : t.humidity);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full">
      
      {/* PRIMARY AQI CARD */}
      <div className="bg-surface-primary border border-border shadow-card rounded-[16px] p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-hazardous" />
            <span className="text-[11px] font-bold tracking-[0.1em] text-text-muted uppercase">Air Quality Index</span>
          </div>
          <span 
            className="text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest" 
            style={{ backgroundColor: `${aqiColor}15`, color: aqiColor }}
          >
            {aqiLabel}
          </span>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <div className="mb-1">
              <span className="text-4xl font-mono font-bold text-text-primary tracking-tight leading-none">
                {formatNum(aqi)}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary font-medium mt-1">
              Peak observed <b className="font-mono text-hazardous ml-1">{formatNum(safeStats.max_aqi, true)}</b>
            </div>
          </div>
          <div className="-mb-2 -mr-2 w-16 h-8 shrink-0">
            <Sparkline data={aqiData} color={aqiColor} />
          </div>
        </div>
      </div>

      {/* SECONDARY CARDS (PM2.5, PM10, Temp, Humidity) */}
      <MetricCard 
        label="PM2.5" 
        value={pm25} 
        unit="µg/m³" 
        icon={<div className="w-3.5 h-3.5 grid grid-cols-2 gap-0.5"><div className="bg-[#3B82F6] rounded-sm"/><div className="bg-[#3B82F6]/60 rounded-sm"/><div className="bg-[#3B82F6]/40 rounded-sm"/><div className="bg-[#3B82F6]/80 rounded-sm"/></div>} 
        trend={getTrend(telemetry, 'pm25')}
        sparklineData={pm25Data}
        sparklineColor="#3B82F6"
      />
      <MetricCard 
        label="PM10" 
        value={pm10} 
        unit="µg/m³" 
        icon={<div className="w-3.5 h-3.5 grid grid-cols-2 gap-0.5"><div className="bg-[#F5A623] rounded-sm"/><div className="bg-[#F5A623]/60 rounded-sm"/><div className="bg-[#F5A623]/80 rounded-sm"/><div className="bg-[#F5A623]/80 rounded-sm"/></div>} 
        trend={getTrend(telemetry, 'pm10')}
        sparklineData={pm10Data}
        sparklineColor="#F5A623"
      />
      <MetricCard 
        label="Temperature" 
        value={temp} 
        unit="°C" 
        icon={<Thermometer className="w-4 h-4 text-[#F97316]" />} 
        trend={getTrend(telemetry, 'temperature_C') || getTrend(telemetry, 'temperature')}
        sparklineData={tempData}
        sparklineColor="#F97316"
      />
      <MetricCard 
        label="Humidity" 
        value={hum} 
        unit="%" 
        icon={<Droplets className="w-4 h-4 text-[#8B5CF6]" />} 
        trend={getTrend(telemetry, 'humidity_pct') || getTrend(telemetry, 'humidity')}
        sparklineData={humData}
        sparklineColor="#8B5CF6"
      />
    </div>
  );
}

function MetricCard({ label, value, unit, icon, trend, sparklineData, sparklineColor }) {
  return (
    <div className="bg-surface-primary border border-border shadow-card rounded-[14px] p-5 flex flex-col justify-between hover:border-interactive hover:shadow-soft transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[12px] font-bold tracking-[0.1em] text-text-primary uppercase">
            {label}
          </span>
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-mono font-bold text-surface-dark tracking-tight">
            {formatNum(value)}
          </span>
          <span className="text-[12px] font-bold text-text-muted tracking-wide">
            {unit}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between w-full overflow-hidden gap-2">
          <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-bold shrink-0">
            Current
          </div>
          <div className="flex-1 min-w-[20px] h-8 flex justify-end items-end">
            <Sparkline data={sparklineData} color={sparklineColor} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {trend != null && (
              <span className={`flex items-center text-[10px] font-bold ${trend > 0 ? 'text-hazardous' : 'text-safe'}`}>
                {trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
