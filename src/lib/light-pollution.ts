import { Coordinates, SpotResult, LightPollutionData } from "./types";
import lightPollutionData from "@/data/light-pollution-sample.json";

const data = lightPollutionData as LightPollutionData;

export interface DarkCandidate {
  lat: number;
  lng: number;
  bortle: number;
  distance: number;
}

const BORTLE_LABELS: Record<number, string> = {
  1: "Excellent",
  2: "Excellent",
  3: "Good",
  4: "Good",
  5: "Moderate",
  6: "Moderate",
  7: "Poor",
  8: "Poor",
  9: "Poor",
};

function getBortleLabel(bortle: number): string {
  return BORTLE_LABELS[Math.min(9, Math.max(1, Math.round(bortle)))] || "Unknown";
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getGridValue(lat: number, lng: number): number | null {
  const { bounds, resolution, grid } = data;

  if (
    lat < bounds.minLat ||
    lat > bounds.maxLat ||
    lng < bounds.minLng ||
    lng > bounds.maxLng
  ) {
    return null;
  }

  const row = Math.floor((bounds.maxLat - lat) / resolution);
  const col = Math.floor((lng - bounds.minLng) / resolution);

  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
    return null;
  }

  return grid[row][col];
}

export function findDarkestSpot(
  origin: Coordinates,
  radiusKm: number
): SpotResult | null {
  const { bounds, resolution } = data;

  let darkest: { lat: number; lng: number; bortle: number } | null = null;

  // Scan grid cells within radius
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += resolution) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += resolution) {
      const distance = haversineDistance(origin.lat, origin.lng, lat, lng);

      if (distance <= radiusKm) {
        const bortle = getGridValue(lat, lng);

        if (bortle !== null && (darkest === null || bortle < darkest.bortle)) {
          darkest = { lat, lng, bortle };
        }
      }
    }
  }

  if (!darkest) {
    return null;
  }

  return {
    radius: radiusKm,
    lat: darkest.lat,
    lng: darkest.lng,
    bortle: darkest.bortle,
    label: getBortleLabel(darkest.bortle),
  };
}

export function findAllSpots(origin: Coordinates): SpotResult[] {
  const radiuses = [10, 50, 150]; // Updated radius bands
  const results: SpotResult[] = [];

  for (const radius of radiuses) {
    const spot = findDarkestSpot(origin, radius);
    if (spot) {
      results.push(spot);
    }
  }

  return results;
}

export function findDarkCandidates(
  origin: Coordinates,
  minRadiusKm: number,
  maxRadiusKm: number,
  count: number = 5
): DarkCandidate[] {
  const { bounds, resolution } = data;
  const candidates: DarkCandidate[] = [];

  // Check if origin is within our sample data bounds
  const isWithinBounds =
    origin.lat >= bounds.minLat &&
    origin.lat <= bounds.maxLat &&
    origin.lng >= bounds.minLng &&
    origin.lng <= bounds.maxLng;

  if (isWithinBounds) {
    // Use existing grid data
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += resolution) {
      for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += resolution) {
        const distance = haversineDistance(origin.lat, origin.lng, lat, lng);

        // Only consider spots within the radius band
        if (distance >= minRadiusKm && distance <= maxRadiusKm) {
          const bortle = getGridValue(lat, lng);

          if (bortle !== null) {
            candidates.push({ lat, lng, bortle, distance });
          }
        }
      }
    }
  } else {
    // Generate grid points around origin for areas outside sample data
    // Use ~10km resolution for searching
    const searchResolution = 0.1; // ~10km at mid latitudes
    const latRange = maxRadiusKm / 111; // approx degrees for km
    const lngRange = maxRadiusKm / (111 * Math.cos(origin.lat * Math.PI / 180));

    // 8 cardinal/intercardinal directions at various distances
    const directions = [
      { dlat: 1, dlng: 0 },   // N
      { dlat: 1, dlng: 1 },   // NE
      { dlat: 0, dlng: 1 },   // E
      { dlat: -1, dlng: 1 },  // SE
      { dlat: -1, dlng: 0 },  // S
      { dlat: -1, dlng: -1 }, // SW
      { dlat: 0, dlng: -1 },  // W
      { dlat: 1, dlng: -1 },  // NW
    ];

    // Sample at multiple distances in each direction
    const distanceSteps = [0.3, 0.5, 0.7, 0.9]; // fractions of maxRadius

    for (const dir of directions) {
      for (const distFraction of distanceSteps) {
        const targetDistance = maxRadiusKm * distFraction;
        const lat = origin.lat + (dir.dlat * latRange * distFraction);
        const lng = origin.lng + (dir.dlng * lngRange * distFraction);
        const actualDistance = haversineDistance(origin.lat, origin.lng, lat, lng);

        if (actualDistance >= minRadiusKm && actualDistance <= maxRadiusKm) {
          // Estimate Bortle based on distance from origin
          // Farther from cities = typically darker
          // Simple heuristic: assume bortle decreases with distance
          // Start at 6 (suburban) and improve up to 3 (rural) at max distance
          const bortleEstimate = Math.max(3, Math.round(6 - (distFraction * 3)));

          candidates.push({
            lat,
            lng,
            bortle: bortleEstimate,
            distance: actualDistance
          });
        }
      }
    }
  }

  // Sort by bortle (darkest first), then by distance (closer first)
  candidates.sort((a, b) => {
    if (a.bortle !== b.bortle) return a.bortle - b.bortle;
    return a.distance - b.distance;
  });

  // Return top N candidates
  return candidates.slice(0, count);
}
