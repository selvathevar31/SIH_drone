import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Viewer, Entity, PolylineGraphics, BoxGraphics, CylinderGraphics } from 'resium';
import { Cartesian3, Color, Math as CesiumMath, HeadingPitchRoll, Transforms, Ion } from 'cesium';
import { Crosshair, Navigation, Globe, Map as MapIcon } from 'lucide-react';

if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

export default function MissionMap3D({ flightPath, currentLocation, hotspots, telemetry }) {
  const [followDrone, setFollowDrone] = useState(false);
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const viewerRef = useRef(null);

  // Derive active position
  const activeCenter = useMemo(() => {
    if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
      return currentLocation;
    } else if (flightPath && flightPath.length > 0) {
      const lastPoint = flightPath[flightPath.length - 1];
      if (typeof lastPoint.latitude === 'number' && typeof lastPoint.longitude === 'number') {
        return lastPoint;
      }
    }
    return null;
  }, [currentLocation, flightPath]);

  const hasGpsData = activeCenter !== null;

  // Process flight path into a Cartesian3 array respecting altitude
  const pathPositions = useMemo(() => {
    if (!flightPath || flightPath.length === 0) return [];
    return Cartesian3.fromDegreesArrayHeights(
      flightPath.flatMap(p => [p.longitude, p.latitude, p.altitude || 0])
    );
  }, [flightPath]);

  // Determine drone orientation
  const orientation = useMemo(() => {
    if (!activeCenter) return undefined;
    const headingVal = telemetry?.heading ?? 0;
    const hpr = new HeadingPitchRoll(CesiumMath.toRadians(headingVal), 0, 0);
    const position = Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, activeCenter.altitude || 0);
    return Transforms.headingPitchRollQuaternion(position, hpr);
  }, [activeCenter, telemetry]);

  // Camera Management
  useEffect(() => {
    if (!viewerRef.current?.cesiumElement || !activeCenter) return;
    const viewer = viewerRef.current.cesiumElement;
    const droneCartesian = Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, activeCenter.altitude || 0);
    
    if (shouldRecenter) {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, (activeCenter.altitude || 0) + 150),
        duration: 1.5
      });
      setShouldRecenter(false);
    } else if (followDrone) {
      // Smooth tracking logic without hard resets
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, (activeCenter.altitude || 0) + 150),
        duration: 1.0 // 1s animation, shorter than the 2s poll
      });
    }
  }, [activeCenter, followDrone, shouldRecenter]);

  // Altitude calculations for the profile panel
  const altitudeStats = useMemo(() => {
    if (!flightPath || flightPath.length === 0) return { min: 0, max: 0, current: 0 };
    const altitudes = flightPath.map(p => p.altitude || 0);
    return {
      min: Math.min(...altitudes),
      max: Math.max(...altitudes),
      current: activeCenter?.altitude || 0
    };
  }, [flightPath, activeCenter]);

  if (!hasGpsData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-secondary h-[450px] border border-border rounded-lg">
        <MapIcon className="w-16 h-16 text-border mb-4" />
        <h2 className="text-xl font-bold tracking-widest text-text-muted uppercase mb-2">3D GPS DATA UNAVAILABLE</h2>
        <p className="text-sm text-text-secondary">Waiting for valid geographic coordinates to initialize 3D scene.</p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    if (!severity) return Color.RED;
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('hazardous')) return Color.DARKRED;
    if (s.includes('very poor')) return Color.RED;
    if (s.includes('poor')) return Color.ORANGE;
    if (s.includes('moderate')) return Color.YELLOW;
    return Color.RED;
  };

  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden h-[450px] relative z-0 flex flex-col">
      
      {/* HUD Controls Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => setFollowDrone(!followDrone)}
          className={`flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border text-xs font-bold uppercase tracking-wide transition-colors ${
            followDrone 
              ? 'bg-telemetry/20 border-telemetry/50 text-telemetry backdrop-blur-sm' 
              : 'bg-surface-elevated/90 border-border text-text-muted hover:text-text-primary backdrop-blur-sm'
          }`}
        >
          Follow Drone
          <Navigation className={`w-4 h-4 ${followDrone ? 'animate-pulse' : ''}`} />
        </button>
        
        <button 
          onClick={() => setShouldRecenter(true)}
          className="flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border border-border bg-surface-elevated/90 text-text-muted hover:text-text-primary backdrop-blur-sm text-xs font-bold uppercase tracking-wide transition-colors"
        >
          Recenter
          <Crosshair className="w-4 h-4" />
        </button>
        
        <button 
          onClick={() => {
            if (viewerRef.current?.cesiumElement && activeCenter) {
              viewerRef.current.cesiumElement.camera.flyTo({
                destination: Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, 1000)
              });
              setFollowDrone(false);
            }
          }}
          className="flex items-center justify-between w-36 px-3 py-2 rounded shadow-lg border border-border bg-surface-elevated/90 text-text-muted hover:text-text-primary backdrop-blur-sm text-xs font-bold uppercase tracking-wide transition-colors"
        >
          Top View
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-surface-elevated/90 backdrop-blur-md border border-border p-3 rounded shadow-lg pointer-events-none w-48">
        <h2 className="text-[10px] font-bold tracking-widest text-telemetry uppercase mb-2 border-b border-border/50 pb-1">Drone Telemetry</h2>
        <div className="font-mono text-xs text-text-secondary flex flex-col gap-1">
          <div className="flex justify-between gap-2"><span>Lat:</span> <span className="text-text-primary">{activeCenter.latitude.toFixed(6)}</span></div>
          <div className="flex justify-between gap-2"><span>Lng:</span> <span className="text-text-primary">{activeCenter.longitude.toFixed(6)}</span></div>
          <div className="flex justify-between gap-2" title="Relative Altitude Above Takeoff"><span>Rel Alt:</span> <span className="text-text-primary">{activeCenter.altitude?.toFixed(1)} m</span></div>
          {telemetry && (
            <>
              <div className="flex justify-between gap-2"><span>Speed:</span> <span>{telemetry.speed?.toFixed(1) || 0} m/s</span></div>
              <div className="flex justify-between gap-2"><span>Heading:</span> <span>{telemetry.heading?.toFixed(0) || 0}°</span></div>
              <div className="flex justify-between gap-2"><span>Battery:</span> <span className={telemetry.battery < 20 ? 'text-hazardous' : 'text-safe'}>{telemetry.battery}%</span></div>
              <div className="flex justify-between gap-2"><span>GPS:</span> <span>{telemetry.gps_status || 'UNKNOWN'}</span></div>
              <div className="flex justify-between gap-2"><span>Sats:</span> <span>{telemetry.satellites ?? 'N/A'}</span></div>
            </>
          )}
        </div>
      </div>

      {/* Altitude Profile Overlay */}
      <div className="absolute bottom-10 left-4 z-[400] bg-surface-elevated/90 backdrop-blur-md border border-border p-3 rounded shadow-lg pointer-events-none w-48">
        <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-2 border-b border-border/50 pb-1">Altitude Profile</h2>
        <div className="font-mono text-xs flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Current:</span> 
            <span className="text-telemetry font-bold">{altitudeStats.current.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Min:</span> 
            <span className="text-text-primary">{altitudeStats.min.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Max:</span> 
            <span className="text-text-primary">{altitudeStats.max.toFixed(1)} m</span>
          </div>
        </div>
      </div>

      {/* 3D Debug Panel */}
      <div className="absolute bottom-10 right-4 z-[400] bg-surface-elevated/90 backdrop-blur-md border border-border p-3 rounded shadow-lg pointer-events-none w-48">
        <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-2 border-b border-border/50 pb-1">3D GPS Debug</h2>
        <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1">
          <div className="flex justify-between"><span>Points:</span> <span>{flightPath?.length || 0}</span></div>
          <div className="flex justify-between"><span>Hotspots:</span> <span>{hotspots?.length || 0}</span></div>
          <div className="flex justify-between"><span>Entities:</span> <span>{(hotspots?.length || 0) + 2}</span></div>
          <div className="flex justify-between"><span>Ref:</span> <span className="text-safe">RELATIVE_HOME</span></div>
        </div>
      </div>

      <div className="flex-1 w-full h-full [&>.cesium-viewer-bottom]:hidden [&>.cesium-viewer-animationContainer]:hidden [&>.cesium-viewer-timelineContainer]:hidden [&>.cesium-viewer-fullscreenContainer]:hidden">
        <Viewer 
          ref={viewerRef}
          full 
          animation={false} 
          timeline={false} 
          baseLayerPicker={true}
          geocoder={false}
          homeButton={false}
          infoBox={true}
          selectionIndicator={true}
          navigationHelpButton={false}
          sceneModePicker={false}
        >
          
          {/* Flight Path */}
          {pathPositions.length > 0 && (
            <Entity>
              <PolylineGraphics
                positions={pathPositions}
                width={3}
                material={Color.CYAN}
              />
            </Entity>
          )}

          {/* Hotspots */}
          {hotspots && hotspots.map((hotspot) => (
            <Entity
              key={hotspot.id}
              position={Cartesian3.fromDegrees(hotspot.latitude, hotspot.longitude, 50)} // Center of cylinder
              name="POLLUTION HOTSPOT"
              description={`
                <div style="font-family: monospace; font-size: 12px; color: #FFF; background: #000; padding: 10px;">
                  <strong style="color: #F97316;">Average AQI:</strong> ${hotspot.average_aqi}<br/>
                  <strong style="color: #EF4444;">Peak AQI:</strong> ${hotspot.peak_aqi}<br/>
                  <strong style="color: #FFF;">PM2.5:</strong> ${hotspot.average_pm25?.toFixed(1)} µg/m³<br/>
                  <strong style="color: #FFF;">PM10:</strong> ${hotspot.average_pm10?.toFixed(1)} µg/m³<br/>
                  <strong style="color: #FFF;">Coordinates:</strong> ${hotspot.latitude.toFixed(5)}, ${hotspot.longitude.toFixed(5)}
                </div>
              `}
            >
              <CylinderGraphics
                length={100.0} // height of the hotspot volume
                topRadius={hotspot.radius_meters || 75}
                bottomRadius={hotspot.radius_meters || 75}
                material={getSeverityColor(hotspot.severity).withAlpha(0.3)}
                outline={true}
                outlineColor={getSeverityColor(hotspot.severity)}
              />
            </Entity>
          ))}

          {/* Drone Model (Box primitive as fallback) */}
          <Entity 
            name="QUDRONE-01" 
            position={Cartesian3.fromDegrees(activeCenter.longitude, activeCenter.latitude, activeCenter.altitude || 0)}
            orientation={orientation}
            description="Active Drone Payload"
          >
            <BoxGraphics 
              dimensions={new Cartesian3(2.0, 2.0, 0.5)} // roughly 2m x 2m drone
              material={Color.CYAN}
              outline={true}
              outlineColor={Color.WHITE}
            />
          </Entity>

        </Viewer>
      </div>
    </div>
  );
}
