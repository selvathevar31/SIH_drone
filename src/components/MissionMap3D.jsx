import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Cartesian3, Color, Material, Math as CesiumMath, HeadingPitchRoll, Transforms, Ion, UrlTemplateImageryProvider, ArcGisMapServerImageryProvider, createWorldImageryAsync, IonWorldImageryStyle, createWorldTerrainAsync, createOsmBuildingsAsync, Viewer, PointPrimitiveCollection, PolylineCollection, ImageryLayer, Rectangle, ScreenSpaceEventType, defined } from 'cesium';
import { Crosshair, Navigation, Globe, Map as MapIcon, Info, Route, X, Maximize2, Minimize2 } from 'lucide-react';
import { getEnvironmentMap } from '../services/api';
import { generateAdaptiveSurvey } from '../utils/geoUtils';
import 'cesium/Build/Cesium/Widgets/widgets.css';

export default function MissionMap3D({ missionId, flightPath, currentLocation, hotspots, telemetry }) {
  const [cesiumState, setCesiumState] = useState({ ready: false, hasGpsData: false });
  const [followDrone, setFollowDrone] = useState(false);
  const [envData, setEnvData] = useState([]);
  
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pointsRef = useRef(null);
  const flightPathLinesRef = useRef(null);
  const dropLinesRef = useRef(null);
  const droneEntityRef = useRef(null);
  const hotspotsMapRef = useRef(new Map());
  const cameraInitializedRef = useRef(false);
  const handlerRef = useRef(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showSpatialPanel, setShowSpatialPanel] = useState(false);
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

  // Use canonical flightPath instead of fetching
  useEffect(() => {
    setEnvData(flightPath || []);
  }, [flightPath]);

  // Derive bounding box and center from envData
  const geoBounds = useMemo(() => {
    if (!envData || envData.length === 0) return null;
    const valid = envData.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude >= -90 && p.latitude <= 90 && p.longitude >= -180 && p.longitude <= 180);
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
  }, [envData]);

  // Generate Adaptive Survey Plan
  const surveyData = useMemo(() => {
    return generateAdaptiveSurvey(envData, geoBounds);
  }, [envData, geoBounds]);

  // Derive live active position (for drone tracking)
  const activeCenter = useMemo(() => {
    if (telemetry && typeof telemetry.latitude === 'number' && typeof telemetry.longitude === 'number') {
      return telemetry;
    } else if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
      return currentLocation;
    } else if (flightPath && flightPath.length > 0) {
      const lastPoint = flightPath[flightPath.length - 1];
      if (typeof lastPoint.latitude === 'number' && typeof lastPoint.longitude === 'number') {
        return lastPoint;
      }
    }
    return null;
  }, [telemetry, currentLocation, flightPath]);

  const hasGpsData = geoBounds !== null || activeCenter !== null;

  // Init Cesium Viewer Once
  useEffect(() => {
    let isMounted = true;
    
    async function initViewer() {
      if (!containerRef.current || viewerRef.current) return;

      const rawToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      const token = typeof rawToken === 'string' ? rawToken.trim() : '';

      let activeProvider = false;
      let terrainProvider = undefined;
      let buildings = null;

      if (token && token !== 'your_token_here' && token !== 'undefined' && token !== 'null') {
        try {
          Ion.defaultAccessToken = token;
          activeProvider = await createWorldImageryAsync({
            style: IonWorldImageryStyle.AERIAL
          });
          terrainProvider = await createWorldTerrainAsync();
          buildings = await createOsmBuildingsAsync();
        } catch (e) {
          console.warn('Cesium Ion async resources failed', e);
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
        infoBox: true,
        selectionIndicator: true,
        navigationHelpButton: false,
        sceneModePicker: false,
        baseLayer: activeProvider !== false ? new ImageryLayer(activeProvider) : false,
        terrainProvider: terrainProvider
      });

      if (buildings) {
        viewer.scene.primitives.add(buildings);
      }

      // Remove bottom Cesium logo text
      if (viewer.cesiumWidget.creditContainer) {
          viewer.cesiumWidget.creditContainer.style.display = 'none';
      }

      const points = viewer.scene.primitives.add(new PointPrimitiveCollection());
      const flightPathLines = viewer.scene.primitives.add(new PolylineCollection());
      const dropLines = viewer.scene.primitives.add(new PolylineCollection());

      viewerRef.current = viewer;
      pointsRef.current = points;
      flightPathLinesRef.current = flightPathLines;
      dropLinesRef.current = dropLines;

      setCesiumState({ ready: true, hasGpsData: activeCenter !== null });
    }
    
    initViewer();
    
    return () => {
      isMounted = false;
      if (viewerRef.current) {
        if (handlerRef.current && !viewerRef.current.isDestroyed()) {
          handlerRef.current.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
          handlerRef.current = null;
        }
        try {
          viewerRef.current.destroy();
        } catch(e) {}
        viewerRef.current = null;
      }
    };
  }, []);

  // Set up ScreenSpaceEventHandler for tooltips
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    const handler = viewer.screenSpaceEventHandler;
    handlerRef.current = handler;
    
    handler.setInputAction((movement) => {
      const pickedObject = viewer.scene.pick(movement.endPosition);
      if (defined(pickedObject)) {
        if (pickedObject.id && pickedObject.id.properties) { // Entity (Hotspot or Drone)
          const type = pickedObject.id.properties.type?.getValue?.() || pickedObject.id.properties.type;
          if (type === 'hotspot') {
            setSelectedEntity({
              type: 'hotspot',
              peak_aqi: pickedObject.id.properties.peak_aqi?.getValue?.() || pickedObject.id.properties.peak_aqi,
              average_aqi: pickedObject.id.properties.average_aqi?.getValue?.() || pickedObject.id.properties.average_aqi,
              pm25: pickedObject.id.properties.pm25?.getValue?.() || pickedObject.id.properties.pm25,
              pm10: pickedObject.id.properties.pm10?.getValue?.() || pickedObject.id.properties.pm10,
              severity: pickedObject.id.properties.severity?.getValue?.() || pickedObject.id.properties.severity,
              latitude: pickedObject.id.properties.latitude?.getValue?.() || pickedObject.id.properties.latitude,
              longitude: pickedObject.id.properties.longitude?.getValue?.() || pickedObject.id.properties.longitude
            });
            setTooltipPos({ x: movement.endPosition.x, y: movement.endPosition.y });
            return;
          }
        } else if (pickedObject.primitive && pickedObject.primitive.id && pickedObject.primitive.id.properties) { // PointPrimitive (Reading)
           const props = pickedObject.primitive.id.properties;
           setSelectedEntity({
            type: props.type,
            aqi: props.aqi,
            pm25: props.pm25,
            pm10: props.pm10,
            altitude: props.altitude,
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
      if (viewerRef.current && !viewerRef.current.isDestroyed() && handler) {
        handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      }
    };
  }, [cesiumState.ready]);

  // Initial Camera FlyTo (Runs Once)
  useEffect(() => {
    if (viewerRef.current && geoBounds && !cameraInitializedRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Rectangle.fromDegrees(geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat),
        duration: 0
      });
      cameraInitializedRef.current = true;
    }
  }, [geoBounds, cesiumState.ready]);

  // Update Drone
  useEffect(() => {
    if (!viewerRef.current || !activeCenter || typeof activeCenter.longitude !== 'number' || typeof activeCenter.latitude !== 'number') return;
    const viewer = viewerRef.current;
    
    const headingVal = activeCenter.heading ?? 0;
    const hpr = new HeadingPitchRoll(CesiumMath.toRadians(headingVal), 0, 0);
    const alt = Number.isFinite(activeCenter.altitude) ? activeCenter.altitude : 0;
    const position = Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, alt);
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr);

    if (!droneEntityRef.current) {
      droneEntityRef.current = viewer.entities.add({
        name: 'QUDRONE-01',
        description: 'Active Drone Payload',
        position: position,
        orientation: orientation,
        box: {
          dimensions: new Cartesian3(2.0, 2.0, 0.5),
          material: Color.CYAN,
          outline: true,
          outlineColor: Color.WHITE
        }
      });
    } else {
      droneEntityRef.current.position = position;
      droneEntityRef.current.orientation = orientation;
    }

    if (followDrone) {
      viewer.trackedEntity = droneEntityRef.current;
    } else {
      if (viewer.trackedEntity === droneEntityRef.current) {
         viewer.trackedEntity = undefined;
      }
    }
  }, [activeCenter, followDrone, cesiumState.ready]);

  // Update Optimized Flight Path
  useEffect(() => {
    if (!flightPathLinesRef.current || !cesiumState.ready || !surveyData || surveyData.optimizedWaypoints.length < 2) return;
    
    const lines = flightPathLinesRef.current;
    lines.removeAll();
    
    const positions = surveyData.optimizedWaypoints.map(p => Cartesian3.fromDegrees(p.longitude, p.latitude, Number.isFinite(p.altitude) ? p.altitude : 0));
    
    if (positions.length > 1) {
      lines.add({
        positions: positions,
        width: 4,
        material: Material.fromType('Color', { color: Color.CYAN })
      });
    }
  }, [surveyData, cesiumState.ready]);

  const getAQIColor = (aqi) => {
    if (aqi == null || !Number.isFinite(aqi)) return Color.GRAY;
    if (aqi > 200) return Color.fromCssColorString('#7F1D1D'); // Purple/Hazardous
    if (aqi > 150) return Color.fromCssColorString('#EF4444'); // Red
    if (aqi > 100) return Color.fromCssColorString('#F97316'); // Orange
    if (aqi > 50)  return Color.fromCssColorString('#EAB308'); // Yellow
    return Color.fromCssColorString('#22C55E'); // Green
  };

  // Update Actual Readings, Waypoints & Vertical Drop Lines
  useEffect(() => {
    if (!pointsRef.current || !dropLinesRef.current || !geoBounds) return;
    
    const points = pointsRef.current;
    const dropLines = dropLinesRef.current;
    points.removeAll();
    dropLines.removeAll();
    
    // A. RAW MEASUREMENTS (Small, semi-transparent)
    geoBounds.validPoints.forEach(pt => {
      const alt = Number.isFinite(pt.altitude) ? pt.altitude : 0;
      const pointColor = getAQIColor(pt.aqi);

      points.add({
        position: Cartesian3.fromDegrees(pt.longitude, pt.latitude, alt),
        color: pointColor.withAlpha(0.3),
        pixelSize: 4,
        id: {
            properties: {
                type: 'reading',
                aqi: pt.aqi,
                pm25: pt.pm25,
                pm10: pt.pm10,
                altitude: pt.altitude,
                latitude: pt.latitude,
                longitude: pt.longitude,
                timestamp: pt.timestamp
            }
        }
      });
    });

    // B. OPTIMIZED SURVEY WAYPOINTS (Large markers with drop lines)
    if (surveyData && surveyData.optimizedWaypoints) {
      surveyData.optimizedWaypoints.forEach(wp => {
        const alt = Number.isFinite(wp.altitude) ? wp.altitude : 0;
        const pointColor = getAQIColor(wp.aqi);

        points.add({
          position: Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt),
          color: pointColor,
          pixelSize: 10,
          outlineColor: Color.WHITE,
          outlineWidth: 2.0,
          id: {
            properties: {
                type: 'reading',
                aqi: wp.aqi,
                altitude: wp.altitude,
                latitude: wp.latitude,
                longitude: wp.longitude
            }
          }
        });

        // Draw vertical drop line to ground
        dropLines.add({
          positions: [
            Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt),
            Cartesian3.fromDegrees(wp.longitude, wp.latitude, 0)
          ],
          width: 1.5,
          material: Material.fromType('Color', { color: pointColor.withAlpha(0.5) })
        });
      });
    }
  }, [geoBounds, surveyData, cesiumState.ready]);

  // Update Hotspots
  useEffect(() => {
    if (!viewerRef.current || !hotspots) return;
    const viewer = viewerRef.current;
    const currentMap = hotspotsMapRef.current;
    
    const getSeverityColor = (severity) => {
      if (!severity) return Color.ORANGE;
      const s = severity.toLowerCase();
      if (s.includes('severe') || s.includes('hazardous')) return Color.DARKRED;
      if (s.includes('very poor')) return Color.RED;
      if (s.includes('poor')) return Color.ORANGE;
      if (s.includes('moderate')) return Color.YELLOW;
      return Color.ORANGE;
    };

    const newIds = new Set(hotspots.map(h => h.id));
    
    for (const [id, entity] of currentMap.entries()) {
      if (!newIds.has(id)) {
        viewer.entities.remove(entity);
        currentMap.delete(id);
      }
    }
    
    hotspots.forEach(hotspot => {
      if (typeof hotspot.latitude !== 'number' || typeof hotspot.longitude !== 'number') return;
      if (!currentMap.has(hotspot.id)) {
        const alt = Number.isFinite(hotspot.altitude) ? hotspot.altitude : 0;
        const radius = hotspot.radius_meters || 75;
        
        const entity = viewer.entities.add({
          position: Cartesian3.fromDegrees(hotspot.longitude, hotspot.latitude, alt + (radius/2)),
          name: 'POLLUTION HOTSPOT',
          properties: {
            type: 'hotspot',
            id: hotspot.id,
            peak_aqi: hotspot.peak_aqi,
            average_aqi: hotspot.average_aqi,
            pm25: hotspot.average_pm25,
            pm10: hotspot.average_pm10,
            severity: hotspot.severity,
            latitude: hotspot.latitude,
            longitude: hotspot.longitude
          },
          cylinder: {
            length: radius,
            topRadius: radius,
            bottomRadius: radius,
            material: getSeverityColor(hotspot.severity).withAlpha(0.3),
            outline: true,
            outlineColor: getSeverityColor(hotspot.severity)
          }
        });
        currentMap.set(hotspot.id, entity);
      }
    });
  }, [hotspots, cesiumState.ready]);

  const handleRecenter = () => {
    if (!viewerRef.current || !geoBounds) return;
    viewerRef.current.camera.flyTo({
      destination: Rectangle.fromDegrees(geoBounds.minLon, geoBounds.minLat, geoBounds.maxLon, geoBounds.maxLat),
      duration: 1.0
    });
    setFollowDrone(false);
  };

  const handleTopView = () => {
    if (!viewerRef.current || !geoBounds) return;
    const height = Math.max((geoBounds.maxLat - geoBounds.minLat) * 111000 * 2, (geoBounds.maxLon - geoBounds.minLon) * 111000 * 2, 500);
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(geoBounds.centerLon, geoBounds.centerLat, height),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0.0
      },
      duration: 1.0
    });
    setFollowDrone(false);
  };

  // Shared icon-button style
  const iconBtn = (active = false) =>
    `w-8 h-8 rounded flex items-center justify-center backdrop-blur-sm border shadow transition-colors ${
      active
        ? 'bg-telemetry/20 border-telemetry/50 text-telemetry'
        : 'bg-surface-elevated/80 border-border/60 text-text-muted hover:text-telemetry hover:border-telemetry/40'
    }`;

  return (
    <div ref={wrapperRef} className="border border-border rounded-lg bg-surface-primary overflow-hidden h-[450px] relative z-0 flex flex-col">
      
      {!cesiumState.ready && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
          <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold tracking-widest text-text-muted uppercase mb-2">INITIALIZING 3D ENGINE</h2>
        </div>
      )}

      {(!hasGpsData && cesiumState.ready) && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
          <MapIcon className="w-16 h-16 text-border mb-4" />
          <h2 className="text-xl font-bold tracking-widest text-text-muted uppercase mb-2">3D GPS DATA UNAVAILABLE</h2>
          <p className="text-sm text-text-secondary">Waiting for valid geographic coordinates to initialize 3D scene.</p>
        </div>
      )}
      
      {/* ── TOP-LEFT: Info / Spatial Panel ── */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 items-start">
        <button
          onClick={() => setShowSpatialPanel(v => !v)}
          className={iconBtn(showSpatialPanel)}
          title="Spatial Parameters"
        >
          <Info className="w-4 h-4" />
        </button>

        {showSpatialPanel && (
          <div className="bg-surface-elevated/95 backdrop-blur-md border border-border rounded shadow-xl w-52 pointer-events-auto">
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-border/50">
              <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase flex items-center gap-1">
                <Info className="w-3 h-3" /> Spatial
              </span>
              <button onClick={() => setShowSpatialPanel(false)} className="text-text-muted hover:text-telemetry transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="px-3 py-2 font-mono text-[10px] text-text-secondary flex flex-col gap-1">
              <div className="flex justify-between"><span>X-Axis:</span><span className="text-text-primary">Longitude</span></div>
              <div className="flex justify-between"><span>Y-Axis:</span><span className="text-text-primary">Latitude</span></div>
              <div className="flex justify-between"><span>Z-Axis:</span><span className="text-telemetry font-bold">True Altitude</span></div>
              <div className="flex justify-between"><span>Radius:</span><span className="text-text-primary">Zone (m)</span></div>
            </div>
            {surveyData && surveyData.stats && (
              <>
                <div className="mx-3 border-t border-border/50" />
                <div className="px-3 py-2 font-mono text-[10px] text-text-secondary flex flex-col gap-1">
                  <div className="text-[9px] font-bold tracking-widest text-telemetry uppercase flex items-center gap-1 mb-1">
                    <Route className="w-2.5 h-2.5" /> Survey
                  </div>
                  <div className="flex justify-between"><span>Area:</span><span className="text-text-primary">{surveyData.stats.areaKm2.toFixed(3)} km²</span></div>
                  <div className="flex justify-between"><span>Readings:</span><span className="text-text-primary">{surveyData.stats.rawReadings}</span></div>
                  <div className="flex justify-between"><span>Waypoints:</span><span className="text-telemetry font-bold">{surveyData.stats.waypointsCount}</span></div>
                  <div className="flex justify-between"><span>Distance:</span><span className="text-text-primary">{surveyData.stats.distanceKm.toFixed(2)} km</span></div>
                  <div className="flex justify-between"><span>Est. Time:</span><span className="text-text-primary">{surveyData.stats.estimatedTimeMin.toFixed(1)} min</span></div>
                  <div className="flex justify-between"><span>Max AQI:</span><span className="font-bold" style={{color: getAQIColor(surveyData.stats.maxAqi).toCssColorString()}}>{surveyData.stats.maxAqi}</span></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── TOP-RIGHT: Action icons ── */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={() => setFollowDrone(v => !v)}
          className={iconBtn(followDrone)}
          title="Follow Drone"
        >
          <Navigation className={`w-4 h-4 ${followDrone ? 'animate-pulse' : ''}`} />
        </button>
        <button onClick={handleRecenter} className={iconBtn()} title="Recenter">
          <Crosshair className="w-4 h-4" />
        </button>
        <button onClick={handleTopView} className={iconBtn()} title="Top View">
          <Globe className="w-4 h-4" />
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

      {/* Interactive Tooltip */}
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
                <div className="flex justify-between gap-4"><span className="text-text-secondary">AQI:</span> <span className="font-bold text-text-primary" style={{color: getAQIColor(selectedEntity.aqi).toCssColorString()}}>{selectedEntity.aqi ?? 'N/A'}</span></div>
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

          {selectedEntity.type === 'hotspot' && (
            <>
              <h3 className="text-[10px] font-bold tracking-widest text-text-muted uppercase border-b border-border/50 pb-1 mb-2">
                Pollution Hotspot
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Peak AQI:</span> <span className="font-bold text-text-primary" style={{color: getAQIColor(selectedEntity.peak_aqi).toCssColorString()}}>{selectedEntity.peak_aqi?.toFixed(0) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Avg AQI:</span> <span className="text-text-primary">{selectedEntity.average_aqi?.toFixed(0) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">PM2.5:</span> <span className="text-text-primary">{selectedEntity.pm25?.toFixed(1) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lat:</span> <span className="text-text-primary">{selectedEntity.latitude?.toFixed(5) ?? 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Lon:</span> <span className="text-text-primary">{selectedEntity.longitude?.toFixed(5) ?? 'N/A'}</span></div>
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
