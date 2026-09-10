/**
 * AQIHeatmap.jsx — Multi-City Environmental Spatial Pollution Heatmap
 *
 * Accepts an array of datasets (one per city/mission). Each dataset gets its
 * own completely independent IDW interpolation — readings from Ambernath never
 * influence Pune's surface and vice versa.
 *
 * Props:
 *   datasets        — Array<{ missionId, telemetry, cityLabel }>
 *   activeDatasetId — which dataset is "primary" (full opacity)
 *   hoveredDatasetId — which dataset is temporarily highlighted
 *   onDatasetHover  — (missionId|null) => void  (called on marker hover)
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Thermometer, MapPin, Info, Layers } from 'lucide-react';
import { cityColor } from './DatasetSelector';

// ─── Constants ────────────────────────────────────────────────────────────────
const IDW_P              = 2;
const CANVAS_PX          = 256;
const METERS_PER_DEG_LAT = 111139;

// ─── AQI Colour Ramp ──────────────────────────────────────────────────────────
const RAMP = [
  { v:   0, r:  34, g: 197, b:  94 },
  { v:  50, r:  34, g: 197, b:  94 },
  { v:  51, r:  74, g: 222, b: 128 },
  { v: 100, r: 234, g: 179, b:   8 },
  { v: 150, r: 249, g: 115, b:  22 },
  { v: 200, r: 239, g:  68, b:  68 },
  { v: 300, r: 127, g:  29, b:  29 },
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

function aqiMeta(aqi) {
  if (!isFinite(aqi)) return { color: '#6B7280', label: 'Unknown' };
  if (aqi > 200) return { color: '#7F1D1D', label: 'Very Unhealthy' };
  if (aqi > 150) return { color: '#EF4444', label: 'Unhealthy' };
  if (aqi > 100) return { color: '#F97316', label: 'USG' };
  if (aqi > 50)  return { color: '#EAB308', label: 'Moderate' };
  return { color: '#22C55E', label: 'Good' };
}

// ─── Spatial Hash ─────────────────────────────────────────────────────────────
function buildMetricHash(pts, initialCellSizeM, bounds, cosLat) {
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;
  
  let cellSizeM = initialCellSizeM;
  let cols = Math.ceil((bounds.maxLon - bounds.minLon) * kx / cellSizeM) + 1;
  let rows = Math.ceil((bounds.maxLat - bounds.minLat) * ky / cellSizeM) + 1;
  
  // Prevent RangeError / Out of Memory on rogue extreme bounds
  const MAX_CELLS = 2000000;
  if (cols * rows > MAX_CELLS) {
    const scaleFactor = Math.sqrt((cols * rows) / MAX_CELLS);
    cellSizeM = cellSizeM * scaleFactor;
    cols = Math.ceil((bounds.maxLon - bounds.minLon) * kx / cellSizeM) + 1;
    rows = Math.ceil((bounds.maxLat - bounds.minLat) * ky / cellSizeM) + 1;
    console.warn(`[AQIHeatmap] Dataset bounds are extremely large. Downscaling grid. New resolution: ${cols}x${rows}`);
  }

  const grid = new Array(cols * rows).fill(null);
  
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const xm = (p.longitude - bounds.minLon) * kx;
    const ym = (p.latitude  - bounds.minLat) * ky;
    const cx = Math.floor(xm / cellSizeM);
    const cy = Math.floor(ym / cellSizeM);
    if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
      const idx = cy * cols + cx;
      if (grid[idx] === null) {
        grid[idx] = [p];
      } else {
        grid[idx].push(p);
      }
    }
  }
  return { grid, cols, rows, cellSizeM };
}

// ─── IDW Interpolation ────────────────────────────────────────────────────────
function interpolateAt(lat, lon, hashInfo, bounds, cellSizeM, maxDistM, cosLat) {
  const { grid, cols, rows } = hashInfo;
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;
  const xm = (lon - bounds.minLon) * kx;
  const ym = (lat  - bounds.minLat) * ky;
  const cx = Math.floor(xm / cellSizeM);
  const cy = Math.floor(ym / cellSizeM);
  const cellR = Math.ceil(maxDistM / cellSizeM) + 1;

  let wSum = 0, aSum = 0, minDist = Infinity, count = 0;

  for (let dy = -cellR; dy <= cellR; dy++) {
    const gridY = cy + dy;
    if (gridY < 0 || gridY >= rows) continue;
    const rowOffset = gridY * cols;
    
    for (let dx = -cellR; dx <= cellR; dx++) {
      const gridX = cx + dx;
      if (gridX < 0 || gridX >= cols) continue;
      
      const cell = grid[rowOffset + gridX];
      if (!cell) continue;
      
      for (let i = 0; i < cell.length; i++) {
        const p = cell[i];
        if (!isFinite(p.aqi)) continue;
        const dxM = (lon - p.longitude) * kx;
        const dyM = (lat - p.latitude)  * ky;
        const dist = Math.sqrt(dxM*dxM + dyM*dyM);
        if (dist > maxDistM) continue;
        count++;
        if (dist < minDist) minDist = dist;
        if (dist < 0.5) return { aqi: p.aqi, minDist: 0, count };
        const w = 1 / (dist ** IDW_P);
        wSum += w;
        aSum += p.aqi * w;
      }
    }
  }
  if (count === 0 || wSum === 0) return null;
  return { aqi: aSum / wSum, minDist, count };
}

// ─── IDW Canvas for ONE dataset ───────────────────────────────────────────────
function renderIDWCanvas(pts, baseBounds, cosLat) {
  const kx = METERS_PER_DEG_LAT * cosLat;
  const ky = METERS_PER_DEG_LAT;

  // Median nearest-neighbour distance → adaptive influence radius
  const nnDists = [];
  for (let i = 0; i < pts.length; i++) {
    let best = Infinity;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(
        (pts[i].longitude - pts[j].longitude) * kx,
        (pts[i].latitude  - pts[j].latitude)  * ky,
      );
      if (d < best) best = d;
    }
    if (isFinite(best)) nnDists.push(best);
  }
  nnDists.sort((a, b) => a - b);
  const medianNN = nnDists.length > 0 ? nnDists[Math.floor(nnDists.length / 2)] : 500;
  const maxDistM  = Math.min(5000, Math.max(100, medianNN * 4));
  const cellSizeM = maxDistM / 2;

  const latPad = (maxDistM * 0.8) / METERS_PER_DEG_LAT;
  const lonPad = (maxDistM * 0.8) / (METERS_PER_DEG_LAT * cosLat);
  const bounds = {
    minLat: baseBounds.minLat - latPad, maxLat: baseBounds.maxLat + latPad,
    minLon: baseBounds.minLon - lonPad, maxLon: baseBounds.maxLon + lonPad,
  };

  const dLat = bounds.maxLat - bounds.minLat;
  const dLon = bounds.maxLon - bounds.minLon;
  if (dLat <= 0 || dLon <= 0) return null;

  const aspect = (dLon * cosLat) / dLat;
  const W = aspect >= 1 ? CANVAS_PX : Math.max(1, Math.round(CANVAS_PX * aspect));
  const H = aspect >= 1 ? Math.max(1, Math.round(CANVAS_PX / aspect)) : CANVAS_PX;

  const hashInfo = buildMetricHash(pts, cellSizeM, bounds, cosLat);
  const actualCellSizeM = hashInfo.cellSizeM;
  
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px  = img.data;

  for (let py = 0; py < H; py++) {
    const lat = bounds.maxLat - (py / H) * dLat;
    for (let xi = 0; xi < W; xi++) {
      const lon = bounds.minLon + (xi / W) * dLon;
      const res = interpolateAt(lat, lon, hashInfo, bounds, actualCellSizeM, maxDistM, cosLat);
      if (!res) continue;
      const { aqi, minDist, count } = res;
      const distNorm    = Math.min(1.0, minDist / maxDistM);
      const distFalloff = Math.pow(1.0 - distNorm, 2.5);
      const density     = Math.min(1.0, 0.55 + 0.45 * Math.min(count, 5) / 5.0);
      const alpha = Math.round(160 * distFalloff * density);
      if (alpha < 3) continue;
      const { r, g, b } = aqiRGB(aqi);
      const idx = (py * W + xi) * 4;
      px[idx] = r; px[idx+1] = g; px[idx+2] = b; px[idx+3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), overlayBounds: bounds };
}

// ─── Validate telemetry points ─────────────────────────────────────────────────
function validPts(telemetry) {
  return (telemetry || []).filter(p =>
    isFinite(p.latitude) && isFinite(p.longitude) && isFinite(p.aqi) &&
    p.latitude > -90 && p.latitude < 90 &&
    p.longitude > -180 && p.longitude < 180,
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AQIHeatmap({
  // Legacy single-dataset prop (kept for backward-compat)
  telemetry,
  // Multi-dataset props
  datasets,
  activeDatasetId,
  hoveredDatasetId,
  onDatasetHover,
}) {
  // Normalise: support both legacy `telemetry` prop and new `datasets` array
  const resolvedDatasets = useMemo(() => {
    if (datasets && datasets.length > 0) return datasets;
    if (telemetry && telemetry.length > 0) {
      return [{ missionId: 'default', telemetry, cityLabel: 'Mission', stats: null }];
    }
    return [];
  }, [datasets, telemetry]);

  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  // Map<missionId → L.imageOverlay>
  const overlaysRef  = useRef(new Map());
  // Map<missionId → L.layerGroup>
  const dotsGroupRef = useRef(new Map());
  // Cache for generated IDW canvases: missionId_pointCount → { dataUrl, overlayBounds }
  const idwCacheRef  = useRef(new Map());

  const [computing, setComputing] = useState(false);
  const [tooltip,   setTooltip]   = useState(null);
  const [tipPos,    setTipPos]    = useState({ x: 0, y: 0 });

  // ── Initialise Leaflet map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true, attributionControl: true, scrollWheelZoom: true, preferCanvas: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      overlaysRef.current.clear();
      dotsGroupRef.current.clear();
    };
  }, []);

  // ── Rebuild overlays when datasets or active state changes ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove overlays/dots for datasets that are no longer in the list
    const currentIds = new Set(resolvedDatasets.map(d => d.missionId));
    overlaysRef.current.forEach((overlay, id) => {
      if (!currentIds.has(id)) { map.removeLayer(overlay); overlaysRef.current.delete(id); }
    });
    dotsGroupRef.current.forEach((g, id) => {
      if (!currentIds.has(id)) { map.removeLayer(g); dotsGroupRef.current.delete(id); }
    });

    if (resolvedDatasets.length === 0) return;

    // Compute combined bounds for all valid points (for initial fit)
    let allLats = [], allLons = [];
    resolvedDatasets.forEach(ds => {
      const pts = validPts(ds.telemetry);
      pts.forEach(p => { allLats.push(p.latitude); allLons.push(p.longitude); });
    });
    if (allLats.length > 0) {
      map.fitBounds(
        L.latLngBounds([Math.min(...allLats), Math.min(...allLons)], [Math.max(...allLats), Math.max(...allLons)]),
        { padding: [40, 40], maxZoom: 16 },
      );
    }

    setComputing(true);

    // Process each dataset independently — in a double-rAF to avoid blocking
    const raf = requestAnimationFrame(() => requestAnimationFrame(async () => {
      try {
        for (let dsIdx = 0; dsIdx < resolvedDatasets.length; dsIdx++) {
          const ds = resolvedDatasets[dsIdx];
          const pts = validPts(ds.telemetry);
          if (pts.length < 2) continue;

          const dsColor = cityColor(dsIdx);
          const isActive = ds.missionId === (activeDatasetId || 'default');
          const overlayOpacity = isActive ? 1.0 : 0.55;

          const lats = pts.map(p => p.latitude);
          const lons = pts.map(p => p.longitude);
          const baseBounds = {
            minLat: Math.min(...lats), maxLat: Math.max(...lats),
            minLon: Math.min(...lons), maxLon: Math.max(...lons),
          };
          const midLat = (baseBounds.minLat + baseBounds.maxLat) / 2;
          const cosLat = Math.cos((midLat * Math.PI) / 180);

          const cacheKey = `${ds.missionId}_${pts.length}`;
          let result = idwCacheRef.current.get(cacheKey);

          if (!result) {
            try {
              result = renderIDWCanvas(pts, baseBounds, cosLat);
              if (result) idwCacheRef.current.set(cacheKey, result);
            } catch (err) {
              console.error(`[AQIHeatmap] Failed to render IDW for dataset ${ds.missionId}:`, err);
              continue;
            }
          }

          if (!result || !mapRef.current) continue;

          if (overlaysRef.current.has(ds.missionId)) {
            map.removeLayer(overlaysRef.current.get(ds.missionId));
          }

          const overlay = L.imageOverlay(
            result.dataUrl,
            L.latLngBounds(
              [result.overlayBounds.minLat, result.overlayBounds.minLon],
              [result.overlayBounds.maxLat, result.overlayBounds.maxLon],
            ),
            { opacity: overlayOpacity, interactive: false, zIndex: isActive ? 220 : 200, className: 'aqi-idw-raster-surface' },
          ).addTo(map);
          overlaysRef.current.set(ds.missionId, overlay);

          if (dotsGroupRef.current.has(ds.missionId)) {
            map.removeLayer(dotsGroupRef.current.get(ds.missionId));
          }
          const group = L.layerGroup().addTo(map);
          dotsGroupRef.current.set(ds.missionId, group);

          pts.forEach(p => {
            const meta = aqiMeta(p.aqi);
            L.circleMarker([p.latitude, p.longitude], {
              radius: 2, fillColor: dsColor, fillOpacity: 0.9,
              color: 'rgba(255,255,255,0.4)', weight: 0.5, interactive: false,
            }).addTo(group);

            const hit = L.circleMarker([p.latitude, p.longitude], {
              radius: 8, fillOpacity: 0, opacity: 0, interactive: true,
            });
            hit.bindTooltip(`
              <div style="font-family:monospace;font-size:11px;line-height:1.4;min-width:150px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-weight:bold;color:${dsColor};border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dsColor}"></span>
                  ${ds.cityLabel} · ${meta.label} · AQI ${p.aqi.toFixed(1)}
                </div>
                <div>PM2.5: <b>${p.pm25 != null ? p.pm25.toFixed(1) : '—'}</b></div>
                <div>PM10: <b>${p.pm10 != null ? p.pm10.toFixed(1) : '—'}</b></div>
                <div>Altitude: <b>${p.altitude != null ? p.altitude.toFixed(1) + ' m' : '—'}</b></div>
                <div style="color:#aaa;font-size:10px;">${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}</div>
                ${p.timestamp ? `<div style="color:#888;font-size:9px;margin-top:2px;">${new Date(p.timestamp).toLocaleTimeString()}</div>` : ''}
              </div>
            `, { direction: 'top', offset: [0, -6], opacity: 0.96, className: 'aqi-leaflet-tooltip' });

            hit.on('mouseover', e => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              setTooltip({ ...p, ...meta, cityLabel: ds.cityLabel, cityColor: dsColor });
              setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
              if (onDatasetHover) onDatasetHover(ds.missionId);
            });
            hit.on('mousemove', e => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
            });
            hit.on('mouseout', () => {
              setTooltip(null);
              if (onDatasetHover) onDatasetHover(null);
            });
            hit.addTo(group);
          });
        }
      } catch (err) {
        console.error("[AQIHeatmap] Critical render loop failure:", err);
      } finally {
        setComputing(false);
      }
    }));

    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDatasets, activeDatasetId]);

  // Update overlay opacity when active dataset changes without re-rendering
  useEffect(() => {
    resolvedDatasets.forEach((ds, idx) => {
      const overlay = overlaysRef.current.get(ds.missionId);
      if (!overlay) return;
      const isActive = ds.missionId === (activeDatasetId || 'default');
      overlay.setOpacity(isActive ? 1.0 : 0.55);
      overlay.setZIndex(isActive ? 220 : 200);
    });
  }, [activeDatasetId, resolvedDatasets]);

  // ── Stats for header (active dataset only) ───────────────────────────────────
  const activeDs = resolvedDatasets.find(d => d.missionId === (activeDatasetId || resolvedDatasets[0]?.missionId));
  const activePts = validPts(activeDs?.telemetry);
  const stats = useMemo(() => {
    const aqis = activePts.map(p => p.aqi).filter(isFinite);
    if (!aqis.length) return null;
    return {
      min: Math.min(...aqis), max: Math.max(...aqis),
      avg: aqis.reduce((a, b) => a + b, 0) / aqis.length,
      count: activePts.length,
    };
  }, [activePts]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden flex flex-col shadow-sm h-full w-full">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-elevated/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-telemetry/10 border border-telemetry/30">
            <Thermometer className="w-4 h-4 text-telemetry" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest text-text-primary uppercase">AQI Spatial Heatmap</h2>
            <p className="text-[10px] text-text-muted font-mono tracking-wider">
              IDW Pollution Surface · {resolvedDatasets.length} dataset{resolvedDatasets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-4 font-mono text-[10px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-text-muted" />{stats.count} readings
            </span>
            <span>Min <b style={{ color: aqiMeta(stats.min).color }}>{stats.min.toFixed(0)}</b></span>
            <span>Avg <b style={{ color: aqiMeta(stats.avg).color }}>{stats.avg.toFixed(0)}</b></span>
            <span>Max <b style={{ color: aqiMeta(stats.max).color }}>{stats.max.toFixed(0)} · {aqiMeta(stats.max).label}</b></span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {[['0–50','#22C55E','Good'],['51–100','#EAB308','Mod'],['101–150','#F97316','USG'],['151–200','#EF4444','Bad'],['201+','#7F1D1D','V.Bad']].map(([range, color, label]) => (
            <div key={range} className="flex items-center gap-1" title={label}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[9px] font-mono text-text-muted">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative flex-1 w-full min-h-[400px]">
        {computing && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary/80">
            <div className="w-8 h-8 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">Calculating IDW surfaces…</p>
          </div>
        )}
        {!computing && resolvedDatasets.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <Info className="w-10 h-10 text-border mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">No geospatial data for this mission</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />

        {/* Hover Tooltip */}
        {tooltip && (
          <div
            className="absolute z-[600] pointer-events-none bg-surface-elevated/95 border border-border shadow-2xl rounded p-2.5"
            style={{
              top:      Math.min(Math.max(10, tipPos.y + 14), 420 - 200),
              left:     Math.min(Math.max(10, tipPos.x + 14), (containerRef.current?.clientWidth || 700) - 230),
              minWidth: 210,
            }}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-border/50 pb-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tooltip.cityColor }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tooltip.cityColor }}>
                {tooltip.cityLabel} — {tooltip.label}
              </span>
            </div>
            <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1">
              {[
                ['AQI',      tooltip.aqi?.toFixed(1),       tooltip.color, true],
                ['PM2.5',    tooltip.pm25?.toFixed(1)                         ],
                ['PM10',     tooltip.pm10?.toFixed(1)                         ],
                ['Altitude', tooltip.altitude != null ? `${tooltip.altitude.toFixed(1)} m` : null],
                ['Lat',      tooltip.latitude?.toFixed(5)                     ],
                ['Lon',      tooltip.longitude?.toFixed(5)                    ],
              ].map(([k, v, color, bold]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span>{k}:</span>
                  <span className={bold ? 'font-bold' : 'text-text-primary'} style={color ? { color } : {}}>{v ?? '—'}</span>
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
