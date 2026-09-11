import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Thermometer, MapPin, Info, Activity, Terminal, X } from 'lucide-react';
import { cityColor } from './DatasetSelector';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// ─── Scales & Thresholds ──────────────────────────────────────────────────────
const METRICS = ['AQI', 'PM2.5', 'PM10'];

const METRIC_CONFIG = {
  'AQI': {
    property: 'aqi',
    max: 300,
    ranges: [
      { max: 50, color: '#22C55E', label: 'Good' },
      { max: 100, color: '#EAB308', label: 'Mod' },
      { max: 150, color: '#F97316', label: 'USG' },
      { max: 200, color: '#EF4444', label: 'Bad' },
      { max: Infinity, color: '#7F1D1D', label: 'V.Bad' }
    ]
  },
  'PM2.5': {
    property: 'pm25',
    max: 150,
    ranges: [
      { max: 12, color: '#22C55E', label: 'Good' },
      { max: 35.4, color: '#EAB308', label: 'Mod' },
      { max: 55.4, color: '#F97316', label: 'USG' },
      { max: 150.4, color: '#EF4444', label: 'Bad' },
      { max: Infinity, color: '#7F1D1D', label: 'V.Bad' }
    ]
  },
  'PM10': {
    property: 'pm10',
    max: 350,
    ranges: [
      { max: 54, color: '#22C55E', label: 'Good' },
      { max: 154, color: '#EAB308', label: 'Mod' },
      { max: 254, color: '#F97316', label: 'USG' },
      { max: 354, color: '#EF4444', label: 'Bad' },
      { max: Infinity, color: '#7F1D1D', label: 'V.Bad' }
    ]
  }
};

