import React, { useState, useMemo } from 'react';
import { Activity, Compass, Crosshair } from 'lucide-react';
import MissionMap from './MissionMap';
import MissionMap3D from './MissionMap3D';

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

  const currentLocation = flightPath.length > 0 ? flightPath[flightPath.length - 1] : null;

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

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto h-full min-h-[700px]">
      {/* HEADER */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4 flex flex-col gap-4 shadow-sm shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity className="text-telemetry w-6 h-6" />
            <div>
              <h2 className="text-text-primary font-bold uppercase tracking-widest text-lg">Mission Analytics</h2>
              <p className="text-text-muted text-xs font-mono">{missionId} • Flight & Trajectory Analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* LEFT PANEL: DRONE TELEMETRY */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-surface-elevated border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4" /> Flight Telemetry
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Duration</span>
                <span className="text-lg font-mono font-medium text-text-primary">{durationStr}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Distance</span>
                <span className="text-lg font-mono font-medium text-text-primary">{stats.distance_km || 0} km</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Max Altitude</span>
                <span className="text-lg font-mono font-medium text-text-primary">{stats.max_altitude || 0} m</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Samples</span>
                <span className="text-lg font-mono font-medium text-text-primary">{(telemetryData || []).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-elevated border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> Final Position
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-text-secondary">Latitude</span>
                <span className="text-sm font-mono text-text-primary">{currentLocation?.latitude?.toFixed(6) || '---'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-text-secondary">Longitude</span>
                <span className="text-sm font-mono text-text-primary">{currentLocation?.longitude?.toFixed(6) || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Altitude</span>
                <span className="text-sm font-mono text-text-primary">{currentLocation?.altitude?.toFixed(1) || '---'} m</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: MAP VISUALIZATION */}
        <div className="lg:col-span-3 bg-surface-elevated border border-border rounded-lg relative overflow-hidden shadow-sm flex flex-col min-h-[500px]">
          <div className="absolute top-4 left-4 z-[400] flex bg-background/90 backdrop-blur rounded shadow border border-border p-1">
            <button 
              onClick={() => setMapMode('2D')} 
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${mapMode === '2D' ? 'bg-telemetry text-background' : 'text-text-muted hover:text-text-primary'}`}
            >
              2D Route
            </button>
            <button 
              onClick={() => setMapMode('3D')} 
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${mapMode === '3D' ? 'bg-telemetry text-background' : 'text-text-muted hover:text-text-primary'}`}
            >
              3D Terrain
            </button>
          </div>
          
          <div className="flex-1 w-full h-full relative z-0">
            {mapMode === '2D' ? (
              <MissionMap 
                missionId={missionId}
                flightPath={flightPath}
                currentLocation={currentLocation}
                hotspots={dashboardData?.hotspots || []}
                telemetry={dashboardData?.current_environment || []}
              />
            ) : (
              <MissionMap3D 
                missionId={missionId}
                flightPath={flightPath}
                currentLocation={currentLocation}
                hotspots={dashboardData?.hotspots || []}
                telemetry={dashboardData?.current_environment || []}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
