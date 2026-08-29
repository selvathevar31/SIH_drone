import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, RectangleGraphics, LabelGraphics, CylinderGraphics, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import { Cartesian3, Color, Math as CesiumMath, ScreenSpaceEventType, defined, Ion, Rectangle, Cartesian2, HeadingPitchRange } from 'cesium';
import { Layers, Map, AlertTriangle, Settings, RefreshCw, ChevronDown } from 'lucide-react';
import { getEnvironmentMap, getPollutionZones, getPersistentHotspots } from '../services/api';

if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

export default function Pollution3DMap({ missionId }) {
  const viewerRef = useRef(null);
  
  // Data state
  const [readings, setReadings] = useState([]);
  const [zones, setZones] = useState([]);
  const [persistentHotspots, setPersistentHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Control state
  const [pollutant, setPollutant] = useState('AQI'); // AQI, PM2.5, PM10
  const [zScale, setZScale] = useState(5); // Default vertical exaggeration
  const [showReadings, setShowReadings] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showPersistent, setShowPersistent] = useState(true);
  
  // Altitude filter
  const [altMin, setAltMin] = useState(0);
  const [altMax, setAltMax] = useState(500);

  // Interaction
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [controlsOpen, setControlsOpen] = useState(true);

  // Fetch data
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!missionId) return;
      setLoading(true);
      setError(null);
      
      try {
        const [readingsData, zonesData, hotspotsData] = await Promise.all([
          getEnvironmentMap(missionId),
          getPollutionZones(missionId).catch(() => ({ zones: [] })),
          getPersistentHotspots().catch(() => ({ persistent_hotspots: [] }))
        ]);
        
        if (isMounted) {
          setReadings(readingsData);
          setZones(zonesData.zones || []);
          setPersistentHotspots(hotspotsData.persistent_hotspots || []);
          
          // Auto-set alt max if readings exist
          if (readingsData.length > 0) {
            const maxAlt = Math.max(...readingsData.map(r => r.altitude || 0));
            setAltMax(Math.ceil(maxAlt + 50));
          }
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

  // View fit
  const handleResetView = () => {
    setZScale(5); // Restore default vertical scale
    if (!viewerRef.current?.cesiumElement || readings.length === 0) return;
    const viewer = viewerRef.current.cesiumElement;
    
    const lats = readings.map(r => r.latitude).filter(l => l != null);
    const lngs = readings.map(r => r.longitude).filter(l => l != null);
    if (lats.length === 0) return;
      
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const maxAlt = Math.max(...readings.map(r => (r.altitude || 0) * zScale));
    
    // Position camera south of the center, looking north and slightly down
    const offsetLat = (maxLat - minLat) * 1.5 || 0.01;
    // Base camera altitude on geographic spread and max altitude
    const cameraAlt = maxAlt + 300 + ((maxLat - minLat) * 111000 * 0.5); 
    
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centerLng, centerLat - offsetLat, cameraAlt),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-25),
        roll: 0.0
      },
      duration: 1.5
    });
  };

  // Initial fit
  useEffect(() => {
    if (!loading && readings.length > 0) {
      // Small timeout to ensure cesium is ready
      setTimeout(handleResetView, 500);
    }
  }, [loading, readings]);

  // Color mapping
  const getSeverityColor = (severity) => {
    if (!severity) return Color.GRAY;
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return Color.fromCssColorString('#7F1D1D'); // Maroon
    if (s.includes('very poor')) return Color.fromCssColorString('#EF4444'); // Red
    if (s.includes('poor')) return Color.fromCssColorString('#F97316'); // Orange
    if (s.includes('moderate')) return Color.fromCssColorString('#EAB308'); // Yellow
    if (s.includes('satisfactory')) return Color.fromCssColorString('#84CC16'); // Light Green
    if (s.includes('good')) return Color.fromCssColorString('#22C55E'); // Green
    return Color.GRAY;
  };

  const getPollutantColor = (reading) => {
    // If AQI, use category
    if (pollutant === 'AQI') {
      return getSeverityColor(reading.aqi_category);
    }
    
    // Otherwise use thresholds
    const val = pollutant === 'PM2.5' ? reading.pm25 : reading.pm10;
    if (val === null || val === undefined) return Color.GRAY;
    
    if (pollutant === 'PM2.5') {
      if (val > 120) return Color.fromCssColorString('#7F1D1D');
      if (val > 90) return Color.fromCssColorString('#EF4444');
      if (val > 60) return Color.fromCssColorString('#F97316');
      if (val > 30) return Color.fromCssColorString('#EAB308');
      return Color.fromCssColorString('#22C55E');
    } else {
      if (val > 250) return Color.fromCssColorString('#7F1D1D');
      if (val > 150) return Color.fromCssColorString('#EF4444');
      if (val > 100) return Color.fromCssColorString('#F97316');
      if (val > 50) return Color.fromCssColorString('#EAB308');
      return Color.fromCssColorString('#22C55E');
    }
  };

  // Filtered readings
  const visibleReadings = useMemo(() => {
    if (!showReadings) return [];
    return readings.filter(r => 
      r.latitude && r.longitude && 
      (r.altitude || 0) >= altMin && 
      (r.altitude || 0) <= altMax
    );
  }, [readings, showReadings, altMin, altMax]);

  // Derived mission bounds
  const missionCenter = useMemo(() => {
    if (readings.length === 0) return null;
    const lats = readings.map(r => r.latitude).filter(l => l != null);
    const lngs = readings.map(r => r.longitude).filter(l => l != null);
    if (lats.length === 0) return null;
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs)
    };
  }, [readings]);

  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden h-[600px] relative z-0 flex flex-col">
      
      {/* HUD Controls */}
      <div className={`absolute top-4 left-4 z-[400] flex flex-col transition-all duration-300 ${controlsOpen ? 'w-64' : 'w-12'}`}>
        <div className="bg-surface-elevated/90 backdrop-blur-md border border-border rounded shadow-lg overflow-hidden">
          
          <div 
            className="p-3 border-b border-border/50 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/50"
            onClick={() => setControlsOpen(!controlsOpen)}
          >
            <h2 className={`text-xs font-bold tracking-widest text-telemetry uppercase flex items-center gap-2 ${!controlsOpen && 'hidden'}`}>
              <Layers className="w-4 h-4" /> 3D Controls
            </h2>
            <Settings className="w-4 h-4 text-text-muted" />
          </div>
          
          {controlsOpen && (
            <div className="p-3 flex flex-col gap-4 text-xs font-mono">
              
              <div className="flex flex-col gap-1">
                <label className="text-text-muted uppercase tracking-wider text-[10px]">Pollutant</label>
                <div className="flex gap-1">
                  {['AQI', 'PM2.5', 'PM10'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPollutant(p)}
                      className={`flex-1 py-1 rounded border transition-colors ${pollutant === p ? 'bg-telemetry text-background border-telemetry' : 'bg-background border-border text-text-secondary hover:text-text-primary'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text-muted uppercase tracking-wider text-[10px]">Vertical Scale (Z)</label>
                <div className="flex gap-1">
                  {[1, 2, 5, 10, 25, 50].map(s => (
                    <button
                      key={s}
                      onClick={() => setZScale(s)}
                      className={`flex-1 py-1 rounded border transition-colors ${zScale === s ? 'bg-surface-secondary text-text-primary border-border' : 'bg-background border-border/50 text-text-muted hover:text-text-primary'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-text-muted uppercase tracking-wider text-[10px]">
                  <label>Altitude Filter</label>
                  <span>{altMin}m - {altMax}m</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input 
                    type="range" 
                    min="0" max="1000" step="10"
                    value={altMin}
                    onChange={(e) => setAltMin(Math.min(Number(e.target.value), altMax - 10))}
                    className="w-full"
                  />
                  <input 
                    type="range" 
                    min="10" max="1000" step="10"
                    value={altMax}
                    onChange={(e) => setAltMax(Math.max(Number(e.target.value), altMin + 10))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showReadings} onChange={(e) => setShowReadings(e.target.checked)} className="accent-telemetry" />
                  Readings ({visibleReadings.length})
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} className="accent-telemetry" />
                  Zones ({zones.length})
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showPersistent} onChange={(e) => setShowPersistent(e.target.checked)} className="accent-telemetry" />
                  Persistent Hotspots ({persistentHotspots.length})
                </label>
              </div>

              <button 
                onClick={handleResetView}
                className="mt-2 py-1.5 flex items-center justify-center gap-2 bg-background border border-border rounded text-text-muted hover:text-text-primary uppercase tracking-wider font-bold transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset View
              </button>
              
              {missionCenter && (
                <div className="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1 text-[10px] text-text-secondary">
                  <div className="font-bold text-text-muted uppercase">Mission Center</div>
                  <div>Lat: {missionCenter.lat.toFixed(5)}</div>
                  <div>Lng: {missionCenter.lng.toFixed(5)}</div>
                </div>
              )}

            </div>
          )}
        </div>
        
        {/* Warning Badge */}
        <div className="mt-2 bg-warning/10 border border-warning/30 text-warning px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
          <AlertTriangle className="w-3 h-3" /> Simulated Altitude Data
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-telemetry font-mono font-bold tracking-widest uppercase">Processing 3D Geometry...</div>
        </div>
      )}
      
      {error && !loading && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="border border-hazardous rounded-lg p-6 bg-surface-primary text-center">
            <h3 className="text-hazardous font-bold uppercase tracking-wide mb-2">3D Map Failed</h3>
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Custom HTML Tooltip via ScreenSpaceEventHandler */}
      <ScreenSpaceEventHandler>
        <ScreenSpaceEvent 
          type={ScreenSpaceEventType.MOUSE_MOVE} 
          action={(movement) => {
            if (!viewerRef.current?.cesiumElement) return;
            const viewer = viewerRef.current.cesiumElement;
            const pickedObject = viewer.scene.pick(movement.endPosition);
            
            if (defined(pickedObject) && defined(pickedObject.id)) {
              const entity = pickedObject.id;
              if (entity.properties) {
                setSelectedEntity(entity);
                setTooltipPos({ x: movement.endPosition.x, y: movement.endPosition.y });
                return;
              }
            }
            setSelectedEntity(null);
          }} 
        />
      </ScreenSpaceEventHandler>

      {/* Tooltip Render */}
      {selectedEntity && (
        <div 
          className="absolute z-[600] pointer-events-none bg-surface-elevated/95 border border-border shadow-2xl p-3 rounded min-w-[200px]"
          style={{ top: tooltipPos.y + 15, left: tooltipPos.x + 15 }}
        >
          {selectedEntity.properties.type?.getValue() === 'reading' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 mb-2">
                Sensor Reading
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">AQI:</span> <span className="font-bold text-text-primary" style={{color: getSeverityColor(selectedEntity.properties.aqi_category?.getValue()).toCssColorString()}}>{selectedEntity.properties.aqi?.getValue() ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Alt (Z):</span> <span className="text-text-primary">{selectedEntity.properties.altitude?.getValue()?.toFixed(1) ?? '0.0'} m</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lat:</span> <span className="text-text-primary">{selectedEntity.properties.latitude?.getValue()?.toFixed(5)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lng:</span> <span className="text-text-primary">{selectedEntity.properties.longitude?.getValue()?.toFixed(5)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">PM2.5:</span> <span className="text-text-primary">{selectedEntity.properties.pm25?.getValue()?.toFixed(1)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">PM10:</span> <span className="text-text-primary">{selectedEntity.properties.pm10?.getValue()?.toFixed(1)}</span></div>
              </div>
            </>
          )}

          {selectedEntity.properties.type?.getValue() === 'zone' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 mb-2">
                Pollution Zone
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">ID:</span> <span className="font-bold text-text-primary">{selectedEntity.properties.id?.getValue()}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Peak AQI:</span> <span className="font-bold" style={{color: getSeverityColor(selectedEntity.properties.severity?.getValue()).toCssColorString()}}>{selectedEntity.properties.peak_aqi?.getValue()?.toFixed(0)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Avg AQI:</span> <span className="text-text-primary">{selectedEntity.properties.avg_aqi?.getValue()?.toFixed(0)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Readings:</span> <span className="text-text-primary">{selectedEntity.properties.count?.getValue()}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Radius:</span> <span className="text-text-primary">{selectedEntity.properties.radius?.getValue()?.toFixed(0)} m</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Alt Range:</span> <span className="text-text-primary">{selectedEntity.properties.alt_min?.getValue()?.toFixed(0) ?? '?'}m - {selectedEntity.properties.alt_max?.getValue()?.toFixed(0) ?? '?'}m</span></div>
              </div>
            </>
          )}

          {selectedEntity.properties.type?.getValue() === 'persistent' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-warning uppercase border-b border-border/50 pb-1 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Persistent Hotspot
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">ID:</span> <span className="font-bold text-text-primary">{selectedEntity.properties.id?.getValue()}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Surveys:</span> <span className="text-telemetry font-bold">{selectedEntity.properties.surveys?.getValue()}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Peak AQI:</span> <span className="text-hazardous font-bold">{selectedEntity.properties.peak_aqi?.getValue()?.toFixed(0)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Avg AQI:</span> <span className="text-text-primary">{selectedEntity.properties.avg_aqi?.getValue()?.toFixed(0)}</span></div>
                
                {selectedEntity.properties.trend?.getValue() && (
                  <div className="flex justify-between gap-4"><span className="text-text-secondary">Trend:</span> <span className="text-text-primary">{selectedEntity.properties.trend?.getValue()}</span></div>
                )}
                {selectedEntity.properties.priority?.getValue() && (
                  <div className="flex justify-between gap-4"><span className="text-text-secondary">Priority:</span> <span className="text-text-primary">{selectedEntity.properties.priority?.getValue()}</span></div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 w-full h-full [&>.cesium-viewer-bottom]:hidden [&>.cesium-viewer-animationContainer]:hidden [&>.cesium-viewer-timelineContainer]:hidden [&>.cesium-viewer-fullscreenContainer]:hidden">
        <Viewer 
          ref={viewerRef}
          full 
          animation={false} 
          timeline={false} 
          baseLayerPicker={true}
          geocoder={false}
          homeButton={false}
          infoBox={false}
          selectionIndicator={false}
          navigationHelpButton={false}
          sceneModePicker={false}
        >
          {/* Ground Reference Plane */}
          {missionCenter && (
            <Entity>
              <RectangleGraphics
                coordinates={Rectangle.fromDegrees(
                  missionCenter.minLng - 0.002,
                  missionCenter.minLat - 0.002,
                  missionCenter.maxLng + 0.002,
                  missionCenter.maxLat + 0.002
                )}
                material={Color.fromCssColorString('#1e293b').withAlpha(0.6)}
                height={0}
                outline={true}
                outlineColor={Color.fromCssColorString('#334155')}
              />
            </Entity>
          )}

          {/* Altitude Labels */}
          {missionCenter && [0, 50, 100, 150].map(level => {
            // Place labels slightly outside the bounding box
            const lat = missionCenter.minLat - 0.0005;
            const lng = missionCenter.minLng - 0.0005;
            return (
              <Entity 
                key={`alt-label-${level}`}
                position={Cartesian3.fromDegrees(lng, lat, level * zScale)}
              >
                <LabelGraphics 
                  text={`${level}m ┤`}
                  font="12px monospace"
                  fillColor={Color.WHITE}
                  showBackground={false}
                  pixelOffset={new Cartesian2(-25, 0)}
                  disableDepthTestDistance={Number.POSITIVE_INFINITY}
                />
                <PolylineGraphics
                  positions={[
                    Cartesian3.fromDegrees(lng, lat, level * zScale),
                    Cartesian3.fromDegrees(lng + 0.0005, lat + 0.0005, level * zScale)
                  ]}
                  width={1}
                  material={Color.WHITE.withAlpha(0.3)}
                />
              </Entity>
            );
          })}
          
          {/* Readings */}
          {visibleReadings.map((r, i) => {
            const z = (r.altitude || 0) * zScale;
            const color = getPollutantColor(r);
            
            // Calculate visual intensity size
            const intensity = pollutant === 'AQI' ? (r.aqi || 0) : (pollutant === 'PM2.5' ? (r.pm25 || 0) : (r.pm10 || 0));
            // e.g. base 8px, up to 16px
            const pointSize = 8 + Math.min(10, intensity / (pollutant === 'AQI' ? 10 : 20));
            
            return (
              <Entity 
                key={`r-${i}`}
                position={Cartesian3.fromDegrees(r.longitude, r.latitude, z)}
                properties={{
                  type: 'reading',
                  aqi: r.aqi,
                  aqi_category: r.aqi_category,
                  pm25: r.pm25,
                  pm10: r.pm10,
                  latitude: r.latitude,
                  longitude: r.longitude,
                  altitude: r.altitude
                }}
              >
                <PointGraphics 
                  pixelSize={pointSize}
                  color={color}
                  outlineColor={Color.WHITE}
                  outlineWidth={1.5}
                  disableDepthTestDistance={Number.POSITIVE_INFINITY}
                />
                <PolylineGraphics 
                  positions={[
                    Cartesian3.fromDegrees(r.longitude, r.latitude, 0),
                    Cartesian3.fromDegrees(r.longitude, r.latitude, z)
                  ]}
                  width={1.5}
                  material={color.withAlpha(0.6)}
                />
              </Entity>
            );
          })}

          {/* Zones */}
          {showZones && zones.map((z, i) => {
            const altMin = z.altitude?.min_meters ?? 0;
            const altMax = z.altitude?.max_meters ?? 100;
            const height = (altMax - altMin) || 20; // fallback height
            const zCenter = (altMin + (height / 2)) * zScale;
            const cylinderHeight = height * zScale;
            
            return (
              <Entity
                key={`z-${z.zone_id || i}`}
                position={Cartesian3.fromDegrees(z.centroid.longitude, z.centroid.latitude, zCenter)}
                properties={{
                  type: 'zone',
                  id: z.zone_id,
                  peak_aqi: z.aqi.maximum,
                  avg_aqi: z.aqi.average,
                  count: z.measurement_count,
                  radius: z.radius_meters,
                  severity: z.severity,
                  alt_min: altMin,
                  alt_max: altMax
                }}
              >
                <CylinderGraphics 
                  length={cylinderHeight}
                  topRadius={z.radius_meters}
                  bottomRadius={z.radius_meters}
                  material={getSeverityColor(z.severity).withAlpha(0.2)}
                  outline={true}
                  outlineColor={getSeverityColor(z.severity)}
                />
              </Entity>
            );
          })}

          {/* Persistent Hotspots */}
          {showPersistent && persistentHotspots.map((ph, i) => {
            const altMin = ph.altitude?.min_meters ?? 0;
            const altMax = ph.altitude?.max_meters ?? 150;
            const height = (altMax - altMin) || 50;
            const zCenter = (altMin + (height / 2)) * zScale;
            const cylinderHeight = height * zScale;
            
            return (
              <Entity
                key={`ph-${ph.hotspot_id || i}`}
                position={Cartesian3.fromDegrees(ph.longitude, ph.latitude, zCenter)}
                properties={{
                  type: 'persistent',
                  id: ph.hotspot_id,
                  surveys: ph.surveys_detected,
                  peak_aqi: ph.peak_aqi,
                  avg_aqi: ph.average_aqi,
                  trend: ph.trend_analysis?.trend,
                  priority: ph.priority?.classification
                }}
              >
                <CylinderGraphics 
                  length={cylinderHeight}
                  topRadius={100} // Persistent hotspots don't have radius natively returned, assume 100m or similar scale
                  bottomRadius={100}
                  material={Color.RED.withAlpha(0.0)} // Transparent fill
                  outline={true}
                  outlineColor={Color.ORANGE}
                  outlineWidth={5} // Thicker outline
                />
              </Entity>
            );
          })}
        </Viewer>
      </div>
    </div>
  );
}
