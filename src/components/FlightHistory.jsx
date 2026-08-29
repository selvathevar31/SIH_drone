import React, { useState, useEffect } from 'react';
import { getMissions } from '../services/api';
import { Clock, Map, Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import MissionAnalyticsPanel from './MissionAnalyticsPanel';

export default function FlightHistory() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);
        const data = await getMissions();
        setMissions(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMissions();
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getAqiColor = (aqi) => {
    if (!aqi) return 'text-text-muted';
    if (aqi <= 50) return 'text-safe';
    if (aqi <= 100) return 'text-warning';
    return 'text-hazardous';
  };

  if (selectedMissionId) {
    return (
      <MissionAnalyticsPanel 
        missionId={selectedMissionId} 
        onBack={() => setSelectedMissionId(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border overflow-hidden shadow-lg">
      <div className="p-4 lg:p-6 border-b border-border bg-surface-elevated flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase">Flight History</h2>
          <p className="text-sm text-text-secondary mt-1">Review historical missions and aggregate analytics</p>
        </div>
        <div className="bg-telemetry/10 border border-telemetry/30 px-3 py-1.5 rounded-full flex items-center gap-2">
          <Activity className="w-4 h-4 text-telemetry" />
          <span className="text-xs font-bold text-telemetry uppercase tracking-wider">{missions.length} Missions</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-hazardous/10 border border-hazardous/30 text-hazardous rounded p-4 text-center">
            {error}
          </div>
        ) : missions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Map className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold uppercase tracking-widest">No History Found</p>
            <p className="text-sm mt-2">Upload a mission to see history.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {missions.map(mission => (
              <div 
                key={mission.mission_id}
                onClick={() => setSelectedMissionId(mission.mission_id)}
                className="bg-surface-secondary border border-border hover:border-telemetry/50 rounded-lg p-4 cursor-pointer transition-all hover:bg-surface-elevated group"
              >
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-primary text-lg">{mission.mission_id}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${mission.status === 'COMPLETED' ? 'bg-safe/20 text-safe border border-safe/30' : 'bg-surface-elevated text-text-muted border border-border'}`}>
                        {mission.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 
                        {new Date(mission.start_time).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{formatDuration(mission.duration_seconds)}</span>
                      <span>•</span>
                      <span className="font-mono">{mission.distance_km.toFixed(2)} km</span>
                    </div>
                  </div>

                  {/* Analytics Summary */}
                  <div className="flex items-center gap-6 lg:gap-10">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Avg AQI</span>
                      <span className={`font-bold font-mono text-xl ${getAqiColor(mission.average_aqi)}`}>
                        {mission.average_aqi ? mission.average_aqi.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Peak AQI</span>
                      <span className={`font-bold font-mono text-xl ${getAqiColor(mission.peak_aqi)}`}>
                        {mission.peak_aqi || 'N/A'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Hotspots</span>
                      <div className="flex items-center gap-1">
                        {mission.hotspot_count > 0 && <AlertTriangle className="w-4 h-4 text-warning" />}
                        <span className={`font-bold font-mono text-xl ${mission.hotspot_count > 0 ? 'text-warning' : 'text-text-muted'}`}>
                          {mission.hotspot_count}
                        </span>
                      </div>
                    </div>

                    <div className="pl-4 border-l border-border/50 text-telemetry opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
