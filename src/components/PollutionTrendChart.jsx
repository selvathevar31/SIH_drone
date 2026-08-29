import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isHotspot = payload[0].payload.isHotspot;
    return (
      <div className={`bg-surface-elevated border ${isHotspot ? 'border-hazardous' : 'border-border'} p-3 rounded shadow-lg text-xs font-mono`}>
        <p className="text-text-secondary mb-2">{`Time: ${label}`}</p>
        {isHotspot && <p className="text-hazardous font-bold mb-2 uppercase">Hotspot Area</p>}
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="mb-1">
            {`${entry.name}: ${entry.value !== null ? Number(entry.value).toFixed(1) : '--'}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PollutionTrendChart({ trend, mission }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col items-center justify-center">
        <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
        <div className="text-text-secondary text-sm">Waiting for more readings to generate trend.</div>
      </div>
    );
  }

  // Find a hotspot timestamp for the reference line (first occurrence)
  const hotspotPoint = trend.find(p => p.isHotspot);

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Pollution Trend</h2>
        <p className="text-xs text-text-muted font-mono mt-1">Mission {mission?.mission_id}</p>
      </div>
      
      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#202B36" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickMargin={10} />
            <YAxis stroke="#64748B" fontSize={10} tickFormatter={(val) => val} />
            <Tooltip content={<CustomTooltip />} />
            
            {hotspotPoint && (
              <ReferenceLine 
                x={hotspotPoint.timestamp} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                label={{ position: 'insideTopLeft', value: 'HOTSPOT DETECTED', fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} 
              />
            )}
            
            <Area type="monotone" dataKey="aqi" name="AQI" stroke="#F97316" fillOpacity={1} fill="url(#colorAqi)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="pm25" name="PM2.5" stroke="#22D3EE" fillOpacity={1} fill="url(#colorPm25)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="pm10" name="PM10" stroke="#94A3B8" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
