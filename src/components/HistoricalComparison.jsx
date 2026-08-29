import React, { useState, useEffect } from 'react';
import { compareMissions } from '../services/api';
import ComparisonMap from './ComparisonMap';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

export default function HistoricalComparison({ missions }) {
  const [currentMissionId, setCurrentMissionId] = useState('');
  const [previousMissionId, setPreviousMissionId] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Map state
  const [mapMode, setMapMode] = useState('CHANGE'); // CURRENT, PREVIOUS, CHANGE
  const [selectedMetric, setSelectedMetric] = useState('AQI'); // AQI, PM2.5, PM10

  // Determine if comparison is valid
  const isDuplicate = currentMissionId !== '' && currentMissionId === previousMissionId;
  const canCompare = currentMissionId !== '' && previousMissionId !== '' && !isDuplicate;

  useEffect(() => {
    if (missions.length >= 2 && !currentMissionId && !previousMissionId) {
      // Pick the two most recent distinct missions
      setCurrentMissionId(missions[0].mission_id);
      setPreviousMissionId(missions[1].mission_id);
    }
  }, [missions]);

  // When currentMissionId changes, if it now matches previousMissionId, auto-swap
  const handleCurrentChange = (newId) => {
    if (newId === previousMissionId) {
      // Swap: move old currentMissionId to previousMissionId
      setPreviousMissionId(currentMissionId);
    }
    setCurrentMissionId(newId);
  };

  const handlePreviousChange = (newId) => {
    if (newId === currentMissionId) {
      // Swap: move old previousMissionId to currentMissionId
      setCurrentMissionId(previousMissionId);
    }
    setPreviousMissionId(newId);
  };

  useEffect(() => {
    if (canCompare) {
      const fetchComparison = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await compareMissions(currentMissionId, previousMissionId);
          setComparisonData(data);
        } catch (err) {
          setError(err.message);
          setComparisonData(null);
        } finally {
          setLoading(false);
        }
      };
      fetchComparison();
    } else {
      setComparisonData(null);
    }
  }, [currentMissionId, previousMissionId]);

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

  const formatPct = (pct) => {
    if (pct === null || pct === undefined) return 'N/A';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  const MetricCard = ({ title, metric, isHotspot = false }) => {
    if (!metric) return null;

    let cValue = isHotspot ? metric.current_count : metric.current_average;
    let pValue = isHotspot ? metric.previous_count : metric.previous_average;
    let absoluteChange = isHotspot ? metric.count_change : metric.absolute_change;
    let percentageChange = isHotspot ? null : metric.percentage_change;

    let Icon = Minus;
    let colorClass = 'text-text-primary';
    let iconClass = 'text-text-muted';

    if (absoluteChange > 0) {
      Icon = ArrowUpRight;
      colorClass = 'text-hazardous';
      iconClass = 'text-hazardous';
    } else if (absoluteChange < 0) {
      Icon = ArrowDownRight;
      colorClass = 'text-safe';
      iconClass = 'text-safe';
    }

    return (
      <div className="bg-surface-secondary border border-border rounded p-4 flex flex-col gap-2">
        <h4 className="text-sm font-bold text-text-muted uppercase tracking-widest">{title}</h4>
        <div className="flex items-end gap-2 mb-1">
          <span className="font-mono text-2xl font-bold text-text-primary">
            {cValue !== null ? (isHotspot ? cValue : cValue.toFixed(1)) : 'N/A'}
          </span>
          <span className="text-text-muted text-sm font-mono mb-1">
            (prev {pValue !== null ? (isHotspot ? pValue : pValue.toFixed(1)) : 'N/A'})
          </span>
        </div>
        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${colorClass}`}>
          <Icon className={`w-4 h-4 ${iconClass}`} />
          <span>{absoluteChange > 0 ? '+' : ''}{absoluteChange !== null ? (isHotspot ? absoluteChange : absoluteChange.toFixed(1)) : 'N/A'}</span>
          {!isHotspot && percentageChange !== null && (
            <span className="opacity-80">({formatPct(percentageChange)})</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-[1920px] mx-auto w-full">
      
      {/* Top Bar: Selectors */}
      <div className="bg-surface-primary rounded-lg border border-border p-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase">Historical Comparison</h2>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Current Survey</label>
            <select 
              value={currentMissionId}
              onChange={(e) => handleCurrentChange(e.target.value)}
              className="bg-surface-secondary border border-border text-telemetry font-mono p-2 rounded outline-none flex-1 lg:w-48"
            >
              {missions.map(m => (
                <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
              ))}
            </select>
          </div>
          
          <div className="hidden lg:block text-text-muted px-2">VS</div>
          
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Compare With</label>
            <select 
              value={previousMissionId}
              onChange={(e) => handlePreviousChange(e.target.value)}
              className="bg-surface-secondary border border-border text-text-primary font-mono p-2 rounded outline-none flex-1 lg:w-48"
            >
              {missions.map(m => (
                <option key={m.mission_id} value={m.mission_id}>{m.mission_id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isDuplicate && (
        <div className="bg-warning/10 border border-warning/30 text-warning rounded p-4 text-center font-bold uppercase tracking-wide text-sm">
          Select two different missions to compare.
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center bg-surface-primary rounded-lg border border-border">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
            <div className="text-telemetry font-mono uppercase tracking-widest text-sm">Matching Geometries...</div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-hazardous/10 border border-hazardous/30 text-hazardous rounded p-4 text-center">
          {error}
        </div>
      )}

      {!loading && !error && comparisonData && (
        <div className="flex-1 flex flex-col xl:flex-row gap-4 overflow-hidden">
          
          {/* Left Panel: Metrics & Stats */}
          <div className="w-full xl:w-1/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            
            {/* Overview Summary */}
            <div className={`p-4 rounded-lg border flex items-center justify-between ${
              comparisonData.summary.overall_direction === 'IMPROVED' ? 'bg-safe/10 border-safe/30 text-safe' :
              comparisonData.summary.overall_direction === 'WORSENED' ? 'bg-hazardous/10 border-hazardous/30 text-hazardous' :
              'bg-surface-secondary border-border text-text-primary'
            }`}>
              <span className="font-bold uppercase tracking-widest text-sm">Overall Trend</span>
              <span className="font-mono font-bold">{comparisonData.summary.overall_direction}</span>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard title="AQI" metric={comparisonData.overall.aqi} />
              <MetricCard title="PM2.5" metric={comparisonData.overall.pm25} />
              <MetricCard title="PM10" metric={comparisonData.overall.pm10} />
              <MetricCard title="Hotspots" metric={comparisonData.hotspots} isHotspot={true} />
            </div>
            
            {/* Matching Stats */}
            <div className="bg-surface-primary rounded-lg border border-border p-4 flex flex-col gap-3">
              <h4 className="text-sm font-bold text-text-muted uppercase tracking-widest">Spatial Matching</h4>
              <div className="text-xs text-text-secondary">
                Matched readings within {comparisonData.matching.radius_meters}m radius.
              </div>
              
              <div className="flex flex-col gap-2 font-mono text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-text-muted">Matched Points</span>
                  <span className="text-telemetry font-bold">{comparisonData.matching.matched}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-text-muted">Current Total / Unmatched</span>
                  <span>{comparisonData.matching.current_total} / {comparisonData.matching.current_unmatched}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Previous Total / Unmatched</span>
                  <span>{comparisonData.matching.previous_total} / {comparisonData.matching.previous_unmatched}</span>
                </div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="bg-surface-primary rounded-lg border border-border p-4 flex flex-col gap-3 min-h-[250px] flex-1">
              <h4 className="text-sm font-bold text-text-muted uppercase tracking-widest">Cross-Section Trend</h4>
              <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData.spatial_data.slice(0, 100)}>
                    <defs>
                      <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="distance_meters" hide />
                    <YAxis stroke="#475569" fontSize={10} width={30} tickFormatter={(val) => Math.round(val)} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(value, name) => [value.toFixed(1), name === 'aqi.current' ? 'Current AQI' : 'Previous AQI']}
                      labelFormatter={() => ''}
                    />
                    <Area type="monotone" dataKey="aqi.previous" stroke="#64748b" fillOpacity={1} fill="url(#colorP)" strokeWidth={2} />
                    <Area type="monotone" dataKey="aqi.current" stroke="#3b82f6" fillOpacity={1} fill="url(#colorC)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-text-muted text-center italic">First 100 matched points</div>
            </div>
            
          </div>

          {/* Right Panel: Map */}
          <div className="w-full xl:w-2/3 flex flex-col bg-surface-primary rounded-lg border border-border overflow-hidden">
            
            {/* Map Controls */}
            <div className="p-3 border-b border-border bg-surface-elevated flex flex-col sm:flex-row justify-between gap-3 items-center">
              <div className="flex bg-background rounded border border-border p-1 w-full sm:w-auto">
                <button 
                  onClick={() => setMapMode('CURRENT')}
                  className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${mapMode === 'CURRENT' ? 'bg-surface-elevated text-text-primary shadow' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Current
                </button>
                <button 
                  onClick={() => setMapMode('PREVIOUS')}
                  className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${mapMode === 'PREVIOUS' ? 'bg-surface-elevated text-text-primary shadow' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setMapMode('CHANGE')}
                  className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${mapMode === 'CHANGE' ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Change
                </button>
              </div>

              <div className="flex bg-background rounded border border-border p-1 w-full sm:w-auto">
                {['AQI', 'PM2.5', 'PM10'].map(metric => (
                  <button 
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${selectedMetric === metric ? 'bg-surface-elevated text-text-primary shadow border border-border/50' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>

            {/* Map View */}
            <div className="flex-1 relative min-h-[400px]">
              <ComparisonMap 
                spatialData={comparisonData.spatial_data} 
                mapMode={mapMode} 
                selectedMetric={selectedMetric} 
              />
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
