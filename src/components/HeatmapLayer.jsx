import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points, max, radius = 25, blur = 15 }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 17,
      max: max || 1.0,
      gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 0.9: 'red', 1.0: 'darkred' }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, max, radius, blur]);

  return null;
}
