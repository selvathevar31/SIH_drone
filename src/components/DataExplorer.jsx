import React, { useState, useEffect, useCallback } from 'react';
import { Database, Download, RefreshCw, ChevronLeft, ChevronRight, Filter, AlertCircle, X, Search, Activity, MapPin } from 'lucide-react';
import { getMissionReadings, downloadMissionReadingsCSV } from '../services/api';
import ReadingDetailModal from './ReadingDetailModal';

export default function DataExplorer({ missionId, onLocateOnMap }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReading, setSelectedReading] = useState(null);

  // Filters and Pagination
  const defaultFilters = {
    page: 1,
    limit: 50,
    aqi_min: '',
    aqi_max: '',
    pm25_min: '',
    pm25_max: '',
    start_time: '',
    end_time: '',
    sort_by: 'timestamp',
    sort_order: 'desc'
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(defaultFilters);

  // Debounce inputs (useful for typing in min/max)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 400);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    if (!missionId) return;
    
    let isMounted = true;
    const fetchReadings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cleanParams = {};
        Object.keys(debouncedFilters).forEach(k => {
          if (debouncedFilters[k] !== '' && debouncedFilters[k] !== null) {
            cleanParams[k] = debouncedFilters[k];
          }
        });
        
        const response = await getMissionReadings(missionId, cleanParams);
        if (isMounted) {
          setData(response);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };
    
    fetchReadings();
    
    return () => { isMounted = false; };
  }, [missionId, debouncedFilters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to page 1 on any filter change
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExport = () => {
    const cleanParams = {};
    Object.keys(debouncedFilters).forEach(k => {
        if (debouncedFilters[k] !== '' && debouncedFilters[k] !== null && k !== 'page' && k !== 'limit') {
            cleanParams[k] = debouncedFilters[k];
        }
    });
    downloadMissionReadingsCSV(missionId, cleanParams);
  };

  const getSeverityColor = (severity) => {
    if (!severity) return '#EF4444'; 
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return '#7F1D1D';
    if (s.includes('very poor')) return '#EF4444';
    if (s.includes('poor')) return '#F97316';
    if (s.includes('moderate')) return '#EAB308';
    if (s.includes('satisfactory')) return '#84CC16';
    if (s.includes('good')) return '#22C55E';
    return '#text-secondary';
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-[1920px] mx-auto">
      {/* Header and Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-surface-primary border border-border rounded-lg p-4 flex flex-col justify-center">
            <h1 className="text-xl font-bold tracking-widest text-text-primary uppercase flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-telemetry" /> Data Explorer
            </h1>
            <p className="text-xs text-text-muted">Inspect and export raw FLUXX records.</p>
        </div>
        
        <div className="lg:col-span-3 bg-surface-primary border border-border rounded-lg p-4">
            <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Filtered Data Quality
            </h2>
            
            {data?.data_quality ? (
                <div className="flex flex-wrap gap-4 text-xs font-mono">
                    <div className="flex flex-col">
                        <span className="text-text-muted uppercase text-[10px]">Total</span>
                        <span className="text-text-primary text-sm">{data.data_quality.total_readings}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-muted uppercase text-[10px]">Valid GPS</span>
                        <span className="text-safe text-sm">{data.data_quality.valid_gps}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-muted uppercase text-[10px]">Missing PM1</span>
                        <span className={data.data_quality.missing_pm1 > 0 ? "text-hazardous" : "text-text-secondary"}>{data.data_quality.missing_pm1}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-muted uppercase text-[10px]">Missing PM2.5</span>
                        <span className={data.data_quality.missing_pm25 > 0 ? "text-hazardous" : "text-text-secondary"}>{data.data_quality.missing_pm25}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-muted uppercase text-[10px]">Missing PM10</span>
                        <span className={data.data_quality.missing_pm10 > 0 ? "text-hazardous" : "text-text-secondary"}>{data.data_quality.missing_pm10}</span>
                    </div>
                </div>
            ) : (
                <div className="h-8 flex items-center text-xs text-text-muted">Calculating statistics...</div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 bg-surface-primary border border-border rounded-lg p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Database Filters
                </h2>
                <button onClick={resetFilters} className="text-[10px] uppercase font-bold text-hazardous hover:text-red-400 transition-colors">
                    Reset
                </button>
            </div>
            
            <div className="flex flex-col gap-3 text-xs">
                <div>
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">Sort By</label>
                    <select 
                        className="w-full bg-surface-secondary border border-border rounded p-2 text-text-primary outline-none focus:border-telemetry"
                        value={filters.sort_by}
                        onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                    >
                        <option value="timestamp">Timestamp</option>
                        <option value="aqi">AQI</option>
                        <option value="pm25">PM2.5</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">Order</label>
                    <select 
                        className="w-full bg-surface-secondary border border-border rounded p-2 text-text-primary outline-none focus:border-telemetry"
                        value={filters.sort_order}
                        onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                    >
                        <option value="desc">Descending (Highest/Newest first)</option>
                        <option value="asc">Ascending (Lowest/Oldest first)</option>
                    </select>
                </div>

                <div className="border-t border-border/30 pt-3">
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">AQI Range</label>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Min" className="w-1/2 bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.aqi_min} onChange={(e) => handleFilterChange('aqi_min', e.target.value)} />
                        <input type="number" placeholder="Max" className="w-1/2 bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.aqi_max} onChange={(e) => handleFilterChange('aqi_max', e.target.value)} />
                    </div>
                </div>

                <div className="border-t border-border/30 pt-3">
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">PM2.5 Range (µg/m³)</label>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Min" className="w-1/2 bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.pm25_min} onChange={(e) => handleFilterChange('pm25_min', e.target.value)} />
                        <input type="number" placeholder="Max" className="w-1/2 bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.pm25_max} onChange={(e) => handleFilterChange('pm25_max', e.target.value)} />
                    </div>
                </div>
                
                <div className="border-t border-border/30 pt-3">
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">Start Time</label>
                    <input type="datetime-local" step="1" className="w-full bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.start_time} onChange={(e) => handleFilterChange('start_time', e.target.value)} />
                </div>
                
                <div className="border-t border-border/30 pt-3 mb-4">
                    <label className="block text-text-muted uppercase tracking-wider mb-1 text-[10px]">End Time</label>
                    <input type="datetime-local" step="1" className="w-full bg-surface-secondary border border-border rounded p-2 text-text-primary" value={filters.end_time} onChange={(e) => handleFilterChange('end_time', e.target.value)} />
                </div>
                
                <button 
                    onClick={handleExport}
                    className="w-full py-2 bg-telemetry/10 hover:bg-telemetry/20 text-telemetry border border-telemetry/50 rounded flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-colors"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>
        </div>

        {/* Data Table Area */}
        <div className="lg:col-span-3 bg-surface-primary border border-border rounded-lg flex flex-col overflow-hidden">
            
            {/* Table Controls (Pagination) */}
            <div className="p-3 border-b border-border flex items-center justify-between bg-surface-elevated text-xs font-bold uppercase tracking-wide text-text-secondary">
                <div>
                    {data ? `Showing ${data.items.length} of ${data.total} records` : 'Loading...'}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <select 
                            className="bg-surface-secondary border border-border rounded p-1 text-text-primary outline-none"
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={!data || data.page <= 1}
                            onClick={() => handleFilterChange('page', filters.page - 1)}
                            className="p-1 border border-border rounded hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Page {data?.page || 1} of {data?.pages || 1}</span>
                        <button 
                            disabled={!data || data.page >= data.pages}
                            onClick={() => handleFilterChange('page', filters.page + 1)}
                            className="p-1 border border-border rounded hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {error && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-4">
                        <div className="border border-hazardous rounded bg-surface-elevated p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-hazardous mx-auto mb-2" />
                            <h3 className="font-bold text-hazardous mb-1 uppercase tracking-wide">Unable to Load Mission Readings</h3>
                            <p className="text-text-secondary text-sm mb-4">{error}</p>
                            <button 
                                onClick={() => { setError(null); setDebouncedFilters({...debouncedFilters}); }}
                                className="px-4 py-2 bg-surface-secondary hover:bg-surface-elevated border border-border rounded font-bold text-text-primary uppercase tracking-wide text-xs transition-colors flex items-center gap-2 mx-auto"
                            >
                                <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                        </div>
                    </div>
                )}
                
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                        <div className="w-8 h-8 border-2 border-telemetry border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead className="bg-surface-elevated text-text-muted sticky top-0 z-0">
                        <tr>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase">Timestamp</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase">Lat, Lng</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase">Alt (m)</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase">PM2.5</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase text-telemetry">PM2.5 AQI</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase">PM10</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase text-telemetry">PM10 AQI</th>
                            <th className="p-3 border-b border-border font-bold tracking-wider uppercase text-hazardous">Final AQI</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono">
                        {data?.items.map((r, i) => (
                            <tr 
                                key={r.id} 
                                onClick={() => setSelectedReading(r)}
                                className={`border-b border-border/30 hover:bg-surface-elevated cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-surface-primary' : 'bg-surface-secondary/30'}`}
                            >
                                <td className="p-3 text-text-primary">{new Date(r.timestamp).toLocaleString()}</td>
                                <td className="p-3 text-text-secondary">{r.latitude?.toFixed(5)}, {r.longitude?.toFixed(5)}</td>
                                <td className="p-3 text-text-secondary">{r.altitude?.toFixed(1) ?? '-'}</td>
                                <td className="p-3 text-text-secondary">{r.pm25?.toFixed(1) ?? '-'}</td>
                                <td className="p-3 text-telemetry font-bold">{r.pm25_aqi ?? '-'}</td>
                                <td className="p-3 text-text-secondary">{r.pm10?.toFixed(1) ?? '-'}</td>
                                <td className="p-3 text-telemetry font-bold">{r.pm10_aqi ?? '-'}</td>
                                <td className="p-3 font-bold" style={{color: getSeverityColor(r.aqi_category)}}>{r.aqi ?? '-'}</td>
                            </tr>
                        ))}
                        
                        {data?.items.length === 0 && !loading && (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-text-muted uppercase tracking-widest font-sans">
                                    No readings found for this mission.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
      </div>
      
      {/* Reading Detail Modal */}
      {selectedReading && (
          <ReadingDetailModal 
              reading={selectedReading} 
              onClose={() => setSelectedReading(null)} 
              onLocate={() => {
                  setSelectedReading(null);
                  if (onLocateOnMap) onLocateOnMap(selectedReading);
              }}
          />
      )}
    </div>
  );
}
