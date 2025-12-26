import { Coordinates } from "./types";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const ROAD_SEARCH_RADIUS_M = 1000; // 1km

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export interface RoadAccessResult {
  hasRoadAccess: boolean;
  nearestFeature?: {
    type: "parking" | "road" | "park";
    name?: string;
    distance: number;
  };
}

function buildRoadCheckQuery(lat: number, lng: number, radiusM: number): string {
  return `
    [out:json][timeout:10];
    (
      // Roads
      way["highway"~"^(primary|secondary|tertiary|unclassified|residential|service)$"](around:${radiusM},${lat},${lng});
      // Parking
      node["amenity"="parking"](around:${radiusM},${lat},${lng});
      way["amenity"="parking"](around:${radiusM},${lat},${lng});
    );
    out center 1;
  `;
}

function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
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

export async function checkRoadAccess(spot: Coordinates): Promise<RoadAccessResult> {
  try {
    const query = buildRoadCheckQuery(spot.lat, spot.lng, ROAD_SEARCH_RADIUS_M);

    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error("Overpass API error:", response.status);
      return { hasRoadAccess: false };
    }

    const data: OverpassResponse = await response.json();

    if (data.elements.length === 0) {
      return { hasRoadAccess: false };
    }

    // Find the nearest feature
    const element = data.elements[0];
    const tags = element.tags || {};

    let coords: { lat: number; lng: number } | null = null;
    if (element.lat !== undefined && element.lon !== undefined) {
      coords = { lat: element.lat, lng: element.lon };
    } else if (element.center) {
      coords = { lat: element.center.lat, lng: element.center.lon };
    }

    const distance = coords
      ? Math.round(haversineDistanceM(spot.lat, spot.lng, coords.lat, coords.lng))
      : 0;

    const featureType: "parking" | "road" | "park" =
      tags.amenity === "parking" ? "parking" : "road";

    return {
      hasRoadAccess: true,
      nearestFeature: {
        type: featureType,
        name: tags.name,
        distance,
      },
    };
  } catch (error) {
    console.error("Error checking road access:", error);
    return { hasRoadAccess: false };
  }
}

// Keep old exports for backward compatibility during migration
export async function getAccessibilityScore(spot: Coordinates) {
  const result = await checkRoadAccess(spot);
  return {
    score: result.hasRoadAccess ? 3 : 0,
    features: result.nearestFeature
      ? [{ type: result.nearestFeature.type, name: result.nearestFeature.name, distance: result.nearestFeature.distance }]
      : [],
  };
}
