import React, { useState, useMemo } from 'react';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-elevated border border-border p-3 rounded shadow-lg text-xs font-mono">
        <p className="text-text-secondary mb-2 uppercase font-bold text-[10px] tracking-widest">Altitude: {data.altitude} m</p>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Severity:</span>
          <span className="font-bold uppercase" style={{ color: getSeverityColorHex(data.severity) }}>{data.severity}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Samples:</span>
          <span className="text-text-primary">{data.count}</span>
        </div>
        <div className="w-full h-px bg-border my-2"></div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">PM2.5:</span>
          <span className="text-text-primary">{data.pm25?.toFixed(1) || '--'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">PM10:</span>
          <span className="text-text-primary">{data.pm10?.toFixed(1) || '--'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">AQI:</span>
          <span className="text-text-primary">{data.aqi?.toFixed(0) || '--'}</span>
        </div>
      </div>
    );
  }
  return null;
};

const getSeverityColorHex = (severity) => {
  if (!severity) return '#64748B';
  const s = severity.toLowerCase();
  if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
  if (s.includes('very poor')) return '#EF4444';
  if (s.includes('poor')) return '#F97316';
  if (s.includes('moderate')) return '#EAB308';
  if (s.includes('satisfactory')) return '#84CC16';
  if (s.includes('good')) return '#22C55E';
  return '#64748B';
};

export default function PollutionAltitudeChart({ telemetry }) {
  const [metric, setMetric] = useState('pm25'); // pm25, pm10, aqi

  const data = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return [];
    
    // Group by 5m altitude buckets
    const BUCKET_SIZE = 5;
    const buckets = {};
    
    telemetry.forEach(t => {
      if (t.altitude == null) return;
      const bucket = Math.round(t.altitude / BUCKET_SIZE) * BUCKET_SIZE;
      if (!buckets[bucket]) {
        buckets[bucket] = { altitude: bucket, count: 0, pm25: 0, pm10: 0, aqi: 0 };
      }
      buckets[bucket].count++;
      buckets[bucket].pm25 += (t.pm25 || 0);
      buckets[bucket].pm10 += (t.pm10 || 0);
      buckets[bucket].aqi += (t.aqi || 0);
    });
    
    const aggregated = Object.values(buckets).map(b => ({
      ...b,
      pm25: b.pm25 / b.count,
      pm10: b.pm10 / b.count,
      aqi: b.aqi / b.count
    })).sort((a, b) => a.altitude - b.altitude);
    
    // Compute severity
    aggregated.forEach(b => {
      if (b.aqi > 200) b.severity = 'Severe';
      else if (b.aqi > 150) b.severity = 'Very Poor';
      else if (b.aqi > 100) b.severity = 'Poor';
      else if (b.aqi > 50) b.severity = 'Moderate';
      else b.severity = 'Good';
    });
    
    return aggregated;
  }, [telemetry]);

  if (!data || data.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
        <div className="text-text-secondary text-sm">Altitude measurements are unavailable.</div>
      </div>
    );
  }

  // To draw a nice line connecting the dots (trend line of altitude profile)
  // Recharts Line doesn't work well if Y is Altitude and X is Value, unless data is sorted by X. 
  // Wait, if it's a vertical profile, we want the line to connect ascending altitudes. 
  // We can use a composed chart with a line that has layout="vertical".
  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Pollution vs Altitude</h2>
          <p className="text-xs text-text-muted font-mono mt-1">Vertical Profile</p>
        </div>
        <div className="flex bg-surface-elevated rounded border border-border p-1 w-48">
          {['pm25', 'pm10', 'aqi'].map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`flex-1 text-xs font-bold uppercase tracking-wider py-1 rounded transition-colors ${metric === m ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
            >
              {m === 'pm25' ? 'PM2.5' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202B36" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              dataKey={metric} 
              stroke="#64748B" 
              fontSize={10} 
              tickMargin={10} 
              label={{ value: metric === 'pm25' ? 'PM2.5 (µg/m³)' : metric === 'pm10' ? 'PM10 (µg/m³)' : 'AQI', position: 'bottom', fill: '#64748B', fontSize: 10 }}
            />
            <YAxis 
              type="number" 
              dataKey="altitude" 
              stroke="#64748B" 
              fontSize={10} 
              tickFormatter={(val) => `${val}m`}
              label={{ value: 'Altitude', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 10 }}
            />
            <ZAxis type="number" dataKey="count" range={[40, 150]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
            
            <Line 
              type="monotone" 
              dataKey={metric} 
              stroke="#64748B" 
              strokeWidth={1} 
              dot={false} 
              isAnimationActive={false} 
              connectNulls={false}
            />
            <Scatter dataKey={metric} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSeverityColorHex(entry.severity)} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
