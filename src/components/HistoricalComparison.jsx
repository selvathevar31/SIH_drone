import React, { useState, useEffect } from 'react';
import MissionMap from './MissionMap';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Label, LineChart, Line, Legend } from 'recharts';

export default function HistoricalComparison({ missions, datasetStore, fetchAndStoreDataset }) {
  const [currentMissionId, setCurrentMissionId] = useState('');
  const [previousMissionId, setPreviousMissionId] = useState('');

  useEffect(() => {
    if (missions.length >= 2 && !currentMissionId && !previousMissionId) {
      setCurrentMissionId(missions[0].mission_id);
      setPreviousMissionId(missions[1].mission_id);
    }
  }, [missions, currentMissionId, previousMissionId]);

  useEffect(() => {
    if (currentMissionId && (!datasetStore || !datasetStore.has(currentMissionId))) {
      const meta = missions.find(m => m.mission_id === currentMissionId);
      if (meta && fetchAndStoreDataset) fetchAndStoreDataset(currentMissionId, meta);
    }
    if (previousMissionId && (!datasetStore || !datasetStore.has(previousMissionId))) {
      const meta = missions.find(m => m.mission_id === previousMissionId);
      if (meta && fetchAndStoreDataset) fetchAndStoreDataset(previousMissionId, meta);
    }
  }, [currentMissionId, previousMissionId, datasetStore, fetchAndStoreDataset, missions]);

  const handleCurrentChange = (newId) => {
    if (newId === previousMissionId) setPreviousMissionId(currentMissionId);
    setCurrentMissionId(newId);
  };

  const handlePreviousChange = (newId) => {
    if (newId === currentMissionId) setCurrentMissionId(previousMissionId);
    setPreviousMissionId(newId);
  };

  const isDuplicate = currentMissionId !== '' && currentMissionId === previousMissionId;

  // Zero missions
  if (!missions || missions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border items-center justify-center p-8">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase mb-2">No Missions Available</h2>
        <p className="text-text-secondary text-center">No missions available for comparison.</p>
      </div>
    );
  }

  // Only one mission
  if (missions.length < 2) {
    return (
      <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border items-center justify-center p-8">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase mb-2">Insufficient Data</h2>
        <p className="text-text-secondary text-center">Historical comparison requires at least 2 missions.</p>
        <p className="text-text-secondary text-center mt-1">Please import more missions to use this feature.</p>
      </div>
    );
  }

  const m1Data = datasetStore?.get(currentMissionId);
  const m2Data = datasetStore?.get(previousMissionId);
  const isLoading = !m1Data || !m2Data;

  const MetricCard = ({ title, m1Val, m2Val, unit = '' }) => {
    const valid1 = typeof m1Val === 'number' && !isNaN(m1Val);
    const valid2 = typeof m2Val === 'number' && !isNaN(m2Val);
    
    let change = null;
    let pctChange = null;
    if (valid1 && valid2 && m2Val !== 0) {
      change = m1Val - m2Val;
      pctChange = (change / Math.abs(m2Val)) * 100;
    } else if (valid1 && valid2 && m2Val === 0 && m1Val !== 0) {
      change = m1Val;
      pctChange = 100;
    }

    let Icon = Minus;
    let colorClass = 'text-text-primary';
    let iconClass = 'text-text-muted';

    if (change > 0) {
      Icon = ArrowUpRight;
      colorClass = 'text-hazardous';
      iconClass = 'text-hazardous';
    } else if (change < 0) {
      Icon = ArrowDownRight;
      colorClass = 'text-safe';
      iconClass = 'text-safe';
    }

    return (
      <div className="bg-surface-secondary border border-border rounded-[12px] p-5 flex flex-col gap-3 shadow-sm flex-1 min-w-[150px]">
        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{title}</h4>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-end border-b border-border/50 pb-2">
            <span className="text-text-muted text-xs">M1 (Current)</span>
            <span className="font-mono text-xl font-bold text-text-primary">
              {valid1 ? m1Val.toFixed(1) : 'N/A'}{unit}
            </span>
          </div>
          <div className="flex justify-between items-end pb-1">
            <span className="text-text-muted text-xs">M2 (Prev)</span>
            <span className="font-mono text-md text-text-secondary">
              {valid2 ? m2Val.toFixed(1) : 'N/A'}{unit}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 font-mono text-xs font-bold ${colorClass} mt-auto pt-2`}>
          <Icon className={`w-4 h-4 ${iconClass}`} />
          <span>{change > 0 ? '+' : ''}{change !== null ? change.toFixed(1) : 'N/A'} {unit}</span>
          {pctChange !== null && (
            <span className="opacity-80 ml-1">({pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%)</span>
          )}
        </div>
      </div>
    );
  };

  const renderTrendChart = () => {
    if (!m1Data || !m2Data) return null;
    const maxLen = Math.max(m1Data.telemetry.length, m2Data.telemetry.length);
    const data = [];
    for (let i = 0; i < maxLen; i++) {
      data.push({
        index: i,
        m1_aqi: m1Data.telemetry[i] ? m1Data.telemetry[i].aqi : null,
        m2_aqi: m2Data.telemetry[i] ? m2Data.telemetry[i].aqi : null,
      });
    }

    return (
      <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card flex flex-col h-full">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollution Trend Comparison</h3>
        <p className="text-text-secondary text-xs mb-6">AQI over mission timeline</p>
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE5E2" opacity={0.3} vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis stroke="#8C9EA4" fontSize={10} axisLine={false} tickLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                labelFormatter={() => ''}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="m1_aqi" name="Mission 1 AQI" stroke="#22D3EE" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="m2_aqi" name="Mission 2 AQI" stroke="#94A3B8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderAltitudeChart = () => {
    if (!m1Data || !m2Data) return null;
    const data1 = m1Data.telemetry.reduce((acc, d) => {
        const alt = parseFloat(d.altitude);
        const aqi = parseFloat(d.aqi);
        if (!isNaN(alt) && !isNaN(aqi)) acc.push({ altitude: alt, aqi: aqi });
        return acc;
    }, []);
    const data2 = m2Data.telemetry.reduce((acc, d) => {
        const alt = parseFloat(d.altitude);
        const aqi = parseFloat(d.aqi);
        if (!isNaN(alt) && !isNaN(aqi)) acc.push({ altitude: alt, aqi: aqi });
        return acc;
    }, []);

    return (
      <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card flex flex-col h-full">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollution by Altitude</h3>
        <p className="text-text-secondary text-xs mb-6">AQI distribution vs altitude</p>
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE5E2" opacity={0.3} horizontal={true} vertical={true} />
              <XAxis type="number" dataKey="aqi" name="AQI" stroke="#8C9EA4" fontSize={10} axisLine={false} tickLine={false}>
                <Label value="AQI" offset={-10} position="insideBottom" fill="#8C9EA4" fontSize={10} />
              </XAxis>
              <YAxis type="number" dataKey="altitude" name="Altitude" stroke="#8C9EA4" fontSize={10} axisLine={false} tickLine={false}>
                <Label value="Altitude (m)" angle={-90} position="insideLeft" fill="#8C9EA4" fontSize={10} />
              </YAxis>
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Scatter name="Mission 1" data={data1} fill="#22D3EE" opacity={0.6} shape="circle" />
              <Scatter name="Mission 2" data={data2} fill="#94A3B8" opacity={0.6} shape="circle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderProfileChart = () => {
    if (!m1Data || !m2Data) return null;
    const metrics = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
    const labels = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', so2: 'SO₂', co: 'CO', o3: 'O₃' };
    const maxRefs = { pm25: 250, pm10: 430, no2: 100, so2: 50, co: 10, o3: 150 };

    const getAvg = (data, key) => {
      let sum = 0, count = 0;
      data.telemetry.forEach(r => {
        const val = parseFloat(r[key]);
        if (!isNaN(val)) { sum += val; count++; }
      });
      return count > 0 ? sum / count : 0;
    };

    return (
      <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card flex flex-col h-full">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollutant Profile Comparison</h3>
        <p className="text-text-secondary text-xs mb-6">Average concentrations</p>
        <div className="flex-1 flex flex-col justify-between gap-4 overflow-y-auto custom-scrollbar pr-2 min-h-[200px]">
          {metrics.map(m => {
            const v1 = getAvg(m1Data, m);
            const v2 = getAvg(m2Data, m);
            const p1 = Math.min((v1 / maxRefs[m]) * 100, 100) || 0;
            const p2 = Math.min((v2 / maxRefs[m]) * 100, 100) || 0;
            
            return (
              <div key={m} className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-text-primary w-12">{labels[m]}</span>
                  <div className="flex gap-4 text-[10px] font-mono text-text-muted">
                    <span className="text-telemetry">{v1.toFixed(1)}</span>
                    <span>vs</span>
                    <span>{v2.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-telemetry rounded-full" style={{ width: `${p1}%` }} />
                  </div>
                  <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-text-muted rounded-full" style={{ width: `${p2}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-[1920px] mx-auto w-full p-2">
      
      {/* Top Bar: Selectors */}
      <div className="bg-surface-primary rounded-lg border border-border p-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase mb-1">Mission Comparison</h2>
          <span className="text-text-secondary text-xs">Compare air quality metrics between two missions</span>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col gap-1 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-telemetry uppercase tracking-wider w-20">Mission 1</label>
              <select 
                value={currentMissionId}
                onChange={(e) => handleCurrentChange(e.target.value)}
                className="bg-surface-secondary border border-border text-text-primary font-mono p-2 rounded outline-none flex-1 lg:w-48 text-xs"
              >
                {missions.map(m => (
                  <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
                ))}
              </select>
            </div>
            {m1Data && <span className="text-[10px] text-text-muted ml-22 pl-2">Location: {m1Data.cityLabel}</span>}
          </div>
          
          <div className="hidden lg:block text-text-muted px-2 font-bold italic">VS</div>
          
          <div className="flex flex-col gap-1 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider w-20">Mission 2</label>
              <select 
                value={previousMissionId}
                onChange={(e) => handlePreviousChange(e.target.value)}
                className="bg-surface-secondary border border-border text-text-primary font-mono p-2 rounded outline-none flex-1 lg:w-48 text-xs"
              >
                {missions.map(m => (
                  <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
                ))}
              </select>
            </div>
            {m2Data && <span className="text-[10px] text-text-muted ml-22 pl-2">Location: {m2Data.cityLabel}</span>}
          </div>

          <button 
            className="px-6 py-2 bg-telemetry hover:bg-telemetry/80 text-background font-bold tracking-widest uppercase rounded text-sm transition-colors mt-2 lg:mt-0"
          >
            Compare
          </button>
        </div>
      </div>

      {isDuplicate && (
        <div className="bg-warning/10 border border-warning/30 text-warning rounded p-4 text-center font-bold uppercase tracking-wide text-sm shrink-0">
          Select two different missions to compare.
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-surface-primary rounded-lg border border-border">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
            <div className="text-telemetry font-mono uppercase tracking-widest text-sm">Loading Datasets...</div>
          </div>
        </div>
      )}

      {!isLoading && !isDuplicate && m1Data && m2Data && (
        <div className="flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
          
          {/* KPI Row */}
          <div className="flex flex-wrap lg:flex-nowrap gap-4">
            <MetricCard 
              title="Avg AQI" 
              m1Val={m1Data.stats?.avg} 
              m2Val={m2Data.stats?.avg} 
            />
            <MetricCard 
              title="Avg PM2.5" 
              m1Val={m1Data.dashboardData?.mission_stats?.avg_pm25} 
              m2Val={m2Data.dashboardData?.mission_stats?.avg_pm25} 
              unit=" µg/m³"
            />
            <MetricCard 
              title="Avg PM10" 
              m1Val={m1Data.dashboardData?.mission_stats?.avg_pm10} 
              m2Val={m2Data.dashboardData?.mission_stats?.avg_pm10} 
              unit=" µg/m³"
            />
            <MetricCard 
              title="Max AQI" 
              m1Val={m1Data.stats?.max} 
              m2Val={m2Data.stats?.max} 
            />
            <MetricCard 
              title="Area Surveyed" 
              m1Val={(m1Data.dashboardData?.mission_stats?.distance_km || 0) * 0.2} 
              m2Val={(m2Data.dashboardData?.mission_stats?.distance_km || 0) * 0.2} 
              unit=" km²"
            />
          </div>

          {/* Dual Maps */}
          <div className="flex flex-col lg:flex-row gap-6 h-[550px] shrink-0">
            <div className="flex-1 flex flex-col gap-2 relative">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-surface-elevated/90 backdrop-blur border border-telemetry/50 rounded-full px-6 py-1.5 shadow-lg pointer-events-none">
                <span className="font-bold text-telemetry tracking-widest uppercase text-[10px]">Mission 1 — {new Date(m1Data.dashboardData?.mission?.start_time).toLocaleDateString()}</span>
              </div>
              <MissionMap 
                missionId={currentMissionId}
                flightPath={m1Data.telemetry}
                hotspots={m1Data.dashboardData?.hotspots || []}
                telemetry={m1Data.dashboardData?.current_environment || []}
                allDatasets={[]}
              />
            </div>
            <div className="flex-1 flex flex-col gap-2 relative">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-surface-elevated/90 backdrop-blur border border-text-muted/50 rounded-full px-6 py-1.5 shadow-lg pointer-events-none">
                <span className="font-bold text-text-primary tracking-widest uppercase text-[10px]">Mission 2 — {new Date(m2Data.dashboardData?.mission?.start_time).toLocaleDateString()}</span>
              </div>
              <MissionMap 
                missionId={previousMissionId}
                flightPath={m2Data.telemetry}
                hotspots={m2Data.dashboardData?.hotspots || []}
                telemetry={m2Data.dashboardData?.current_environment || []}
                allDatasets={[]}
              />
            </div>
          </div>

          {/* Bottom Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-[350px]">
            {renderTrendChart()}
            {renderAltitudeChart()}
            {renderProfileChart()}
          </div>

        </div>
      )}
    </div>
  );
}
