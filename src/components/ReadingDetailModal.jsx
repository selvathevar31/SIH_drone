import React from 'react';
import { X, MapPin } from 'lucide-react';

export default function ReadingDetailModal({ reading, onClose, onLocate }) {
  if (!reading) return null;

  const getSeverityColor = (severity) => {
    if (!severity) return '#EF4444'; 
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
    if (s.includes('very poor')) return '#EF4444';
    if (s.includes('poor')) return '#F97316';
    if (s.includes('moderate')) return '#EAB308';
    if (s.includes('satisfactory')) return '#84CC16';
    if (s.includes('good')) return '#22C55E';
    return '#EF4444';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface-primary border border-border rounded-lg shadow-2xl w-full max-w-lg flex flex-col relative overflow-hidden">
        
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-elevated">
          <h3 className="font-bold text-text-primary tracking-wide uppercase">Reading Details</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 font-mono text-sm flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            
            <div className="bg-surface-secondary border border-border/50 p-3 rounded">
                <span className="block text-[10px] uppercase tracking-widest text-text-muted mb-1 font-sans">Identity</span>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">ID</span>
                    <span className="text-text-primary">{reading.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Mission</span>
                    <span className="text-text-primary text-xs">{reading.mission_id}</span>
                </div>
                <div className="flex flex-col py-1 mt-1">
                    <span className="text-text-secondary">Timestamp</span>
                    <span className="text-telemetry">{new Date(reading.timestamp).toLocaleString()}</span>
                </div>
            </div>

            <div className="bg-surface-secondary border border-border/50 p-3 rounded">
                <span className="block text-[10px] uppercase tracking-widest text-text-muted mb-1 font-sans">Coordinates</span>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Lat</span>
                    <span className="text-text-primary">{reading.latitude?.toFixed(6)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Lng</span>
                    <span className="text-text-primary">{reading.longitude?.toFixed(6)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Alt</span>
                    <span className="text-text-primary">{reading.altitude != null ? `${reading.altitude.toFixed(1)} m` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 mt-1">
                    <span className="text-text-secondary">Satellites</span>
                    <span className="text-text-primary">{reading.satellites ?? 'N/A'}</span>
                </div>
            </div>

          </div>

          <div className="bg-surface-secondary border border-border/50 p-3 rounded">
            <span className="block text-[10px] uppercase tracking-widest text-text-muted mb-1 font-sans">Environmental Data</span>
            <div className="grid grid-cols-2 gap-x-6">
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">AQI</span>
                    <span className="font-bold" style={{color: getSeverityColor(reading.aqi_category)}}>{reading.aqi ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Category</span>
                    <span className="font-bold uppercase" style={{color: getSeverityColor(reading.aqi_category)}}>{reading.aqi_category ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">PM1</span>
                    <span className="text-text-primary">{reading.pm1 != null ? `${reading.pm1} µg/m³` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">PM2.5</span>
                    <span className="text-text-primary">{reading.pm25 != null ? `${reading.pm25} µg/m³` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">PM10</span>
                    <span className="text-text-primary">{reading.pm10 != null ? `${reading.pm10} µg/m³` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-text-secondary">Temp</span>
                    <span className="text-text-primary">{reading.temperature != null ? `${reading.temperature} °C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                    <span className="text-text-secondary">Humidity</span>
                    <span className="text-text-primary">{reading.humidity != null ? `${reading.humidity} %` : 'N/A'}</span>
                </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              onClick={onLocate}
              className="flex-1 py-3 bg-telemetry/10 hover:bg-telemetry/20 text-telemetry border border-telemetry/50 rounded font-bold uppercase tracking-wide font-sans transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" /> Locate on Map
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary border border-border rounded font-bold uppercase tracking-wide font-sans transition-colors"
            >
              Close
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
