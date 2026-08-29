import React, { useState, useEffect } from 'react';
import { getPollutionZones, getPersistentHotspots } from '../services/api';
import { Map, AlertTriangle, Wind, Info } from 'lucide-react';

export default function ZonesPanel({ missionId }) {
  const [zonesData, setZonesData] = useState(null);
  const [persistentData, setPersistentData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!missionId) return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [zData, pData] = await Promise.all([
          getPollutionZones(missionId),
          getPersistentHotspots()
        ]);
        
        if (isMounted) {
          setZonesData(zData);
          setPersistentData(pData);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    
    return () => { isMounted = false; };
  }, [missionId]);

  if (loading) {
    return (
      <div className="flex flex-col border border-border bg-surface-primary p-6 rounded-lg min-h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
        <div className="mt-4 text-telemetry font-mono uppercase tracking-widest text-sm">Clustering Zones...</div>
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

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'GOOD': return 'text-safe bg-safe/10 border-safe/30';
      case 'MODERATE': return 'text-warning bg-warning/10 border-warning/30';
      case 'POOR': 
      case 'VERY_POOR':
      case 'SEVERE': return 'text-hazardous bg-hazardous/10 border-hazardous/30';
      default: return 'text-text-muted bg-surface-secondary border-border';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* Pollution Zones */}
      <div className="bg-surface-primary border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-border bg-surface-elevated flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <Map className="w-5 h-5 text-telemetry" /> Pollution Zones
          </h3>
          <span className="px-2 py-1 rounded bg-surface-secondary border border-border text-xs font-mono text-text-muted">
            {zonesData?.zones?.length || 0} Detected
          </span>
        </div>

        <div className="p-4 lg:p-6">
          {(!zonesData || !zonesData.zones || zonesData.zones.length === 0) ? (
            <div className="text-center text-text-muted py-8">
              No pollution zones clustered for this mission.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {zonesData.zones.map((zone, idx) => (
                <div key={idx} className="bg-surface-secondary border border-border rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-border/50 pb-2">
                    <span className="font-mono font-bold text-telemetry">{zone.zone_id}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityStyle(zone.severity)}`}>
                      {zone.severity || 'UNKNOWN'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">Avg AQI</span>
                      <span className="font-mono text-lg font-bold text-text-primary">{Math.round(zone.aqi.average)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">PM2.5</span>
                      <span className="font-mono text-lg text-text-primary">{zone.pm25?.average ? Math.round(zone.pm25.average) : '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">PM10</span>
                      <span className="font-mono text-lg text-text-primary">{zone.pm10?.average ? Math.round(zone.pm10.average) : '-'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-border/50">
                    <span className="text-text-secondary">{zone.measurement_count} pts</span>
                    {zone.dominant_pollutant ? (
                       <span className="text-hazardous font-bold uppercase flex items-center gap-1">
                         <Wind className="w-3 h-3" /> {zone.dominant_pollutant}
                       </span>
                    ) : (
                       <span className="text-text-muted">N/A</span>
                    )}
                  </div>

                  {/* Step 7: Zone Intelligence */}
                  {zone.priority && (
                    <div className="mt-2 pt-3 border-t border-border/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">Priority</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${zone.priority.classification === 'CRITICAL' || zone.priority.classification === 'HIGH' ? 'bg-hazardous/20 text-hazardous' : 'bg-surface-elevated text-text-primary'}`}>
                          {zone.priority.classification} · {zone.priority.score}
                        </span>
                      </div>
                      
                      {zone.altitude && zone.altitude.min_meters !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-text-muted">Altitude</span>
                          <span className="text-xs font-mono text-text-secondary">
                            {Math.round(zone.altitude.min_meters)}–{Math.round(zone.altitude.max_meters)}m
                          </span>
                        </div>
                      )}

                      <div className="bg-surface-primary border border-border rounded p-2 mt-1">
                        <span className="block text-[10px] text-text-muted uppercase mb-1 font-bold">ACTION</span>
                        <span className="text-xs text-text-primary leading-tight">
                          {zone.priority.recommendation}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Persistent Hotspots */}
      <div className="bg-surface-primary border border-border rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-4 lg:px-6 py-4 border-b border-border bg-surface-elevated flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-hazardous" /> Persistent Hotspots
          </h3>
          {persistentData?.status === 'OK' && (
            <span className="px-2 py-1 rounded bg-hazardous/20 border border-hazardous/30 text-xs font-mono text-hazardous font-bold">
              {persistentData?.total || 0} Persistent
            </span>
          )}
        </div>

        <div className="p-4 lg:p-6">
          {persistentData?.status === 'INSUFFICIENT_DATA' ? (
            <div className="flex items-center gap-3 text-warning bg-warning/10 border border-warning/30 p-4 rounded text-sm">
              <Info className="w-5 h-5 shrink-0" />
              <span>{persistentData.message}</span>
            </div>
          ) : (!persistentData || !persistentData.persistent_hotspots || persistentData.persistent_hotspots.length === 0) ? (
            <div className="text-center text-text-muted py-8">
              No persistent hotspots detected across multiple surveys.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {persistentData.persistent_hotspots.map((ph, i) => (
                <div key={i} className="flex flex-col md:flex-row bg-surface-secondary border border-border rounded-lg p-4 justify-between items-center gap-4">
                  <div className="flex flex-col w-full md:w-auto">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-hazardous text-lg">{ph.hotspot_id}</span>
                      <span className="text-xs bg-surface-elevated border border-border rounded px-2 py-0.5 text-text-muted">
                        Detected in {ph.surveys_detected} surveys
                      </span>
                    </div>
                    <div className="text-xs font-mono text-text-secondary">
                      {ph.latitude.toFixed(5)}, {ph.longitude.toFixed(5)}
                    </div>
                  </div>
                  
                  <div className="flex gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest">Avg AQI</span>
                      <span className="font-mono font-bold text-xl">{Math.round(ph.average_aqi)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest">Peak AQI</span>
                      <span className="font-mono font-bold text-xl text-hazardous">{ph.peak_aqi}</span>
                    </div>
                  </div>

                  {/* Step 7: Hotspot Intelligence */}
                  {(ph.trend_analysis || ph.priority) && (
                    <div className="w-full mt-2 pt-3 border-t border-border/50 flex flex-col gap-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {ph.trend_analysis && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted uppercase">Trend</span>
                            <span className={`text-sm font-bold ${ph.trend_analysis.trend === 'WORSENING' ? 'text-hazardous' : ph.trend_analysis.trend === 'IMPROVING' ? 'text-safe' : 'text-text-secondary'}`}>
                              {ph.trend_analysis.trend === 'WORSENING' ? '↑ ' : ph.trend_analysis.trend === 'IMPROVING' ? '↓ ' : '→ '}
                              {ph.trend_analysis.trend} {ph.trend_analysis.percentage !== null && `(${ph.trend_analysis.percentage > 0 ? '+' : ''}${ph.trend_analysis.percentage}%)`}
                            </span>
                          </div>
                        )}
                        
                        {ph.priority && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted uppercase">Priority</span>
                            <span className={`text-sm font-bold ${ph.priority.classification === 'CRITICAL' || ph.priority.classification === 'HIGH' ? 'text-hazardous' : 'text-text-secondary'}`}>
                              {ph.priority.classification} · {ph.priority.score}
                            </span>
                          </div>
                        )}
                        
                        {ph.altitude && ph.altitude.min_meters !== null && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted uppercase">Altitude</span>
                            <span className="text-sm font-mono text-text-secondary">
                              {Math.round(ph.altitude.min_meters)}–{Math.round(ph.altitude.max_meters)}m
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {ph.priority && (
                        <div className="bg-surface-primary border border-border rounded p-3 mt-2">
                          <span className="block text-[10px] text-text-muted uppercase mb-1 font-bold">ACTION</span>
                          <span className="text-sm text-text-primary">
                            {ph.priority.recommendation}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