function getMetricMeta(value, metric) {
  if (!isFinite(value) || value === null) return { color: '#6B7280', label: 'Unknown' };
  const ranges = METRIC_CONFIG[metric].ranges;
  for (const r of ranges) {
    if (value <= r.max) return r;
  }
  return ranges[ranges.length - 1];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AQIHeatmap({ datasets, activeDatasetId, hoveredDatasetId, onDatasetHover }) {
  const [selectedMetric, setSelectedMetric] = useState('AQI');
  const [hoverInfo, setHoverInfo] = useState(null);
  const mapRef = useRef();

  // Debug State
  const [debugLog, setDebugLog] = useState([]);
  const addDebug = (msg) => setDebugLog(prev => [...prev.slice(-4), msg]);

  useEffect(() => {
    if (MAPBOX_TOKEN) addDebug("Token loaded successfully.");
    else addDebug("ERROR: Mapbox Token missing!");
  }, []);

  const config = METRIC_CONFIG[selectedMetric];

  // Resolve active dataset safely
  const resolvedDatasets = useMemo(() => datasets || [], [datasets]);
  const activeDs = resolvedDatasets.find(d => d.missionId === (activeDatasetId || resolvedDatasets[0]?.missionId));

  // ─── Build GeoJSON FeatureCollection ─────────────────────────────────────────
  const geojson = useMemo(() => {
    const features = [];
    
    if (activeDs) {
      const dsIdx = resolvedDatasets.indexOf(activeDs);
      const dsColor = cityColor(dsIdx >= 0 ? dsIdx : 0);
      
      const pts = (activeDs.telemetry || []).filter(p => 
        isFinite(p.latitude) && isFinite(p.longitude) && 
        p.latitude > -90 && p.latitude < 90 && 
        p.longitude > -180 && p.longitude < 180
      );

      pts.forEach(p => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          properties: {
            aqi: isFinite(p.aqi) ? p.aqi : 0,
            pm25: isFinite(p.pm25) ? p.pm25 : 0,
            pm10: isFinite(p.pm10) ? p.pm10 : 0,
            altitude: p.altitude,
            timestamp: p.timestamp,
            missionId: activeDs.missionId,
            cityLabel: activeDs.cityLabel,
            dsColor: dsColor,
            isActive: 1
          }
        });
      });
    }
    
    return { type: 'FeatureCollection', features };
  }, [activeDs, resolvedDatasets]);

  useEffect(() => {
    addDebug(`GeoJSON generated with ${geojson.features.length} points.`);
  }, [geojson]);

  // Compute map initial bounds
  const initialViewState = useMemo(() => {
    if (!geojson.features.length) {
      return { longitude: 73.0, latitude: 19.0, zoom: 4 }; // Default India
    }
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    geojson.features.forEach(f => {
      const [lon, lat] = f.geometry.coordinates;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    const center = {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: 11
    };
    return center;
  }, [geojson]);

  // Handle map loading and resize bugs
  const onMapLoad = useCallback((e) => {
    addDebug("Map loaded successfully.");
    const map = mapRef.current?.getMap();
    if (map) {
      map.resize();
      addDebug(`Style loaded: ${map.getStyle()?.name || 'unknown'}`);
    }
  }, []);

  const onMapError = useCallback((e) => {
    addDebug(`Map Error: ${e.error?.message || 'Unknown error'}`);
    console.error("Mapbox Error:", e);
  }, []);

  useEffect(() => {
    // Force a resize after 500ms to ensure the layout has settled
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        addDebug("Forced resize completed.");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ─── Mapbox Layers ──────────────────────────────────────────────────────────
  
  // The heatmap layer
  const heatmapLayer = {
    id: 'pollution-heatmap',
    type: 'heatmap',
    source: 'pollution',
    maxzoom: 16,
    paint: {
      'heatmap-weight': [
        'interpolate', ['linear'], ['get', config.property],
        0, 0,
        config.max * 0.2, 0.1,
        config.max * 0.4, 0.3,
        config.max * 0.7, 0.6,
        config.max, 1.5
      ],
      // Intensity scales UP as you zoom IN
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        9, 0.5,
        12, 1.2,
        16, 2.5
      ],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(34, 197, 94, 0)',
        0.1, '#22C55E', // Low (Green)
        0.3, '#84CC16', // Moderate (Yellow-Green)
        0.5, '#FACC15', // Elevated (Yellow)
        0.7, '#F97316', // High (Orange)
        0.9, '#EF4444', // Very High (Red)
        1.0, '#991B1B'  // Critical (Dark Red Core)
      ],
      // Radius DECREASES as you zoom IN
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 60,
        9, 60,  // Large smooth influence when zoomed out
        12, 35, // Starts reducing
        15, 20, // Tighter cores
        18, 15  // Very distinct at street level
      ],
      'heatmap-opacity': [
        'interpolate', ['linear'], ['zoom'],
        7, 0.5,
        15, 0.8
      ]
    }
  };

  // The point layer (secondary evidence)
  const circleLayer = {
    id: 'pollution-points',
    type: 'circle',
    source: 'pollution',
    minzoom: 11,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        11, 2,
        16, ['interpolate', ['linear'], ['get', config.property], 0, 4, config.max, 7]
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', config.property],
        0, '#22C55E',
        config.max * 0.2, '#84CC16',
        config.max * 0.4, '#FACC15',
        config.max * 0.6, '#F97316',
        config.max * 0.8, '#EF4444',
        config.max, '#991B1B'
      ],
      // Points fade in as you zoom in
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        11, 0,
        13, 0.4,
        16, 0.9
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255, 255, 255, 0.9)'
    }
  };

  // ─── Interaction Handlers ───────────────────────────────────────────────────
  const onHover = useCallback(event => {
    const { features, point } = event;
    const hoveredFeature = features && features[0];

    if (hoveredFeature && point) {
      setHoverInfo({
        feature: hoveredFeature,
        x: point.x,
        y: point.y
      });
      if (onDatasetHover) onDatasetHover(hoveredFeature.properties.missionId);
    } else {
      setHoverInfo(null);
      if (onDatasetHover) onDatasetHover(null);
    }
  }, [onDatasetHover]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!activeDs || !activeDs.telemetry) return null;
    const vals = activeDs.telemetry.map(p => p[config.property]).filter(isFinite);
    if (!vals.length) return null;
    return {
      min: Math.min(...vals), 
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length
    };
  }, [activeDs, config.property]);

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 border-b border-border bg-surface-primary z-10">
        <div className="flex flex-col">
          <h2 className="text-[12px] font-bold tracking-[0.15em] text-surface-dark uppercase mb-1">Pollution Heatmap</h2>
          <p className="text-[10px] font-medium text-text-secondary tracking-wide">
            Spatial pollution distribution
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex gap-2 z-20 pointer-events-auto">
          {METRICS.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-3.5 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase rounded transition-colors ${
                selectedMetric === m ? 'bg-telemetry/10 text-telemetry border border-telemetry/20' : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary border border-transparent'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {stats && (
          <div className="hidden xl:flex items-center gap-4 font-mono text-[10px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-text-muted" />{stats.count} points
            </span>
            <span>Peak <b style={{ color: getMetricMeta(stats.max, selectedMetric).color }}>{stats.max.toFixed(0)}</b></span>
          </div>
        )}
      </div>

      {/* Map Viewport */}
      <div className="relative flex-1 w-full min-h-[400px] bg-surface-secondary">
        
        {/* On-screen Debug Panel - Hidden in Production UI */}
        {/*
        <div className="absolute top-4 left-4 z-[400] bg-surface-elevated/90 border border-border/50 rounded shadow-2xl p-3 w-64 pointer-events-none backdrop-blur-md">
           <div className="flex items-center gap-2 mb-2 border-b border-border/50 pb-2">
             <Terminal className="w-3 h-3 text-amber-400" />
             <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">Mapbox Debug</span>
           </div>
           <div className="flex flex-col gap-1 text-[10px] font-mono text-text-secondary">
             <div><span className="text-text-muted">Center:</span> {initialViewState.latitude.toFixed(4)}, {initialViewState.longitude.toFixed(4)}</div>
             <div><span className="text-text-muted">Zoom:</span> {initialViewState.zoom}</div>
             <div><span className="text-text-muted">Features:</span> {geojson.features.length}</div>
             <div className="mt-1 pt-1 border-t border-border/50 flex flex-col gap-0.5">
               {debugLog.map((log, i) => (
                 <div key={i} className="truncate text-amber-200 opacity-80" title={log}>&gt; {log}</div>
               ))}
             </div>
           </div>
        </div>
        */}

        {!geojson.features.length && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <Info className="w-10 h-10 text-border mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">No geospatial data available</p>
          </div>
        )}
        
        {MAPBOX_TOKEN ? (
          <Map
            ref={mapRef}
            initialViewState={initialViewState}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%', minHeight: '500px', position: 'absolute', top: 0, left: 0 }}
            interactiveLayerIds={['pollution-points']}
            onMouseMove={onHover}
            onMouseLeave={() => onHover({ features: [] })}
            onLoad={onMapLoad}
            onError={onMapError}
          >
            <Source id="pollution" type="geojson" data={geojson}>
              <Layer {...heatmapLayer} />
              <Layer {...circleLayer} />
            </Source>
            <NavigationControl position="bottom-right" />
            
            {hoverInfo && hoverInfo.feature && (
              <Popup
                longitude={hoverInfo.feature.geometry.coordinates[0]}
                latitude={hoverInfo.feature.geometry.coordinates[1]}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={15}
                className="fluxx-mapbox-popup"
                maxWidth="300px"
              >
                <div className="bg-surface-primary p-4 rounded-[12px] shadow-card text-text-primary relative" style={{ minWidth: '220px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setHoverInfo(null); }}
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full border border-border bg-surface-secondary text-text-muted hover:text-text-primary hover:bg-border transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2 mb-3 pr-6">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hoverInfo.feature.properties.dsColor || '#08A6B8' }} />
                    <span className="text-[12px] font-bold uppercase tracking-widest text-text-primary">
                      {hoverInfo.feature.properties.cityLabel || 'Observation'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-text-secondary flex flex-col gap-2">
                    {['AQI', 'PM2.5', 'PM10'].map(k => {
                      const val = hoverInfo.feature.properties[k.toLowerCase().replace('.', '')];
                      const isSelected = selectedMetric === k;
                      const meta = getMetricMeta(val, k);
                      return (
                        <div key={k} className={`flex justify-between items-center ${isSelected ? 'bg-telemetry/10 px-2 py-1 -mx-2 rounded-md' : ''}`}>
                          <span className={isSelected ? 'text-text-primary font-bold tracking-wide' : 'tracking-wide'}>{k}</span>
                          <div className="flex items-center gap-2">
                            {isSelected && <Activity className="w-3 h-3 text-telemetry" />}
                            <span className="font-bold text-[12px]" style={{ color: meta.color }}>
                              {val ? val.toFixed(1) : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between mt-2 pt-2 border-t border-border">
                      <span className="tracking-wide">Altitude:</span>
                      <span className="text-text-primary font-bold">
                        {hoverInfo.feature.properties.altitude ? `${hoverInfo.feature.properties.altitude.toFixed(1)} m` : '—'}
                      </span>
                    </div>
                    {hoverInfo.feature.properties.timestamp && (
                      <div className="flex justify-between mt-1">
                        <span className="tracking-wide">Time:</span>
                        <span className="text-text-primary font-bold">{new Date(hoverInfo.feature.properties.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-6 right-6 bg-surface-primary border border-border shadow-card rounded-lg px-4 py-3 z-20 pointer-events-auto flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Low</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">High</span>
              </div>
              <div className="w-64 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #22C55E, #84CC16, #FACC15, #F97316, #EF4444, #991B1B)' }} />
              <div className="flex justify-between w-64 mt-1">
                <span className="text-[9px] font-mono text-text-muted">0</span>
                <span className="text-[9px] font-mono text-text-muted">{Math.round(config.max * 0.2)}</span>
                <span className="text-[9px] font-mono text-text-muted">{Math.round(config.max * 0.4)}</span>
                <span className="text-[9px] font-mono text-text-muted">{Math.round(config.max * 0.6)}</span>
                <span className="text-[9px] font-mono text-text-muted">{Math.round(config.max * 0.8)}</span>
                <span className="text-[9px] font-mono text-text-muted">{config.max}</span>
              </div>
            </div>
          </Map>
        ) : (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <Info className="w-10 h-10 text-hazardous mb-3" />
            <p className="text-hazardous font-mono text-xs uppercase tracking-widest">Mapbox Token Missing</p>
          </div>
        )}
      </div>

      <style>{`
        .fluxx-mapbox-popup .mapboxgl-popup-content {
          background: transparent;
          padding: 0;
          box-shadow: none;
        }
        .fluxx-mapbox-popup .mapboxgl-popup-tip {
          border-top-color: #FFFFFF; /* surface-elevated */
        }
      `}</style>
    </div>
  );
}
