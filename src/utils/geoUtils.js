/**
 * Calculates Haversine distance in meters between two lat/lon points
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates area of a lat/lon bounding box in km^2
 */
export function calculateBoundingBoxArea(minLat, maxLat, minLon, maxLon) {
  const widthMeters = calculateHaversineDistance(minLat, minLon, minLat, maxLon);
  const heightMeters = calculateHaversineDistance(minLat, minLon, maxLat, minLon);
  return (widthMeters * heightMeters) / 1000000.0;
}

/**
 * Basic Nearest Neighbor TSP algorithm for sorting waypoints.
 * Starts at the bottom-left-most point (minLat, minLon).
 */
export function nearestNeighborTSP(waypoints) {
  if (!waypoints || waypoints.length === 0) return [];
  if (waypoints.length === 1) return [...waypoints];

  const unvisited = [...waypoints];
  const sorted = [];

  // Find start point: bottom-left most (lowest lat + lowest lon approx)
  let startIdx = 0;
  let minScore = Infinity;
  for (let i = 0; i < unvisited.length; i++) {
    const score = unvisited[i].latitude + unvisited[i].longitude;
    if (score < minScore) {
      minScore = score;
      startIdx = i;
    }
  }

  let current = unvisited.splice(startIdx, 1)[0];
  sorted.push(current);

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateHaversineDistance(
        current.latitude, current.longitude,
        unvisited[i].latitude, unvisited[i].longitude
      );
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    
    current = unvisited.splice(nearestIdx, 1)[0];
    sorted.push(current);
  }

  return sorted;
}

/**
 * Generates an adaptive survey grid from raw readings.
 * Returns { waypoints, stats }
 */
export function generateAdaptiveSurvey(envData, bounds) {
  if (!envData || envData.length === 0 || !bounds) {
    return { optimizedWaypoints: [], stats: null };
  }

  // 1. Initial Coarse Grid parameters (e.g., 5x5)
  const rows = 5;
  const cols = 5;
  const latStep = (bounds.maxLat - bounds.minLat) / rows;
  const lonStep = (bounds.maxLon - bounds.minLon) / cols;

  const cells = [];

  // 2. Bin readings into coarse grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinLat = bounds.minLat + (r * latStep);
      const cellMaxLat = cellMinLat + latStep;
      const cellMinLon = bounds.minLon + (c * lonStep);
      const cellMaxLon = cellMinLon + lonStep;

      const pointsInCell = bounds.validPoints.filter(p => 
        p.latitude >= cellMinLat && p.latitude <= cellMaxLat &&
        p.longitude >= cellMinLon && p.longitude <= cellMaxLon
      );

      if (pointsInCell.length > 0) {
        cells.push({ minLat: cellMinLat, maxLat: cellMaxLat, minLon: cellMinLon, maxLon: cellMaxLon, points: pointsInCell });
      }
    }
  }

  // 3. Subdivide cells with high AQI
  const finalZones = [];
  cells.forEach(cell => {
    const maxAqi = Math.max(...cell.points.map(p => p.aqi || 0));
    
    // Subdivide if Unhealthy or worse (> 150)
    if (maxAqi > 100 && cell.points.length > 3) {
      const midLat = (cell.minLat + cell.maxLat) / 2;
      const midLon = (cell.minLon + cell.maxLon) / 2;
      
      const quads = [
        cell.points.filter(p => p.latitude >= midLat && p.longitude >= midLon),
        cell.points.filter(p => p.latitude >= midLat && p.longitude < midLon),
        cell.points.filter(p => p.latitude < midLat && p.longitude >= midLon),
        cell.points.filter(p => p.latitude < midLat && p.longitude < midLon)
      ];
      
      quads.forEach(qPoints => {
        if (qPoints.length > 0) {
          finalZones.push(qPoints);
        }
      });
    } else {
      finalZones.push(cell.points);
    }
  });

  // 4. Compute Waypoint (average) for each zone
  const waypoints = finalZones.map(points => {
    const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
    const sumLon = points.reduce((sum, p) => sum + p.longitude, 0);
    const sumAlt = points.reduce((sum, p) => sum + (Number.isFinite(p.altitude) ? p.altitude : 0), 0);
    const maxAqi = Math.max(...points.map(p => p.aqi || 0));
    
    return {
      latitude: sumLat / points.length,
      longitude: sumLon / points.length,
      altitude: sumAlt / points.length,
      aqi: maxAqi, // use max AQI to highlight severity at this waypoint
      pointCount: points.length
    };
  });

  // 5. Connect via Nearest Neighbor TSP
  const optimizedWaypoints = nearestNeighborTSP(waypoints);

  // 6. Calculate Stats
  let totalDistanceMeters = 0;
  for (let i = 1; i < optimizedWaypoints.length; i++) {
    totalDistanceMeters += calculateHaversineDistance(
      optimizedWaypoints[i-1].latitude, optimizedWaypoints[i-1].longitude,
      optimizedWaypoints[i].latitude, optimizedWaypoints[i].longitude
    );
  }

  const droneSpeedMs = 5.0; // 5 m/s
  const estimatedTimeMin = (totalDistanceMeters / droneSpeedMs) / 60;
  
  const stats = {
    areaKm2: calculateBoundingBoxArea(bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon),
    rawReadings: bounds.validPoints.length,
    zonesCount: finalZones.length,
    waypointsCount: optimizedWaypoints.length,
    distanceKm: totalDistanceMeters / 1000,
    estimatedTimeMin: estimatedTimeMin,
    maxAqi: Math.max(...bounds.validPoints.map(p => p.aqi || 0))
  };

  return { optimizedWaypoints, stats };
}
