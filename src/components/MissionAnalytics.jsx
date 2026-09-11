import React, { useState, useMemo } from 'react';
import { Activity, Wind, CloudRain, Clock, MapPin, Compass, Crosshair, TrendingUp, AlertTriangle } from 'lucide-react';
import MissionMap from './MissionMap';
import MissionMap3D from './MissionMap3D';
import PollutionTrendChart from './PollutionTrendChart';
import PollutionAltitudeChart from './PollutionAltitudeChart';
import PollutantProfile from './PollutantProfile';

export default function MissionAnalytics({ missionId, dashboardData, telemetryData }) {
  const [mapMode, setMapMode] = useState('2D');

  const stats = dashboardData?.mission_stats || {};

  const flightPath = useMemo(() => {
    return (telemetryData || []).map(t => ({
      latitude: t.latitude,
      longitude: t.longitude,
      altitude: t.altitude
    })).filter(p => p.latitude && p.longitude);
  }, [telemetryData]);

  const durationStr = useMemo(() => {
    if (!telemetryData || !telemetryData.length) return '00:00';
    const start = new Date(telemetryData[0].timestamp).getTime();
    const end = new Date(telemetryData[telemetryData.length - 1].timestamp).getTime();
    const diff = end - start;
    if (isNaN(diff)) return '00:00';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [telemetryData]);

  const calcStats = useMemo(() => {
    const data = telemetryData || [];
    const validAqi = data.map(d => parseFloat(d.aqi)).filter(a => !isNaN(a));
    const validPm25 = data.map(d => parseFloat(d.pm25)).filter(a => !isNaN(a));
    const validPm10 = data.map(d => parseFloat(d.pm10)).filter(a => !isNaN(a));
    const validAlt = data.map(d => parseFloat(d.altitude)).filter(a => !isNaN(a));

    const avgAqi = validAqi.length ? (validAqi.reduce((a,b)=>a+b,0)/validAqi.length) : null;
    const maxAqi = validAqi.length ? Math.max(...validAqi) : null;
    
    const avgPm25 = validPm25.length ? (validPm25.reduce((a,b)=>a+b,0)/validPm25.length) : null;
    const avgPm10 = validPm10.length ? (validPm10.reduce((a,b)=>a+b,0)/validPm10.length) : null;
    const maxAlt = validAlt.length ? Math.max(...validAlt) : 0;

    return {
      avgAqi: avgAqi,
      maxAqi: maxAqi,
      avgPm25: avgPm25,
      avgPm10: avgPm10,
      maxAlt: maxAlt
    };
  }, [telemetryData]);

  // Essential Stats List
  const essentialMetrics = [
    { label: 'Avg AQI', value: calcStats.avgAqi?.toFixed(1) || '--', icon: <Wind className="w-4 h-4 text-telemetry" /> },
    { label: 'Peak AQI', value: calcStats.maxAqi?.toFixed(1) || '--', icon: <TrendingUp className="w-4 h-4 text-hazardous" /> },
    { label: 'Avg PM2.5', value: calcStats.avgPm25?.toFixed(1) || '--', icon: <CloudRain className="w-4 h-4 text-warning" /> },
    { label: 'Avg PM10', value: calcStats.avgPm10?.toFixed(1) || '--', icon: <CloudRain className="w-4 h-4 text-warning" /> },
    { label: 'Samples', value: (telemetryData || []).length, icon: <Activity className="w-4 h-4 text-telemetry" /> },
    { label: 'Duration', value: durationStr, icon: <Clock className="w-4 h-4 text-safe" /> },
    { label: 'Distance', value: `${stats.distance_km || 0} km`, icon: <MapPin className="w-4 h-4 text-telemetry" /> },
    { label: 'Max Alt', value: `${Math.round(calcStats.maxAlt)} m`, icon: <Compass className="w-4 h-4 text-warning" /> },
    { label: 'Hotspots', value: dashboardData?.hotspots?.length || 0, icon: <Crosshair className="w-4 h-4 text-hazardous" /> },
    { label: 'Area', value: `${((stats.distance_km || 0) * 0.2).toFixed(2)} km²`, icon: <MapPin className="w-4 h-4 text-telemetry" /> },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto h-full w-full pb-8">
      
      {/* 1. HEADER & ESSENTIAL STATS */}
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-surface-elevated border border-border rounded-lg p-4 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="text-telemetry w-6 h-6" />
            <div>
              <h2 className="text-text-primary font-bold uppercase tracking-widest text-lg">Mission Analytics</h2>
              <p className="text-text-muted text-xs font-mono">{missionId} • Operational Overview</p>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-3">
          {essentialMetrics.map((m, idx) => (
            <div key={idx} className="bg-surface-elevated border border-border rounded-lg p-3 flex flex-col gap-1 shadow-sm items-center justify-center text-center">
              <div className="flex items-center gap-1.5 mb-1">
                {m.icon}
                <span className="text-[9px] text-text-muted uppercase tracking-widest font-bold whitespace-nowrap">{m.label}</span>
              </div>
              <span className="text-sm font-mono font-bold text-text-primary">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MISSION HEATMAP (PRIORITY VIEW) */}
      <div className="bg-surface-elevated border border-border rounded-lg relative overflow-hidden shadow-sm flex flex-col h-[600px] shrink-0">
        <div className="absolute top-4 left-4 z-[400] flex bg-background/90 backdrop-blur rounded shadow border border-border p-1">
          <button 
            onClick={() => setMapMode('2D')} 
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${mapMode === '2D' ? 'bg-telemetry text-background' : 'text-text-muted hover:text-text-primary'}`}
          >
            2D Heatmap
          </button>
          <button 
            onClick={() => setMapMode('3D')} 
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${mapMode === '3D' ? 'bg-telemetry text-background' : 'text-text-muted hover:text-text-primary'}`}
          >
            3D Terrain
          </button>
        </div>
        
        <div className="flex-1 w-full h-full relative z-0">
          {mapMode === '2D' ? (
            <MissionMap 
              missionId={missionId}
              flightPath={flightPath}
              currentLocation={null}
              hotspots={dashboardData?.hotspots || []}
              telemetry={dashboardData?.current_environment || telemetryData || []}
            />
          ) : (
            <MissionMap3D 
              missionId={missionId}
              flightPath={flightPath}
              currentLocation={null}
              hotspots={dashboardData?.hotspots || []}
              telemetry={dashboardData?.current_environment || telemetryData || []}
            />
          )}
        </div>
      </div>

      {/* 3. ESSENTIAL ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-[380px]">
        {/* Pollution Trend */}
        <div className="h-full">
           <PollutionTrendChart data={telemetryData} />
        </div>
        
        {/* Pollution by Altitude */}
        <div className="h-full">
           <PollutionAltitudeChart data={telemetryData} />
        </div>
        
        {/* Pollutant Profile */}
        <div className="h-full">
           <PollutantProfile telemetryData={telemetryData} />
        </div>
      </div>

    </div>
  );
}
