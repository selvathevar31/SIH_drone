import React, { useState, useEffect } from 'react';
import { getEnvironmentalAnalytics } from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Wind, AlertTriangle, ArrowRight, Activity, Info } from 'lucide-react';

const COLORS = {
  good: '#22c55e',
  satisfactory: '#84cc16',
  moderately_polluted: '#eab308',
  poor: '#f97316',
  very_poor: '#ef4444',
  severe: '#7f1d1d'
};

const CATEGORY_NAMES = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderately_polluted: 'Moderate',
  poor: 'Poor',
  very_poor: 'Very Poor',
  severe: 'Severe'
};

export default function EnvironmentalAnalyticsPanel({ missionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!missionId) return;
    
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getEnvironmentalAnalytics(missionId);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAnalytics();
    
    return () => {
      isMounted = false;
    };
  }, [missionId]);

  if (loading) {
    return (
      <div className="flex flex-col border border-border bg-surface-primary p-6 rounded-lg min-h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
        <div className="mt-4 text-telemetry font-mono uppercase tracking-widest text-sm">Calculating KPI...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-hazardous/30 bg-hazardous/10 p-6 rounded-lg text-center text-hazardous">
        {error}
      </div>
    );
  }

  if (!data || data.air_quality.readings_with_aqi === 0) {
    return (
      <div className="flex flex-col border border-border bg-surface-primary p-6 rounded-lg min-h-[200px] items-center justify-center text-text-muted">
        <Wind className="w-10 h-10 opacity-50 mb-3" />
        <h3 className="font-bold uppercase tracking-widest text-text-primary mb-1">No Environmental Data</h3>
        <p className="text-sm">Insufficient valid measurements to calculate environmental analytics.</p>
      </div>
    );
  }

  const chartData = Object.entries(data.aqi_distribution)
    .filter(([_, val]) => val > 0)
    .map(([key, val]) => ({
      name: CATEGORY_NAMES[key] || key,
      value: val,
      color: COLORS[key] || '#94a3b8'
    }));

  const getStatusColor = (status) => {
    switch(status) {
      case 'GOOD': return 'text-safe border-safe/30 bg-safe/10';
      case 'MODERATE': return 'text-warning border-warning/30 bg-warning/10';
      case 'ELEVATED': 
      case 'HIGH': 
      case 'SEVERE': return 'text-hazardous border-hazardous/30 bg-hazardous/10';
      default: return 'text-text-primary border-border bg-surface-secondary';
    }
  };

  return (
    <div className="flex flex-col bg-surface-primary border border-border rounded-lg shadow-sm overflow-hidden mb-6">
      
      <div className="px-4 lg:px-6 py-4 border-b border-border bg-surface-elevated flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-5 h-5 text-telemetry" /> Environmental Analytics
        </h3>
        
        <div className={`px-3 py-1 rounded-full border font-bold text-xs uppercase tracking-wider ${getStatusColor(data.overall_status)}`}>
          Status: {data.overall_status}
        </div>
      </div>

      <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: AQI Overview */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Average AQI</span>
            <span className="font-mono text-4xl font-bold text-text-primary">
              {data.air_quality.average_aqi.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Peak AQI</span>
            <span className="font-mono text-4xl font-bold text-hazardous">
              {data.air_quality.maximum_aqi}
            </span>
          </div>
          
          <div className="mt-2 flex flex-col gap-3">
            {data.aqi_thresholds.map((th, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-text-secondary uppercase">AQI ≥ {th.threshold}</span>
                  <span className="text-sm font-mono text-text-primary">{th.percentage}%</span>
                </div>
                <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-telemetry rounded-full"
                    style={{ width: `${Math.min(100, th.percentage)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Middle Column: PM Breakdown */}
        <div className="lg:col-span-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-border/50 pt-4 lg:pt-0 lg:pl-8">
          <div className="flex flex-col gap-4">
            
            {/* PM2.5 */}
            <div className="bg-surface-secondary rounded border border-border p-4 relative overflow-hidden">
              <h4 className="text-sm font-bold text-text-primary mb-3">PM2.5</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Average</span>
                  <span className="font-mono text-lg">{data.pm25.average?.toFixed(1) || 'N/A'} <span className="text-xs text-text-muted">µg/m³</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Peak</span>
                  <span className="font-mono text-lg text-warning">{data.pm25.maximum?.toFixed(1) || 'N/A'} <span className="text-xs text-text-muted">µg/m³</span></span>
                </div>
              </div>
              
              {data.pm25.thresholds.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Threshold Exceedances</span>
                  <div className="flex items-center gap-4">
                    {data.pm25.thresholds.map((th, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs text-text-secondary">≥ {th.threshold}:</span>
                        <span className="font-mono text-sm font-bold text-hazardous">{th.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PM10 */}
            <div className="bg-surface-secondary rounded border border-border p-4 relative overflow-hidden">
              <h4 className="text-sm font-bold text-text-primary mb-3">PM10</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Average</span>
                  <span className="font-mono text-lg">{data.pm10.average?.toFixed(1) || 'N/A'} <span className="text-xs text-text-muted">µg/m³</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Peak</span>
                  <span className="font-mono text-lg text-warning">{data.pm10.maximum?.toFixed(1) || 'N/A'} <span className="text-xs text-text-muted">µg/m³</span></span>
                </div>
              </div>
              
              {data.pm10.thresholds.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Threshold Exceedances</span>
                  <div className="flex items-center gap-4">
                    {data.pm10.thresholds.map((th, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs text-text-secondary">≥ {th.threshold}:</span>
                        <span className="font-mono text-sm font-bold text-hazardous">{th.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column: Chart & Insights */}
        <div className="lg:col-span-4 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-border/50 pt-4 lg:pt-0 lg:pl-8">
          
          <div className="h-[180px] w-full">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 text-center">AQI Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {data.dominant_pollutant && (
             <div className="flex items-center justify-between p-3 rounded bg-surface-secondary border border-border">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Dominant Pollutant
                </span>
                <span className="font-bold text-hazardous font-mono">{data.dominant_pollutant}</span>
             </div>
          )}

          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Insights
            </h4>
            <ul className="space-y-2">
              {data.insights.map((insight, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-text-secondary items-start">
                  <ArrowRight className="w-3 h-3 text-telemetry mt-0.5 shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
