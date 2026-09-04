/**
 * AQIHeatmap.jsx — Professional Environmental Spatial Pollution Heatmap
 *
 * Implementation details:
 *   1. REAL DATA: Consumes actual latitude, longitude, and AQI from getEnvironmentMap(missionId).
 *   2. GEODESIC IDW: Computes multi-point inverse distance weighting (power = 2) in true metric meters,
 *      accounting for latitude convergence at Ambernath (~19.03° N).
 *   3. FIXED COLOR SCALE:
 *      0–50: Green | 51–100: Yellow | 101–150: Orange | 151–200: Red | 201+: Dark Red
 *      Absolute AQI mapping guarantees consistent color meaning across the entire map.
 *   4. ORGANIC COVERAGE & NO RECTANGLES:
 *      Canvas bounds are expanded by maxDistMeters so coverage naturally dissipates into
 *      complete transparency without rectangular clipping or hard edges.
 *   5. TRIPLE-FACTOR SPATIAL INTENSITY:
 *      Alpha is modulated by:
 *      - Spatial distance to supporting measurements
 *      - Local measurement density
 *      - Interpolated AQI magnitude
 *   6. SUBTLE TELEMETRY GROUND-TRUTH:
 *      Telemetry measurements appear as delicate micro-dots on top of the continuous heat surface.
 *      Hovering displays full telemetry readings in a responsive tooltip.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Thermometer, MapPin, Info } from 'lucide-react';

// ─── IDW & GIS Constants ───────────────────────────────────────────────────
const IDW_P                  = 2;     // Inverse-distance power (p = 2)
const CANVAS_PX              = 420;   // High-resolution off-screen raster dimension
const MAX_INFLUENCE_DISTANCE = 320;   // Configurable maximum influence radius in meters
const METERS_PER_DEG_LAT     = 111139;// WGS84 latitude meter conversion

// ─── Continuous AQI Color Ramp ──────────────────────────────────────────────
// Fixed scale across all missions:
// 0–50: Green | 51–100: Yellow | 101–150: Orange | 151–200: Red | 201+: Dark Red
const RAMP = [
  { v:   0, r:  34, g: 197, b:  94 }, // Good (Green)
  { v:  50, r:  34, g: 197, b:  94 }, // Good upper bound
  { v:  51, r:  74, g: 222, b: 128 }, // Transition to yellow
  { v: 100, r: 234, g: 179, b:   8 }, // Moderate (Yellow)
  { v: 150, r: 249, g: 115, b:  22 }, // USG (Orange)
  { v: 200, r: 239, g:  68, b:  68 }, // Unhealthy (Red)
  { v: 300, r: 127, g:  29, b:  29 }, // Very Unhealthy (Dark Red)
];

function aqiRGB(aqi) {
  aqi = Math.max(0, isFinite(aqi) ? aqi : 0);
  const last = RAMP[RAMP.length - 1];
  if (aqi >= last.v) return last;
  for (let i = 0; i < RAMP.length - 1; i++) {
    const lo = RAMP[i], hi = RAMP[i + 1];
    if (aqi <= hi.v) {
      const t = (aqi - lo.v) / (hi.v - lo.v);
      return {
        r: (lo.r + t * (hi.r - lo.r)) | 0,
        g: (lo.g + t * (hi.g - lo.g)) | 0,
        b: (lo.b + t * (hi.b - lo.b)) | 0,
      };
    }
  }
  return last;
}

// Category metadata for labels and dots
function aqiMeta(aqi) {
  if (!isFinite(aqi)) return { color: '#6B7280', label: 'Unknown' };
  if (aqi > 200) return { color: '#7F1D1D', label: 'Very Unhealthy' };
  if (aqi > 150) return { color: '#EF4444', label: 'Unhealthy' };
  if (aqi > 100) return { color: '#F97316', label: 'USG' };
  if (aqi > 50)  return { color: '#EAB308', label: 'Moderate' };
  return { color: '#22C55E', label: 'Good' };
}


// ─── Spatial Hash Grid (Metric coordinates) ─────────────────────────────────
function buildMetricHash(pts, cellSizeM, bounds, cosLat) {
  const hash = new Map();
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;

  for (const p of pts) {
    const xm = (p.longitude - bounds.minLon) * kx;
    const ym = (p.latitude - bounds.minLat) * ky;
    const cx = Math.floor(xm / cellSizeM);
    const cy = Math.floor(ym / cellSizeM);
    const key = `${cx},${cy}`;
    const cell = hash.get(key);
    if (cell) cell.push(p);
    else hash.set(key, [p]);
  }
  return hash;
}

// ─── IDW Spatial Interpolation with Multi-Point Support ────────────────────
function interpolateAt(lat, lon, hash, bounds, cellSizeM, maxDistM, cosLat) {
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;

  const xm = (lon - bounds.minLon) * kx;
  const ym = (lat - bounds.minLat) * ky;
  const cx = Math.floor(xm / cellSizeM);
  const cy = Math.floor(ym / cellSizeM);

  let wSum = 0;
  let aSum = 0;
  let minDist = Infinity;
  let count = 0;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = hash.get(`${cx + dx},${cy + dy}`);
      if (!cell) continue;
      for (const p of cell) {
        if (!isFinite(p.aqi)) continue;
        const dxM = (lon - p.longitude) * kx;
        const dyM = (lat - p.latitude) * ky;
        const dist = Math.hypot(dxM, dyM);

        if (dist > maxDistM) continue;

        count++;
        if (dist < minDist) minDist = dist;

        if (dist < 0.5) {
          return { aqi: p.aqi, minDist: 0, count: 1 };
        }

        const w = 1 / (dist * dist); // IDW power = 2
        wSum += w;
        aSum += p.aqi * w;
      }
    }
  }

  if (count === 0 || wSum === 0) return null;

  return {
    aqi: aSum / wSum,
    minDist,
    count,
  };
}

// ─── Off-Screen Canvas Surface Generator ─────────────────────────────────────
function renderIDWCanvas(pts, baseBounds, defaultMaxDist, cosLat) {
  // 1. Calculate Adaptive Max Distance based on drone's actual sampling resolution
  let totalDist = 0, distCount = 0;
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;
  
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i].longitude - pts[i-1].longitude) * kx;
    const dy = (pts[i].latitude - pts[i-1].latitude) * ky;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > 0 && d < 1000) {
      totalDist += d;
      distCount++;
    }
  }
  
  // Median/Average step size, scaled to ensure a continuous but tight footprint
  const avgDist = distCount > 0 ? totalDist / distCount : 50;
  const maxDistM = Math.max(40, Math.min(150, avgDist * 3.5)); // Strict footprint limit

  // 2. Pad bounding box generously (1.5x maxDistM) so the edge of the canvas is 100% transparent.
  // This physically guarantees no rectangular cutoff artifacts.
  const latPad = (maxDistM * 1.5) / METERS_PER_DEG_LAT;
  const lonPad = (maxDistM * 1.5) / (METERS_PER_DEG_LAT * cosLat);

  const bounds = {
    minLat: baseBounds.minLat - latPad,
    maxLat: baseBounds.maxLat + latPad,
    minLon: baseBounds.minLon - lonPad,
    maxLon: baseBounds.maxLon + lonPad,
  };

  const dLat = bounds.maxLat - bounds.minLat;
  const dLon = bounds.maxLon - bounds.minLon;
  if (dLat <= 0 || dLon <= 0) return null;

  const aspect = (dLon * cosLat) / dLat;
  const W = aspect >= 1 ? CANVAS_PX : Math.max(1, Math.round(CANVAS_PX * aspect));
  const H = aspect >= 1 ? Math.max(1, Math.round(CANVAS_PX / aspect)) : CANVAS_PX;

  const hash = buildMetricHash(pts, maxDistM, bounds, cosLat);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px = img.data;

  for (let py = 0; py < H; py++) {
    const lat = bounds.maxLat - (py / H) * dLat;
    for (let xi = 0; xi < W; xi++) {
      const lon = bounds.minLon + (xi / W) * dLon;

      const res = interpolateAt(lat, lon, hash, bounds, maxDistM, maxDistM, cosLat);
      if (!res) continue; // Outside survey coverage → transparent

      const { aqi, minDist, count } = res;

      // ─── Triple-Factor Alpha: A = Density × DistanceFalloff × AQIMagnitude ───
      // 1. Density: Higher opacity when multiple telemetry measurements support the region
      const density = Math.min(1.0, 0.35 + 0.65 * (count / 4.0));

      // 2. Distance Falloff: Smooth quadratic fade to exactly 0 before maxDistM
      const distNorm = Math.min(1.0, minDist / maxDistM);
      const distanceFalloff = Math.pow(1.0 - distNorm, 2); // Smoothly hits 0 at maxDistM

      if (distanceFalloff <= 0.01) continue; // Fully faded out, removing rect artifacts

      // 3. AQI Magnitude: Higher AQI has stronger visual prominence
      const aqiMagnitude = 0.60 + 0.40 * Math.min(1.0, Math.max(0, aqi / 200));

      // Final Opacity: Max 190 ensures underlying street basemap remains clearly readable
      const alpha = Math.round(190 * density * distanceFalloff * aqiMagnitude);
      if (alpha < 4) continue;

      const { r, g, b } = aqiRGB(aqi);
      const idx = (py * W + xi) * 4;
      px[idx]     = r;
      px[idx + 1] = g;
      px[idx + 2] = b;
      px[idx + 3] = alpha;
    }
  }

  ctx.putImageData(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    overlayBounds: bounds,
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AQIHeatmap({ telemetry }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const overlayRef   = useRef(null);
  const dotsRef      = useRef(null);

  const [computing, setComputing] = useState(false);
  const [tooltip,   setTooltip]   = useState(null);
  const [tipPos,    setTipPos]    = useState({ x: 0, y: 0 });

  const envData = useMemo(() => telemetry || [], [telemetry]);
  const loading = false;

  // ── Valid Real Readings ──────────────────────────────────────────────────
  const pts = useMemo(() =>
    envData.filter(p =>
      isFinite(p.latitude) && isFinite(p.longitude) && isFinite(p.aqi) &&
      p.latitude  > -90  && p.latitude  < 90 &&
      p.longitude > -180 && p.longitude < 180,
    ),
  [envData]);

  // ── Real Statistics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const aqis = pts.map(p => p.aqi).filter(isFinite);
    if (!aqis.length) return null;
    return {
      min:   Math.min(...aqis),
      max:   Math.max(...aqis),
      avg:   aqis.reduce((a, b) => a + b, 0) / aqis.length,
      count: pts.length,
    };
  }, [pts]);

  // ── Initialize Leaflet Map ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    dotsRef.current = L.layerGroup().addTo(map);
    mapRef.current  = map;

    return () => {
      map.remove();
      mapRef.current     = null;
      overlayRef.current = null;
      dotsRef.current    = null;
    };
  }, []);

  // ── Rebuild IDW Surface & Telemetry Points ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current);
      overlayRef.current = null;
    }
    if (dotsRef.current) {
      dotsRef.current.clearLayers();
    }

    if (!pts.length) return;

    const lats = pts.map(p => p.latitude);
    const lons = pts.map(p => p.longitude);
    const baseBounds = {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLon: Math.min(...lons), maxLon: Math.max(...lons),
    };

    // Auto-fit map to exact surveyed telemetry coordinates
    const leafletBoundsPoints = L.latLngBounds(
      [baseBounds.minLat, baseBounds.minLon],
      [baseBounds.maxLat, baseBounds.maxLon],
    );
    map.fitBounds(leafletBoundsPoints, { padding: [45, 45], maxZoom: 16 });

    const midLat = (baseBounds.minLat + baseBounds.maxLat) / 2;
    const cosLat = Math.cos((midLat * Math.PI) / 180);

    setComputing(true);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const result = renderIDWCanvas(pts, baseBounds, MAX_INFLUENCE_DISTANCE, cosLat);
        setComputing(false);

        if (!result || !mapRef.current) return;

        const { dataUrl, overlayBounds } = result;
        const leafletOverlayBounds = L.latLngBounds(
          [overlayBounds.minLat, overlayBounds.minLon],
          [overlayBounds.maxLat, overlayBounds.maxLon],
        );

        // Continuous raster overlay with per-pixel IDW & alpha
        overlayRef.current = L.imageOverlay(dataUrl, leafletOverlayBounds, {
          opacity: 1.0,
          interactive: false,
          zIndex: 200,
          className: 'aqi-idw-raster-surface',
        }).addTo(mapRef.current);

        // Render Telemetry Markers (Subtle micro-dots for spatial ground truth)
        pts.forEach(p => {
          const meta = aqiMeta(p.aqi);

          // Subtle visible micro-marker
          L.circleMarker([p.latitude, p.longitude], {
            radius: 1.5,
            fillColor: meta.color,
            fillOpacity: 0.7,
            color: 'rgba(255,255,255,0.3)',
            weight: 0.4,
            interactive: false,
          }).addTo(dotsRef.current);

          // Interactive hit-area for hover tooltip
          const hit = L.circleMarker([p.latitude, p.longitude], {
            radius: 8,
            fillOpacity: 0,
            opacity: 0,
            interactive: true,
          });

          // Native Leaflet tooltip ensures instant, robust hover display
          hit.bindTooltip(`
            <div style="font-family: monospace; font-size: 11px; line-height: 1.4; min-width: 150px;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-weight:bold; color:${meta.color}; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:3px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${meta.color}"></span>
                ${meta.label} · AQI ${p.aqi.toFixed(1)}
              </div>
              <div>PM2.5: <b>${p.pm25 != null ? p.pm25.toFixed(1) : '—'}</b></div>
              <div>PM10: <b>${p.pm10 != null ? p.pm10.toFixed(1) : '—'}</b></div>
              <div>Altitude: <b>${p.altitude != null ? p.altitude.toFixed(1) + ' m' : '—'}</b></div>
              <div style="color:#aaa; font-size:10px;">${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}</div>
              ${p.timestamp ? `<div style="color:#888; font-size:9px; margin-top:2px;">${new Date(p.timestamp).toLocaleTimeString()}</div>` : ''}
            </div>
          `, { direction: 'top', offset: [0, -6], opacity: 0.96, className: 'aqi-leaflet-tooltip' });

          hit.on('mouseover', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTooltip({ ...p, ...meta });
            setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
          });

          hit.on('mousemove', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
          });

          hit.on('mouseout', () => {
            setTooltip(null);
          });

          hit.addTo(dotsRef.current);
        });
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [pts]);

  // ── Render Component Layout ───────────────────────────────────────────────
  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden flex flex-col shadow-sm h-full w-full">

      {/* Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-elevated/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-telemetry/10 border border-telemetry/30">
            <Thermometer className="w-4 h-4 text-telemetry" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest text-text-primary uppercase">AQI Thermal Heatmap</h2>
            <p className="text-[10px] text-text-muted font-mono tracking-wider">Spatial Pollution Intensity · Real Telemetry Only</p>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-4 font-mono text-[10px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-text-muted" />
              {stats.count} readings
            </span>
            <span>Min <b style={{ color: aqiMeta(stats.min).color }}>{stats.min.toFixed(0)}</b></span>
            <span>Avg <b style={{ color: aqiMeta(stats.avg).color }}>{stats.avg.toFixed(0)}</b></span>
            <span>Max <b style={{ color: aqiMeta(stats.max).color }}>{stats.max.toFixed(0)} · {aqiMeta(stats.max).label}</b></span>
          </div>
        )}

        {/* Standard Environmental AQI Legend */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {[
            ['0–50',   '#22C55E', 'Good'],
            ['51–100', '#EAB308', 'Mod'],
            ['101–150','#F97316', 'USG'],
            ['151–200','#EF4444', 'Bad'],
            ['201+',   '#7F1D1D', 'V.Bad'],
          ].map(([range, color, label]) => (
            <div key={range} className="flex items-center gap-1" title={label}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[9px] font-mono text-text-muted">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative flex-1 w-full min-h-[400px]">

        {(loading || computing) && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary/90 backdrop-blur-xs">
            <div className="w-8 h-8 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">
              {loading ? 'Loading telemetry…' : 'Calculating IDW spatial surface…'}
            </p>
          </div>
        )}

        {!loading && !computing && pts.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <Info className="w-10 h-10 text-border mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">No geospatial data for this mission</p>
          </div>
        )}

        {/* Leaflet Mount */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Real-Point Hover Tooltip */}
        {tooltip && (
          <div
            className="absolute z-[600] pointer-events-none bg-surface-elevated/95 border border-border shadow-2xl rounded p-2.5 backdrop-blur-xs"
            style={{
              top: Math.min(Math.max(10, tipPos.y + 14), 420 - 190),
              left: Math.min(Math.max(10, tipPos.x + 14), (containerRef.current?.clientWidth || 700) - 225),
              minWidth: 205,
            }}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-border/50 pb-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tooltip.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tooltip.color }}>
                {tooltip.label}
              </span>
            </div>
            <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1">
              {[
                ['AQI',      tooltip.aqi?.toFixed(1),       tooltip.color, true ],
                ['PM2.5',    tooltip.pm25?.toFixed(1)                           ],
                ['PM10',     tooltip.pm10?.toFixed(1)                           ],
                ['Altitude', tooltip.altitude != null ? `${tooltip.altitude.toFixed(1)} m` : null],
                ['Lat',      tooltip.latitude?.toFixed(5)                       ],
                ['Lon',      tooltip.longitude?.toFixed(5)                      ],
              ].map(([k, v, color, bold]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span>{k}:</span>
                  <span className={bold ? 'font-bold' : 'text-text-primary'} style={color ? { color } : {}}>
                    {v ?? '—'}
                  </span>
                </div>
              ))}
              {tooltip.timestamp && (
                <div className="flex justify-between gap-4 pt-1 mt-0.5 border-t border-border/50">
                  <span className="text-[9px]">Time</span>
                  <span className="text-text-muted text-[9px]">{new Date(tooltip.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
