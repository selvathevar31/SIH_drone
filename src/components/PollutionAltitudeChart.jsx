import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-elevated border border-border p-3 rounded-lg shadow-lg text-xs font-mono min-w-[120px]">
        <p className="text-text-secondary font-bold mb-2 pb-2 border-b border-border/50 text-center uppercase tracking-widest">Reading</p>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-text-muted">Altitude:</span>
          <span className="text-text-primary font-bold">{data.altitude ? Math.round(data.altitude) : '--'} m</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-text-muted">AQI:</span>
          <span className="text-[#EF5B32] font-bold">{data.aqi ? Math.round(data.aqi) : '--'}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function PollutionAltitudeChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter out invalid readings
    return data.filter(d => d.altitude != null && d.aqi != null);
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
        <div className="text-text-secondary text-sm">No altitude readings available.</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollution by Altitude</h3>
        <p className="text-text-secondary text-xs">Vertical distribution of AQI</p>
      </div>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart 
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#DCE5E2" horizontal={true} vertical={true} opacity={0.5} />
            
            <XAxis 
              type="number"
              dataKey="aqi"
              name="AQI"
              stroke="#8C9EA4" 
              fontSize={10} 
              tickMargin={10} 
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            >
              <Label value="AQI" offset={-10} position="insideBottom" fill="#8C9EA4" fontSize={10} />
            </XAxis>

            <YAxis 
              type="number"
              dataKey="altitude"
              name="Altitude"
              stroke="#8C9EA4" 
              fontSize={10} 
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(val) => Math.round(val)}
            >
              <Label value="Altitude (m)" angle={-90} position="insideLeft" fill="#8C9EA4" fontSize={10} />
            </YAxis>

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter 
              name="Readings" 
              data={chartData} 
              fill="#EF5B32" 
              line={false}
              shape="circle"
              opacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
