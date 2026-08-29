import React from 'react';

const Card = ({ title, value, unit, status, statusColor, isMain }) => (
  <div className={`p-4 rounded-lg border border-border bg-surface-primary hover:bg-surface-elevated transition-colors flex flex-col justify-between ${isMain ? 'ring-1 ring-border shadow-md bg-surface-elevated' : ''}`}>
    <h3 className="text-text-muted text-xs font-semibold tracking-wider uppercase mb-2">{title}</h3>
    <div className="flex items-end gap-1 mb-3">
      <span className={`font-mono font-bold ${isMain ? 'text-4xl' : 'text-2xl'} text-text-primary leading-none`}>
        {value !== null && value !== undefined ? value : '--'}
      </span>
      <span className="text-text-muted text-sm font-mono pb-0.5">{unit}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold tracking-wide uppercase" style={{ color: statusColor || '#94A3B8' }}>
        {status || 'UNAVAILABLE'}
      </span>
    </div>
  </div>
);

const getAqiColor = (category) => {
  if (!category) return '#94A3B8';
  const c = category.toLowerCase();
  if (c === 'good') return '#22C55E';
  if (c === 'satisfactory') return '#84CC16'; // Yellow-green
  if (c === 'moderately polluted') return '#EAB308'; // Yellow
  if (c === 'poor') return '#F97316'; // Orange
  if (c === 'very poor') return '#EF4444'; // Red
  if (c === 'severe') return '#7F1D1D'; // Dark red
  return '#94A3B8';
};

const getPm25Status = (val) => {
  if (val == null) return null;
  if (val <= 60) return { label: 'GOOD', color: '#22C55E'};
  if (val <= 120) return { label: 'MODERATE', color: '#EAB308'};
  return { label: 'HIGH', color: '#EF4444'};
};

const getPm10Status = (val) => {
  if (val == null) return null;
  if (val <= 100) return { label: 'GOOD', color: '#22C55E'};
  if (val <= 250) return { label: 'MODERATE', color: '#EAB308'};
  return { label: 'HIGH', color: '#EF4444'};
};

export default function MetricCards({ data }) {
  if (!data) return null;

  const aqiColor = getAqiColor(data.aqi_category);
  const pm25Stat = getPm25Status(data.pm25);
  const pm10Stat = getPm10Status(data.pm10);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-lg">
        {/* Subtle background glow for AQI */}
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${aqiColor}, transparent 70%)`}}></div>
        <Card 
          title="AQI" 
          value={data.aqi} 
          unit="" 
          status={data.aqi_category} 
          statusColor={aqiColor} 
          isMain={true}
        />
      </div>
      <Card 
        title="PM2.5" 
        value={data.pm25} 
        unit="µg/m³" 
        status={pm25Stat?.label} 
        statusColor={pm25Stat?.color} 
      />
      <Card 
        title="PM10" 
        value={data.pm10} 
        unit="µg/m³" 
        status={pm10Stat?.label} 
        statusColor={pm10Stat?.color} 
      />
      <Card 
        title="Temperature" 
        value={data.temperature ? data.temperature.toFixed(1) : null} 
        unit="°C" 
        status={data.temperature != null ? "NORMAL" : null} 
        statusColor="#22C55E" 
      />
      <Card 
        title="Humidity" 
        value={data.humidity ? data.humidity.toFixed(1) : null} 
        unit="%" 
        status={data.humidity != null ? "NORMAL" : null} 
        statusColor="#22C55E" 
      />
    </div>
  );
}
