import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Cartesian3, Color, Material, Math as CesiumMath, ScreenSpaceEventType, defined, Ion, UrlTemplateImageryProvider, ArcGisMapServerImageryProvider, createWorldImageryAsync, IonWorldImageryStyle, createWorldTerrainAsync, createOsmBuildingsAsync, Viewer, PointPrimitiveCollection, PolylineCollection, ImageryLayer, Rectangle } from 'cesium';
import { Layers, RefreshCw, Info, Settings2, X, Maximize2, Minimize2 } from 'lucide-react';
import { getEnvironmentMap, getPollutionZones, getPersistentHotspots } from '../services/api';
import 'cesium/Build/Cesium/Widgets/widgets.css';

export default function Pollution3DSurface({ missionId, timeParams }) {
  const [cesiumState, setCesiumState] = useState({ ready: false, hasToken: false });
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pointsRef = useRef(null);
  const dropLinesRef = useRef(null);
  const zonesMapRef = useRef(new Map());
  const cameraInitializedRef = useRef(false);
  
  // Data state
  const [readings, setReadings] = useState([]);
  const [zones, setZones] = useState([]);
  const [persistentHotspots, setPersistentHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Control state
  const [pollutant, setPollutant] = useState('PM2.5'); // AQI, PM2.5, PM10
  const [showReadings, setShowReadings] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showPersistent, setShowPersistent] = useState(true);
  
  // Altitude filter
  const [altMin, setAltMin] = useState(0);
  const [altMax, setAltMax] = useState(500);

  // Interaction
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(false);
  const [showAqiLegend, setShowAqiLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef(null);

  const handleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Fetch data
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!missionId) return;
      setLoading(true);
      setError(null);
      
      try {
        const [readingsData, zonesData, hotspotsData] = await Promise.all([
          getEnvironmentMap(missionId, timeParams),
          getPollutionZones(missionId).catch(() => ({ zones: [] })),
          getPersistentHotspots().catch(() => ({ persistent_hotspots: [] }))
        ]);
        
        if (isMounted) {
          setReadings(readingsData || []);
          setZones(zonesData.zones || []);
          setPersistentHotspots(hotspotsData.persistent_hotspots || []);
          
          if (readingsData && readingsData.length > 0) {
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
  }, [missionId, timeParams]);

  // Derive exact geo bounds from valid readings
  const geoBounds = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    const valid = readings.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude >= -90 && p.latitude <= 90 && p.longitude >= -180 && p.longitude <= 180);
    if (valid.length === 0) return null;

    const lats = valid.map(p => p.latitude);
    const lons = valid.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    return {
      minLat, maxLat, minLon, maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
      validPoints: valid
    };
  }, [readings]);

  // Init Viewer Once
  useEffect(() => {
    let isMounted = true;
    
    async function initViewer() {
      if (!containerRef.current || viewerRef.current) return;

      const rawToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      const token = typeof rawToken === 'string' ? rawToken.trim() : '';

      let activeProvider = false;
      let validToken = false;
      let terrainProvider = undefined;
      let buildings = null;

      if (token && token !== 'your_token_here' && token !== 'undefined' && token !== 'null') {
        try {
          Ion.defaultAccessToken = token;
          validToken = true;
          activeProvider = await createWorldImageryAsync({
            style: IonWorldImageryStyle.AERIAL
          });
          terrainProvider = await createWorldTerrainAsync();
          buildings = await createOsmBuildingsAsync();
        } catch (e) {
          console.warn("Cesium Ion async resources failed", e);
        }
      }

      if (!activeProvider) {
        try {
          activeProvider = await ArcGisMapServerImageryProvider.fromUrl(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
          );
        } catch (e) {
          console.error('ESRI Fallback failed, attempting OSM', e);
          try {
            activeProvider = new UrlTemplateImageryProvider({
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              maximumLevel: 19
            });
          } catch (e2) {
            console.error('OSM Fallback failed', e2);
            activeProvider = false;
          }
        }
      }

      if (!isMounted) return;

      const viewer = new Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        baseLayer: activeProvider !== false ? new ImageryLayer(activeProvider) : false,
        terrainProvider: terrainProvider
      });

      if (buildings) {
        viewer.scene.primitives.add(buildings);
      }

      if (viewer.cesiumWidget.creditContainer) {
          viewer.cesiumWidget.creditContainer.style.display = 'none';
      }

      const points = viewer.scene.primitives.add(new PointPrimitiveCollection());
      const dropLines = viewer.scene.primitives.add(new PolylineCollection());
      
      viewerRef.current = viewer;
      pointsRef.current = points;
      dropLinesRef.current = dropLines;

      setCesiumState({ ready: true, hasToken: validToken });
    }
    
    initViewer();
    
    return () => {
      isMounted = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch(e) {}
        viewerRef.current = null;
      }
    };
  }, []);

  // Initial Camera Positioning (Runs Once)
  useEffect(() => {
    if (viewerRef.current && geoBounds && cesiumState.ready && !cameraInitializedRef.current && !loading) {
      viewerRef.current.camera.flyTo({
        destination: Rectangle.fromDegrees(geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat),
        duration: 0
      });
      cameraInitializedRef.current = true;
    }
  }, [geoBounds, cesiumState.ready, loading]);

  // Set up ScreenSpaceEventHandler for tooltips
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    const handler = viewer.screenSpaceEventHandler;
    
    handler.setInputAction((movement) => {
      const pickedObject = viewer.scene.pick(movement.endPosition);
      if (defined(pickedObject)) {
        if (pickedObject.id && pickedObject.id.properties) { // Entity
          setSelectedEntity({
            type: pickedObject.id.properties.type?.getValue(),
            aqi_category: pickedObject.id.properties.aqi_category?.getValue(),
            aqi: pickedObject.id.properties.aqi?.getValue(),
            altitude: pickedObject.id.properties.altitude?.getValue(),
            pm25: pickedObject.id.properties.pm25?.getValue(),
            pm10: pickedObject.id.properties.pm10?.getValue(),
            peak_aqi: pickedObject.id.properties.peak_aqi?.getValue(),
            severity: pickedObject.id.properties.severity?.getValue(),
            alt_min: pickedObject.id.properties.alt_min?.getValue(),
            alt_max: pickedObject.id.properties.alt_max?.getValue()
          });
          setTooltipPos({ x: movement.endPosition.x, y: movement.endPosition.y });
          return;
        } else if (pickedObject.primitive && pickedObject.primitive.id && pickedObject.primitive.id.properties) { // PointPrimitive
           const props = pickedObject.primitive.id.properties;
           setSelectedEntity({
            type: props.type,
            aqi_category: props.aqi_category,
            aqi: props.aqi,
            altitude: props.altitude,
            pm25: props.pm25,
            pm10: props.pm10,
            latitude: props.latitude,
            longitude: props.longitude,
            timestamp: props.timestamp
          });
          setTooltipPos({ x: movement.endPosition.x, y: movement.endPosition.y });
          return;
        }
      }
      setSelectedEntity(null);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      if (!viewer.isDestroyed()) {
        handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      }
    };
  }, [cesiumState.ready]);

  const getSeverityColor = (severity) => {
    if (!severity) return Color.GRAY;
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return Color.fromCssColorString('#7F1D1D');
    if (s.includes('very poor')) return Color.fromCssColorString('#EF4444');
    if (s.includes('poor')) return Color.fromCssColorString('#F97316');
    if (s.includes('moderate')) return Color.fromCssColorString('#EAB308');
    if (s.includes('satisfactory')) return Color.fromCssColorString('#84CC16');
    if (s.includes('good')) return Color.fromCssColorString('#22C55E');
    return Color.GRAY;
  };

  const getPollutantColor = (reading) => {
    if (pollutant === 'AQI') {
      return getSeverityColor(reading.aqi_category);
    }
    
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
    if (!showReadings || !geoBounds) return [];
    return geoBounds.validPoints.filter(r => 
      (r.altitude || 0) >= altMin && 
      (r.altitude || 0) <= altMax
    );
  }, [geoBounds, showReadings, altMin, altMax]);

  // Update Point Primitives & Vertical Drop Lines
  useEffect(() => {
    if (!pointsRef.current || !dropLinesRef.current || !cesiumState.ready) return;
    const points = pointsRef.current;
    const dropLines = dropLinesRef.current;
    
    points.removeAll();
    dropLines.removeAll();

    visibleReadings.forEach((r, i) => {
      const z = Number.isFinite(r.altitude) ? r.altitude : 0;
      const color = getPollutantColor(r);
      const intensity = pollutant === 'AQI' ? (r.aqi || 0) : (pollutant === 'PM2.5' ? (r.pm25 || 0) : (r.pm10 || 0));
      const pointSize = 8 + Math.min(10, intensity / (pollutant === 'AQI' ? 10 : 20));
      
      points.add({
        position: Cartesian3.fromDegrees(r.longitude, r.latitude, z),
        color: color,
        pixelSize: pointSize,
        outlineColor: Color.WHITE,
        outlineWidth: 1.0,
        id: {
          properties: {
            type: 'reading',
            aqi: r.aqi,
            aqi_category: r.aqi_category,
            pm25: r.pm25,
            pm10: r.pm10,
            altitude: r.altitude,
            latitude: r.latitude,
            longitude: r.longitude,
            timestamp: r.timestamp
          }
        }
      });

      dropLines.add({
        positions: [
          Cartesian3.fromDegrees(r.longitude, r.latitude, z),
          Cartesian3.fromDegrees(r.longitude, r.latitude, 0)
        ],
        width: 1.0,
        material: Material.fromType('Color', { color: color.withAlpha(0.3) })
      });
    });
  }, [visibleReadings, pollutant, cesiumState.ready]);

  // Update Zones & Persistent Hotspots (Cylinders)
  useEffect(() => {
    if (!viewerRef.current || !cesiumState.ready) return;
    const viewer = viewerRef.current;
    const currentMap = zonesMapRef.current;

    const allZones = [];
    if (showZones) {
        allZones.push(...zones.map(z => ({...z, entityType: 'zone'})));
    }
    if (showPersistent) {
        allZones.push(...persistentHotspots.map(z => ({...z, entityType: 'persistent'})));
    }

    const newIds = new Set(allZones.map(z => z.zone_id || z.id));
    
    // Remove old
    for (const [id, entity] of currentMap.entries()) {
      if (!newIds.has(id)) {
        viewer.entities.remove(entity);
        currentMap.delete(id);
      }
    }

    // Add/update new
    allZones.forEach((z, i) => {
      const id = z.zone_id || z.id || `z-${i}`;
      if (!currentMap.has(id)) {
        const altMin_val = z.altitude?.min_meters ?? 0;
        const altMax_val = z.altitude?.max_meters ?? 100;
        const height = (altMax_val - altMin_val) || 20; 
        const zCenter = (altMin_val + (height / 2));
        const cylinderHeight = height;
        const radius = z.radius_meters || 50;

        const entity = viewer.entities.add({
          position: Cartesian3.fromDegrees(z.centroid ? z.centroid.longitude : z.longitude, z.centroid ? z.centroid.latitude : z.latitude, zCenter),
          properties: {
            type: 'zone',
            id: id,
            peak_aqi: z.aqi?.maximum || z.peak_aqi,
            severity: z.severity,
            alt_min: altMin_val,
            alt_max: altMax_val
          },
          cylinder: {
            length: cylinderHeight,
            topRadius: radius,
            bottomRadius: radius,
            material: getSeverityColor(z.severity).withAlpha(0.3),
            outline: true,
            outlineColor: getSeverityColor(z.severity)
          }
        });
        currentMap.set(id, entity);
      }
    });
  }, [zones, persistentHotspots, showZones, showPersistent, cesiumState.ready]);

  const handleResetView = () => {
    if (!viewerRef.current || !geoBounds) return;
    viewerRef.current.camera.flyTo({
      destination: Rectangle.fromDegrees(geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat),
      duration: 1.5
    });
  };

  const iconBtn = (active = false) =>
    `w-8 h-8 rounded flex items-center justify-center backdrop-blur-sm border shadow transition-colors ${
      active
        ? 'bg-telemetry/20 border-telemetry/50 text-telemetry'
        : 'bg-surface-elevated/80 border-border/60 text-text-muted hover:text-telemetry hover:border-telemetry/40'
    }`;

  return (
    <div ref={wrapperRef} className="border border-border rounded-lg bg-surface-primary overflow-hidden h-full flex flex-col min-h-[400px] relative z-0">
      
      {!cesiumState.ready && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
          <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold tracking-widest text-text-muted uppercase mb-2">INITIALIZING 3D ANALYTICS</h2>
        </div>
      )}

      {/* ── TOP-LEFT: Settings toggle (pollutant, altitude filter, layer visibility) ── */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 items-start">
        <button
          onClick={() => setShowControls(v => !v)}
          className={iconBtn(showControls)}
          title="3D Surface Controls"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {showControls && (
          <div className="bg-surface-elevated/95 backdrop-blur-md border border-border rounded shadow-xl w-56 pointer-events-auto">
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-border/50">
              <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase flex items-center gap-1">
                <Layers className="w-3 h-3" /> 3D Surface
              </span>
              <button onClick={() => setShowControls(false)} className="text-text-muted hover:text-telemetry transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="px-3 py-2 flex flex-col gap-3 text-xs font-mono">
              <div className="flex flex-col gap-1">
                <label className="text-text-muted uppercase tracking-wider text-[9px]">Pollutant</label>
                <div className="flex gap-1">
                  {['PM2.5', 'PM10', 'AQI'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPollutant(p)}
                      className={`flex-1 py-1 rounded border text-[10px] transition-colors ${
                        pollutant === p
                          ? 'bg-telemetry text-background border-telemetry'
                          : 'bg-background border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-text-muted uppercase tracking-wider text-[9px]">
                  <label>Altitude Filter</label>
                  <span>{altMin}m – {altMax}m</span>
                </div>
                <input type="range" min="0" max="1000" step="10" value={altMin} onChange={e => setAltMin(Math.min(Number(e.target.value), altMax - 10))} className="w-full accent-telemetry" />
                <input type="range" min="10" max="1000" step="10" value={altMax} onChange={e => setAltMax(Math.max(Number(e.target.value), altMin + 10))} className="w-full accent-telemetry" />
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showReadings} onChange={e => setShowReadings(e.target.checked)} className="accent-telemetry" />
                  Readings ({visibleReadings.length})
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showZones} onChange={e => setShowZones(e.target.checked)} className="accent-telemetry" />
                  Zones ({zones.length})
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" checked={showPersistent} onChange={e => setShowPersistent(e.target.checked)} className="accent-telemetry" />
                  Persistent ({persistentHotspots.length})
                </label>
              </div>

              <button
                onClick={handleResetView}
                className="flex items-center justify-center gap-1.5 py-1 bg-background border border-border rounded text-text-muted hover:text-telemetry text-[10px] uppercase tracking-wider transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TOP-RIGHT: Info / Spatial ── */}
      <div className="absolute top-3 right-3 z-[400]">
        <button className={iconBtn()} title="Spatial Parameters (X=Lon, Y=Lat, Z=Alt)">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* ── BOTTOM-LEFT: AQI legend toggle ── */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-col-reverse gap-2 items-start">
        <button
          onClick={() => setShowAqiLegend(v => !v)}
          className={iconBtn(showAqiLegend)}
          title="AQI Legend"
        >
          <span className="text-[10px] font-extrabold leading-none">AQI</span>
        </button>
        {showAqiLegend && (
          <div className="bg-surface-elevated/95 backdrop-blur-md border border-border p-2.5 rounded shadow-xl pointer-events-none w-44">
            <p className="text-[9px] font-bold tracking-widest text-text-muted uppercase mb-1.5">Air Quality Index</p>
            <div className="font-mono text-[10px] flex flex-col gap-1">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0"></div><span className="text-text-secondary w-14">0–50</span><span className="text-text-primary">Good</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EAB308] shrink-0"></div><span className="text-text-secondary w-14">51–100</span><span className="text-text-primary">Moderate</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#F97316] shrink-0"></div><span className="text-text-secondary w-14">101–150</span><span className="text-text-primary">USG</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0"></div><span className="text-text-secondary w-14">151–200</span><span className="text-text-primary">Unhealthy</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#7F1D1D] shrink-0"></div><span className="text-text-secondary w-14">201+</span><span className="text-text-primary">Very Bad</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM-RIGHT: Fullscreen ── */}
      <div className="absolute bottom-3 right-3 z-[400]">
        <button onClick={handleFullscreen} className={iconBtn(isFullscreen)} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-telemetry font-mono font-bold tracking-widest uppercase">Processing Surface...</div>
        </div>
      )}
      
      {error && !loading && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="border border-hazardous rounded-lg p-6 bg-surface-primary text-center">
            <h3 className="text-hazardous font-bold uppercase tracking-wide mb-2">3D Surface Failed</h3>
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (!geoBounds) && (
        <div className="absolute inset-0 z-[450] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="border border-border rounded-lg bg-surface-primary p-5 flex flex-col items-center justify-center min-w-[300px]">
            <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">Insufficient Data</div>
            <div className="text-text-secondary text-sm">Waiting for 3D coordinate readings.</div>
          </div>
        </div>
      )}

      {selectedEntity && (
        <div 
          className="absolute z-[600] pointer-events-none bg-surface-elevated/95 border border-border shadow-2xl p-3 rounded min-w-[200px]"
          style={{ top: tooltipPos.y + 15, left: tooltipPos.x + 15 }}
        >
          {selectedEntity.type === 'reading' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 mb-2">
                Sensor Reading
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">AQI:</span> <span className="font-bold text-text-primary" style={{color: getSeverityColor(selectedEntity.aqi_category).toCssColorString()}}>{selectedEntity.aqi ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Alt (Z):</span> <span className="text-text-primary">{selectedEntity.altitude?.toFixed(1) ?? '0.0'} m</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">PM2.5:</span> <span className="text-text-primary">{selectedEntity.pm25?.toFixed(1) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">PM10:</span> <span className="text-text-primary">{selectedEntity.pm10?.toFixed(1) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lat:</span> <span className="text-text-primary">{selectedEntity.latitude?.toFixed(5) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lon:</span> <span className="text-text-primary">{selectedEntity.longitude?.toFixed(5) ?? 'N/A'}</span></div>
                {selectedEntity.timestamp && (
                   <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border/50"><span className="text-text-secondary text-[9px]">Time:</span> <span className="text-text-muted text-[9px]">{new Date(selectedEntity.timestamp).toLocaleTimeString()}</span></div>
                )}
              </div>
            </>
          )}

          {selectedEntity.type === 'zone' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 mb-2">
                Pollution Zone
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Peak AQI:</span> <span className="font-bold" style={{color: getSeverityColor(selectedEntity.severity).toCssColorString()}}>{selectedEntity.peak_aqi?.toFixed(0) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Alt Range:</span> <span className="text-text-primary">{selectedEntity.alt_min?.toFixed(0) ?? '?'}m – {selectedEntity.alt_max?.toFixed(0) ?? '?'}m</span></div>
              </div>
            </>
          )}
        </div>
      )}

      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full [&>.cesium-viewer-bottom]:hidden [&>.cesium-viewer-animationContainer]:hidden [&>.cesium-viewer-timelineContainer]:hidden [&>.cesium-viewer-fullscreenContainer]:hidden"
      >
      </div>
    </div>
  );
}


