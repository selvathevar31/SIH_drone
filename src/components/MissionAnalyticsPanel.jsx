import React, { useState, useEffect } from 'react';
import { getMissionAnalytics } from '../services/api';
import { ArrowLeft, Wind, Thermometer, Droplets, MapPin, Navigation, Clock, Activity, AlertTriangle } from 'lucide-react';

export default function MissionAnalyticsPanel({ missionId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getMissionAnalytics(missionId);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [missionId]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border">
        <div className="p-4 border-b border-border bg-surface-elevated">
          <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin"></div>
            <div className="text-telemetry font-mono uppercase tracking-widest text-sm">Aggregating Analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border">
        <div className="p-4 border-b border-border bg-surface-elevated">
          <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="p-6">
          <div className="bg-hazardous/10 border border-hazardous/30 text-hazardous rounded p-4 text-center">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { mission, flight, environment, hotspots } = data;

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const MetricBox = ({ label, value, unit, icon: Icon, color = "text-telemetry", highlight = false }) => (
    <div className={`flex flex-col gap-2 p-4 rounded bg-surface-secondary border ${highlight ? 'border-telemetry/50' : 'border-border'}`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`font-mono font-bold text-2xl ${color}`}>
          {value !== null && value !== undefined ? value : 'N/A'}
        </span>
        {unit && value !== null && value !== undefined && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
    </div>
  );

  const EnvMetricRow = ({ label, metric, unit, color = "text-text-primary", threshold = null }) => {
    const getValueColor = (val) => {
      if (!val) return 'text-text-muted';
      if (!threshold) return color;
      if (val > threshold * 2) return 'text-hazardous';
      if (val > threshold) return 'text-warning';
      return color;
    };

    return (
      <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
        <span className="text-sm text-text-secondary font-medium tracking-wide w-32">{label}</span>
        
        <div className="flex-1 grid grid-cols-3 gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Avg</span>
            <span className={`font-mono text-sm font-bold ${getValueColor(metric.average)}`}>
              {metric.average !== null ? metric.average.toFixed(1) : '-'}
              {unit && metric.average !== null && <span className="text-[10px] opacity-70 ml-0.5">{unit}</span>}
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Peak</span>
            <span className={`font-mono text-sm font-bold ${getValueColor(metric.maximum)}`}>
              {metric.maximum !== null ? metric.maximum.toFixed(1) : '-'}
              {unit && metric.maximum !== null && <span className="text-[10px] opacity-70 ml-0.5">{unit}</span>}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Min</span>
            <span className={`font-mono text-sm font-bold text-text-secondary`}>
              {metric.minimum !== null ? metric.minimum.toFixed(1) : '-'}
              {unit && metric.minimum !== null && <span className="text-[10px] opacity-70 ml-0.5">{unit}</span>}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-primary rounded-lg border border-border overflow-hidden shadow-lg">
      <div className="p-4 lg:p-6 border-b border-border bg-surface-elevated flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-widest uppercase">
              Mission <span className="text-telemetry">{mission.mission_id}</span>
            </h2>
            <p className="text-xs text-text-secondary mt-1 font-mono">{new Date(mission.start_time).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* FLIGHT ANALYTICS */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Navigation className="w-4 h-4" /> Flight Overview
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricBox 
                label="Total Distance" 
                value={flight.distance_km ? flight.distance_km.toFixed(2) : 0} 
                unit="km" 
                icon={MapPin}
                highlight={true}
              />
              <MetricBox 
                label="Duration" 
                value={formatDuration(flight.duration_seconds)}
                icon={Clock}
              />
              <MetricBox 
                label="Avg Speed" 
                value={flight.average_speed ? flight.average_speed.toFixed(1) : 0} 
                unit="m/s"
                icon={Activity}
                color="text-text-primary"
              />
              <MetricBox 
                label="Max Speed" 
                value={flight.max_speed ? flight.max_speed.toFixed(1) : 0} 
                unit="m/s"
                icon={Activity}
                color="text-text-primary"
              />
              <MetricBox 
                label="Max Altitude" 
                value={flight.max_altitude ? flight.max_altitude.toFixed(1) : 0} 
                unit="m"
                color="text-text-primary"
              />
              <MetricBox 
                label="Total Readings" 
                value={flight.total_readings}
                color="text-text-primary"
              />
            </div>
          </div>

          {/* ENVIRONMENT ANALYTICS */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Wind className="w-4 h-4" /> Environmental Metrics
            </h3>
            
            <div className="bg-surface-secondary border border-border rounded p-4 flex flex-col">
              <EnvMetricRow label="Air Quality Index" metric={environment.aqi} color="text-safe" threshold={50} />
              <EnvMetricRow label="PM2.5" metric={environment.pm25} unit="µg/m³" threshold={25} />
              <EnvMetricRow label="PM10" metric={environment.pm10} unit="µg/m³" threshold={50} />
              <EnvMetricRow label="PM1.0" metric={environment.pm1} unit="µg/m³" />
              
              <div className="mt-4 pt-4 border-t border-border border-dashed flex flex-col">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-secondary font-medium tracking-wide flex items-center gap-2">
                    <Thermometer className="w-4 h-4" /> Temperature
                  </span>
                  <div className="flex gap-6">
                    <span className="font-mono text-sm text-text-primary">Avg: <strong className="text-telemetry">{environment.temperature.average?.toFixed(1)}°C</strong></span>
                    <span className="font-mono text-sm text-text-secondary">Peak: {environment.temperature.maximum?.toFixed(1)}°C</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-secondary font-medium tracking-wide flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> Humidity
                  </span>
                  <div className="flex gap-6">
                    <span className="font-mono text-sm text-text-primary">Avg: <strong className="text-telemetry">{environment.humidity.average?.toFixed(1)}%</strong></span>
                    <span className="font-mono text-sm text-text-secondary">Peak: {environment.humidity.maximum?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HOTSPOTS ANALYTICS */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Hotspot Analysis
            </h3>

            <div className={`border rounded p-6 flex items-center justify-between ${hotspots.count > 0 ? 'bg-hazardous/5 border-hazardous/30' : 'bg-surface-secondary border-border'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hotspots.count > 0 ? 'bg-hazardous/20 text-hazardous' : 'bg-safe/20 text-safe'}`}>
                  {hotspots.count > 0 ? <AlertTriangle className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className={`text-xl font-bold tracking-wide ${hotspots.count > 0 ? 'text-hazardous' : 'text-safe'}`}>
                    {hotspots.count} Hotspot{hotspots.count !== 1 ? 's' : ''} Detected
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {hotspots.count > 0 
                      ? "High concentration pollution zones identified during flight."
                      : "No major pollution anomalies detected during this mission."}
                  </p>
                </div>
              </div>

              {hotspots.count > 0 && (
                <div className="flex gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Highest AQI Zone</span>
                    <span className="font-mono text-2xl font-bold text-hazardous">{hotspots.highest_aqi}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Avg Zone AQI</span>
                    <span className="font-mono text-2xl font-bold text-warning">{hotspots.average_aqi?.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
