import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    let timeLabel = label;
    try {
      if (label && !isNaN(new Date(label).getTime())) {
        timeLabel = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch(e) {}

    return (
      <div className="bg-surface-elevated border border-border p-3 rounded-lg shadow-lg text-xs font-mono min-w-[120px]">
        <p className="text-text-secondary font-bold mb-2 pb-2 border-b border-border/50 text-center">{timeLabel}</p>
        {payload.map((entry, index) => (
          <p key={index} className="mb-1 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-text-muted">{entry.name}:</span>
            </span>
            <span className="font-bold text-text-primary">
              {entry.value !== null && entry.value !== undefined && !isNaN(entry.value) ? Number(entry.value).toFixed(0) : 'N/A'}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PollutionTrendChart({ data }) {
  const [range, setRange] = useState('ALL');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];
    if (range !== 'ALL' && filtered.length > 0) {
      // Find the latest timestamp to anchor the filter
      const latestTime = Math.max(...filtered.map(d => new Date(d.timestamp).getTime()));
      
      let cutoffMs = 0;
      if (range === '1H') cutoffMs = 1 * 60 * 60 * 1000;
      else if (range === '6H') cutoffMs = 6 * 60 * 60 * 1000;
      else if (range === '12H') cutoffMs = 12 * 60 * 60 * 1000;
      else if (range === '24H') cutoffMs = 24 * 60 * 60 * 1000;
      
      const threshold = latestTime - cutoffMs;
      filtered = filtered.filter(d => new Date(d.timestamp).getTime() >= threshold);
    }
    
    // Format timestamps for X-axis display
    return filtered.map(d => ({
      ...d,
      timeLabel: d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    }));
  }, [data, range]);

  return (
    <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollution Trend</h3>
          <p className="text-text-secondary text-xs">AQI variation over time</p>
        </div>
        <div className="flex gap-1.5 bg-surface-secondary p-1 rounded-lg border border-border">
          {['1H', '6H', '12H', '24H', 'ALL'].map(r => (
            <button 
              key={r} 
              onClick={() => setRange(r)}
              className={`px-4 py-1 text-xs font-bold uppercase rounded transition-colors ${range === r ? 'bg-surface-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        {(!filteredData || filteredData.length === 0) ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
            <div className="text-text-secondary text-sm">No readings available for this time range.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE5E2" vertical={true} horizontal={true} opacity={0.5} />
              <XAxis dataKey="timeLabel" stroke="#8C9EA4" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#8C9EA4" fontSize={10} tickFormatter={(val) => val} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8C9EA4', strokeDasharray: '3 3' }} />
              
              <Line type="monotone" dataKey="aqi" name="AQI" stroke="#EF5B32" strokeWidth={2} dot={{ r: 3, fill: '#EF5B32', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="pm10" name="PM10" stroke="#F4D03F" strokeWidth={2} dot={{ r: 3, fill: '#F4D03F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
