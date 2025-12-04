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

  // Scan grid cells within radius band
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

  // Sort by bortle (darkest first), then by distance (closer first)
  candidates.sort((a, b) => {
    if (a.bortle !== b.bortle) return a.bortle - b.bortle;
    return a.distance - b.distance;
  });

  // Return top N candidates
  return candidates.slice(0, count);
}
