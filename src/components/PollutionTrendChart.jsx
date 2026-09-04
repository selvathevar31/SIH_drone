import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isHotspot = payload[0].payload.isHotspot;
    return (
      <div className={`bg-surface-elevated border ${isHotspot ? 'border-hazardous' : 'border-border'} p-3 rounded shadow-lg text-xs font-mono`}>
        <p className="text-text-secondary mb-2">{`Time: ${label}`}</p>
        {isHotspot && <p className="text-hazardous font-bold mb-2 uppercase">Hotspot Area</p>}
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="mb-1 flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span className="font-bold">{entry.value !== null && entry.value !== undefined && !isNaN(entry.value) ? Number(entry.value).toFixed(1) : 'N/A'}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PollutionTrendChart({ telemetry, mission }) {
  const [metric, setMetric] = useState('all'); // pm25, pm10, aqi, all

  if (!telemetry || telemetry.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
        <div className="text-text-secondary text-sm">Waiting for more readings to generate trend.</div>
      </div>
    );
  }

  // Find a hotspot timestamp for the reference line (first occurrence)
  const hotspotPoint = telemetry.find(p => p.isHotspot);

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-5 h-full flex flex-col min-h-[300px]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Pollution Over Time</h2>
          <p className="text-xs text-text-muted font-mono mt-1">Mission {mission?.mission_id}</p>
        </div>
        
        <div className="flex bg-surface-elevated rounded border border-border p-1 w-64">
          {['pm25', 'pm10', 'aqi', 'all'].map(m => (
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
          <AreaChart data={telemetry} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPm10" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#202B36" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickMargin={10} />
            <YAxis 
              stroke="#64748B" 
              fontSize={10} 
              tickFormatter={(val) => val} 
              label={{ value: metric === 'pm25' || metric === 'pm10' ? 'µg/m³' : metric === 'aqi' ? 'Index' : 'Value', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '3 3' }} />
            
            {/* Visual Threshold Lines */}
            {(metric === 'aqi' || metric === 'all') && (
              <>
                <ReferenceLine y={100} stroke="#EAB308" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideTopRight', value: 'Moderate', fill: '#EAB308', fontSize: 9 }} />
                <ReferenceLine y={200} stroke="#F97316" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideTopRight', value: 'Poor', fill: '#F97316', fontSize: 9 }} />
              </>
            )}
            {(metric === 'pm25') && (
              <>
                <ReferenceLine y={60} stroke="#EAB308" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideTopRight', value: 'Moderate', fill: '#EAB308', fontSize: 9 }} />
                <ReferenceLine y={90} stroke="#F97316" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'insideTopRight', value: 'Poor', fill: '#F97316', fontSize: 9 }} />
              </>
            )}

            {hotspotPoint && (
              <ReferenceLine 
                x={hotspotPoint.timestamp} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                label={{ position: 'insideTopLeft', value: 'HOTSPOT DETECTED', fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} 
              />
            )}
            
            {(metric === 'all' || metric === 'aqi') && (
              <Area type="monotone" dataKey="aqi" name="AQI" stroke="#F97316" fillOpacity={1} fill="url(#colorAqi)" strokeWidth={2} isAnimationActive={false} connectNulls={false} />
            )}
            {(metric === 'all' || metric === 'pm25') && (
              <Area type="monotone" dataKey="pm25" name="PM2.5" stroke="#22D3EE" fillOpacity={1} fill="url(#colorPm25)" strokeWidth={2} isAnimationActive={false} connectNulls={false} />
            )}
            {(metric === 'all' || metric === 'pm10') && (
              <Area type="monotone" dataKey="pm10" name="PM10" stroke="#94A3B8" fillOpacity={metric === 'all' ? 0 : 1} fill={metric === 'all' ? "none" : "url(#colorPm10)"} strokeWidth={2} strokeDasharray={metric === 'all' ? "5 5" : ""} isAnimationActive={false} connectNulls={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
