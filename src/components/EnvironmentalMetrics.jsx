import React from 'react';
import { Wind, Droplets, Thermometer, Activity } from 'lucide-react';

const getAqiColor = (val) => {
  if (val == null) return '#94A3B8';
  if (val <= 50) return '#22C55E';
  if (val <= 100) return '#EAB308';
  if (val <= 200) return '#F97316';
  if (val <= 300) return '#EF4444';
  return '#7F1D1D';
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
  if (val == null) return '--';
  if (isInteger) return Math.round(val).toString();
  return Number(val).toFixed(1);
};

export default function EnvironmentalMetrics({ stats, current }) {
  if (!stats) return null;

  // Use current values if available, otherwise fallback to stats averages
  const aqi = current?.aqi ?? stats.avg_aqi;
  const pm25 = current?.pm25 ?? stats.avg_pm25;
  const pm10 = current?.pm10 ?? stats.avg_pm10;
  const temp = current?.temperature ?? stats.avg_temperature;
  const hum = current?.humidity ?? stats.avg_humidity;
  
  // Gas measurements if available in data model
  const mq135 = current?.mq135 ?? stats.avg_mq135;
  const mq7 = current?.mq7 ?? stats.avg_mq7;

  const aqiColor = getAqiColor(aqi);
  const aqiLabel = getAqiLabel(aqi);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:flex w-full gap-4">
      {/* Primary Metric: AQI */}
      <div className="col-span-2 md:col-span-2 lg:flex-1 bg-surface-primary border border-border rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-w-[200px]">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold tracking-widest text-text-muted uppercase">Air Quality Index</span>
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
            style={{ backgroundColor: `${aqiColor}15`, color: aqiColor, border: `1px solid ${aqiColor}30` }}
          >
            {aqiLabel}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-mono font-bold leading-none text-text-primary">
            {formatNum(aqi)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-3 text-[10px]">
          <span className="text-text-muted uppercase tracking-wide">Peak Observed</span>
          <span className="font-mono font-bold text-text-secondary">{formatNum(stats.max_aqi, true)}</span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <MetricCard label="PM2.5" value={pm25} unit="µg/m³" status="Current" />
      <MetricCard label="PM10" value={pm10} unit="µg/m³" status="Current" />
      
      {mq135 != null && <MetricCard label="Gas (MQ-135)" value={mq135} unit="ppm" status="Current" />}
      {mq7 != null && <MetricCard label="Gas (MQ-7)" value={mq7} unit="ppm" status="Current" />}

      <MetricCard 
        label="Temperature" 
        value={temp} 
        unit="°C" 
        icon={<Thermometer className="w-3.5 h-3.5 text-text-muted" />} 
        status="Current" 
      />
      <MetricCard 
        label="Humidity" 
        value={hum} 
        unit="%" 
        icon={<Droplets className="w-3.5 h-3.5 text-text-muted" />} 
        status="Current" 
      />
    </div>
  );
}

function MetricCard({ label, value, unit, icon, status }) {
  return (
    <div className="bg-surface-primary border border-border rounded-lg p-4 shadow-sm flex flex-col justify-between flex-1 min-w-[140px]">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase flex items-center gap-1.5">
          {icon} {label}
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-mono font-bold text-text-primary leading-none">
            {formatNum(value)}
          </span>
          <span className="text-[10px] text-text-muted font-bold">{unit}</span>
        </div>
        {status && (
          <div className="mt-2 text-[10px] text-text-muted uppercase tracking-wide">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
