/**
 * AQIHeatmap.jsx — IDW spatial interpolation via Canvas + L.imageOverlay
 *
 * Architecture:
 *   1. Fetch real telemetry (lat, lon, aqi) via getEnvironmentMap()
 *   2. Compute an adaptive max-influence radius from the median
 *      nearest-neighbour distance of the actual readings.
 *   3. For every pixel of an off-screen canvas:
 *      a. Convert pixel → lat/lon
 *      b. IDW-interpolate AQI from nearby readings only (within maxDist)
 *      c. If no reading is within maxDist → pixel stays fully transparent
 *      d. Map interpolated AQI → RGBA colour
 *   4. Export canvas as PNG data-URL → L.imageOverlay over exact bounds
 *   5. Add tiny (r=2) coloured dots at every actual measurement location
 *
 * Why NOT leaflet.heat:
 *   leaflet.heat *adds* Gaussian kernels for every point.  With 300 nearby
 *   readings even at AQI 40 they stack up to look red.  Tuning radius/blur
 *   cannot fix this structural problem.
 *
 * Why IDW:
 *   Each pixel gets a weighted average of only the measurements that are
 *   geographically close enough to be meaningful.  Pixels far from every
 *   measurement remain transparent — exactly what a GIS pollution layer does.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getEnvironmentMap } from '../services/api';
import { Thermometer, MapPin, Info } from 'lucide-react';

// ─── tunables ───────────────────────────────────────────────────────────────
const IDW_P       = 2;      // IDW power — controls how sharply influence falls off
const CANVAS_PX   = 380;    // base canvas dimension (px); aspect-ratio corrected
const NN_MULT     = 3.0;    // maxInfluence = medianNearestNeighbour × NN_MULT
const DIST_FLOOR  = 0.0008; // minimum influence radius (~90 m in degrees)
const DIST_CAP    = 0.006;  // maximum influence radius (~660 m in degrees)

// ─── AQI → colour ramp ──────────────────────────────────────────────────────
// Smooth linear interpolation between these stops.
const RAMP = [
  { v:   0, r:  34, g: 197, b:  94 }, // Good
  { v:  50, r: 134, g: 239, b: 172 }, // Good-high
  { v: 100, r: 234, g: 179, b:   8 }, // Moderate
  { v: 150, r: 249, g: 115, b:  22 }, // USG
  { v: 200, r: 239, g:  68, b:  68 }, // Unhealthy
  { v: 300, r: 127, g:  29, b:  29 }, // Very Unhealthy
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

// Alpha increases with AQI magnitude.
// AQI  0  → 35  (very subtle green haze)
// AQI 100 → 122 (clearly visible orange)
// AQI 200 → 210 (vivid red, but still shows basemap)
function aqiAlpha(aqi) {
  const t = Math.min(Math.max(aqi / 200, 0), 1);
  return (35 + t * 175) | 0;
}

// ─── AQI metadata for UI and dot colours ────────────────────────────────────
function aqiMeta(aqi) {
  if (!isFinite(aqi)) return { color: '#6B7280', label: 'Unknown' };
  if (aqi > 200) return { color: '#7F1D1D', label: 'Very Unhealthy' };
  if (aqi > 150) return { color: '#EF4444', label: 'Unhealthy' };
  if (aqi > 100) return { color: '#F97316', label: 'USG' };
  if (aqi > 50)  return { color: '#EAB308', label: 'Moderate' };
  return { color: '#22C55E', label: 'Good' };
}

// ─── Median nearest-neighbour distance (sampled for speed) ──────────────────
// Used to derive an influence radius proportional to survey density.
function medianNN(pts) {
  if (pts.length < 2) return DIST_FLOOR;
  const step   = Math.max(1, Math.ceil(pts.length / 80));
  const sample = pts.filter((_, i) => i % step === 0);
  const dists  = sample.map(a => {
    let best = Infinity;
    for (const b of pts) {
      if (b === a) continue;
      const d = Math.hypot(a.latitude - b.latitude, a.longitude - b.longitude);
      if (d < best) best = d;
    }
    return best;
  });
  dists.sort((a, b) => a - b);
  return dists[dists.length >> 1];
}

// ─── Spatial hash table ──────────────────────────────────────────────────────
// Bucket size = maxDist so that all candidates within maxDist live in
// the current bucket or one of its 8 direct neighbours.
function buildHash(pts, sz) {
  const h = new Map();
  for (const p of pts) {
    const k = `${Math.floor(p.longitude / sz)},${Math.floor(p.latitude / sz)}`;
    const bucket = h.get(k);
    if (bucket) bucket.push(p); else h.set(k, [p]);
  }
  return h;
}

// ─── IDW for a single geographic point ───────────────────────────────────────
// Returns interpolated AQI or null if no reading is within maxDist.
function idwAt(lat, lon, hash, sz, maxDist) {
  const bx = Math.floor(lon / sz);
  const by = Math.floor(lat / sz);
  let wSum = 0, aSum = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = hash.get(`${bx + dx},${by + dy}`);
      if (!cell) continue;
      for (const p of cell) {
        if (!isFinite(p.aqi)) continue;
        const dist = Math.hypot(lat - p.latitude, lon - p.longitude);
        if (dist > maxDist) continue;
        // Avoid division by zero; points extremely close yield huge weight
        const w = dist < 1e-10 ? 1e15 : 1 / (dist * dist); // IDW_P=2 unrolled
        wSum += w;
        aSum += p.aqi * w;
      }
    }
  }
  return wSum > 0 ? aSum / wSum : null;
}

// ─── Off-screen canvas IDW render ────────────────────────────────────────────
// Returns a PNG data-URL, or null on failure.
function renderIDWCanvas(pts, bounds) {
  const { minLat, maxLat, minLon, maxLon } = bounds;
  const dLat = maxLat - minLat;
  const dLon = maxLon - minLon;
  if (dLat <= 0 || dLon <= 0) return null;

  // Preserve geographic aspect ratio
  const aspect = dLon / dLat;
  const W = aspect >= 1 ? CANVAS_PX : Math.max(1, Math.round(CANVAS_PX * aspect));
  const H = aspect >= 1 ? Math.max(1, Math.round(CANVAS_PX / aspect)) : CANVAS_PX;

  // Derive adaptive influence radius from point spacing
  const medDist = medianNN(pts);
  const maxDist = Math.min(Math.max(medDist * NN_MULT, DIST_FLOOR), DIST_CAP);

  const hash = buildHash(pts, maxDist);

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d');
  const img     = ctx.createImageData(W, H);
  const px      = img.data;

  for (let py = 0; py < H; py++) {
    const lat = maxLat - (py / H) * dLat; // top row = maxLat
    for (let xi = 0; xi < W; xi++) {
      const lon = minLon + (xi / W) * dLon;
      const aqi = idwAt(lat, lon, hash, maxDist, maxDist);
      if (aqi === null) continue;               // outside survey area → transparent

      const { r, g, b } = aqiRGB(aqi);
      const a            = aqiAlpha(aqi);
      const i            = (py * W + xi) * 4;
      px[i]     = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AQIHeatmap({ missionId }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const overlayRef   = useRef(null);   // L.imageOverlay — IDW surface
  const dotsRef      = useRef(null);   // L.layerGroup  — measurement dots

  const [envData,   setEnvData]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [computing, setComputing] = useState(false);
  const [tooltip,   setTooltip]   = useState(null);
  const [tipPos,    setTipPos]    = useState({ x: 0, y: 0 });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!missionId) return;
    setLoading(true);
    setEnvData([]);
    getEnvironmentMap(missionId)
      .then(d => setEnvData(d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [missionId]);

  // ── Valid points ──────────────────────────────────────────────────────────
  const pts = useMemo(() =>
    envData.filter(p =>
      isFinite(p.latitude) && isFinite(p.longitude) &&
      p.latitude  > -90  && p.latitude  < 90 &&
      p.longitude > -180 && p.longitude < 180,
    ),
  [envData]);

  // ── Stats ─────────────────────────────────────────────────────────────────
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

  // ── Init Leaflet map once ─────────────────────────────────────────────────
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
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current   = null;
      overlayRef.current = null;
      dotsRef.current  = null;
    };
  }, []);

  // ── Rebuild surface + dots when pts change ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Tear down stale layers
    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    if (dotsRef.current)    { dotsRef.current.clearLayers(); }

    if (!pts.length) return;

    const lats = pts.map(p => p.latitude);
    const lons  = pts.map(p => p.longitude);
    const bounds = {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLon: Math.min(...lons), maxLon: Math.max(...lons),
    };
    const leafletBounds = L.latLngBounds(
      [bounds.minLat, bounds.minLon],
      [bounds.maxLat, bounds.maxLon],
    );

    // Fit map to exact mission bounds
    map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 16 });

    // Run IDW after two animation frames so the map tiles render first
    setComputing(true);
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dataUrl = renderIDWCanvas(pts, bounds);
        setComputing(false);
        if (!dataUrl || !mapRef.current) return;

        // Overlay the IDW surface as a geo-referenced PNG
        overlayRef.current = L.imageOverlay(dataUrl, leafletBounds, {
          opacity: 1,       // per-pixel alpha from canvas controls transparency
          interactive: false,
          zIndex: 200,
          className: 'aqi-idw-overlay',
        }).addTo(mapRef.current);

        // Dot layer — tiny coloured markers at actual measurement locations
        if (!dotsRef.current) {
          dotsRef.current = L.layerGroup().addTo(mapRef.current);
        }

        pts.forEach(p => {
          const { color } = aqiMeta(p.aqi);

          // Visible micro-dot  (non-interactive — keeps layer simple)
          L.circleMarker([p.latitude, p.longitude], {
            radius: 2,
            fillColor: color,
            fillOpacity: 0.85,
            color: 'rgba(255,255,255,0.4)',
            weight: 0.5,
            interactive: false,
          }).addTo(dotsRef.current);

          // Larger invisible hit-area for hover tooltip
          const hit = L.circleMarker([p.latitude, p.longitude], {
            radius: 8,
            fillOpacity: 0,
            opacity: 0,
            interactive: true,
          });
          hit.on('mouseover', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTooltip({ ...p, ...aqiMeta(p.aqi) });
            setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
          });
          hit.on('mousemove', e => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTipPos({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top });
          });
          hit.on('mouseout', () => setTooltip(null));
          hit.addTo(dotsRef.current);
        });
      });
    });

    return () => cancelAnimationFrame(raf1);
  }, [pts]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border border-border rounded-lg bg-surface-primary overflow-hidden flex flex-col">

      {/* Header */}
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

        {/* Fixed-scale AQI legend */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {[
            ['0–50',   '#22C55E', 'Good'],
            ['51–100', '#EAB308', 'Mod'],
            ['101–150','#F97316', 'USG'],
            ['151–200','#EF4444', 'Bad'],
            ['201+',   '#7F1D1D', 'V.Bad'],
          ].map(([range, color]) => (
            <div key={range} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[9px] font-mono text-text-muted">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map viewport */}
      <div className="relative" style={{ height: '420px' }}>

        {(loading || computing) && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <div className="w-8 h-8 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">
              {loading ? 'Loading telemetry…' : 'Computing IDW surface…'}
            </p>
          </div>
        )}

        {!loading && !computing && pts.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-surface-secondary">
            <Info className="w-10 h-10 text-border mb-3" />
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">No geospatial data for this mission</p>
          </div>
        )}

        {/* Leaflet mount */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="absolute z-[600] pointer-events-none bg-surface-elevated/95 border border-border shadow-2xl rounded p-2.5"
            style={{ top: tipPos.y + 14, left: tipPos.x + 14, minWidth: 195 }}
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
