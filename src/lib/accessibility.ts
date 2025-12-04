import { AccessibilityFeature, AccessibilityScore, Coordinates } from "./types";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Search radius in meters for accessibility features
const SEARCH_RADIUS_M = 2000;

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

function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `
    [out:json][timeout:25];
    (
      // Parking
      node["amenity"="parking"](around:${radiusM},${lat},${lng});
      way["amenity"="parking"](around:${radiusM},${lat},${lng});
      node["highway"="rest_area"](around:${radiusM},${lat},${lng});
      way["highway"="rest_area"](around:${radiusM},${lat},${lng});

      // Parks and nature
      way["leisure"="park"](around:${radiusM},${lat},${lng});
      way["leisure"="nature_reserve"](around:${radiusM},${lat},${lng});
      relation["boundary"="national_park"](around:${radiusM},${lat},${lng});
      way["natural"="beach"](around:${radiusM},${lat},${lng});

      // Viewpoints
      node["tourism"="viewpoint"](around:${radiusM},${lat},${lng});

      // Roads (for basic accessibility check)
      way["highway"~"^(primary|secondary|tertiary|unclassified|residential)$"](around:${radiusM},${lat},${lng});
    );
    out center;
  `;
}

function haversineDistance(
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

function categorizeElement(element: OverpassElement): AccessibilityFeature['type'] | null {
  const tags = element.tags || {};

  if (tags.amenity === 'parking' || tags.highway === 'rest_area') {
    return 'parking';
  }
  if (tags.leisure === 'park' || tags.leisure === 'nature_reserve' ||
      tags.boundary === 'national_park' || tags.natural === 'beach') {
    return 'park';
  }
  if (tags.tourism === 'viewpoint') {
    return 'viewpoint';
  }
  if (tags.highway) {
    return 'road';
  }
  return null;
}

function getElementCoords(element: OverpassElement): Coordinates | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

export async function getAccessibilityScore(
  spot: Coordinates
): Promise<AccessibilityScore> {
  try {
    const query = buildOverpassQuery(spot.lat, spot.lng, SEARCH_RADIUS_M);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status);
      return { score: 0, features: [] };
    }

    const data: OverpassResponse = await response.json();

    const features: AccessibilityFeature[] = [];
    const seenTypes = new Set<string>();

    for (const element of data.elements) {
      const type = categorizeElement(element);
      if (!type) continue;

      const coords = getElementCoords(element);
      if (!coords) continue;

      const distance = haversineDistance(spot.lat, spot.lng, coords.lat, coords.lng);

      // Only add first of each type to avoid duplicates
      const typeKey = `${type}-${element.tags?.name || 'unnamed'}`;
      if (seenTypes.has(typeKey)) continue;
      seenTypes.add(typeKey);

      features.push({
        type,
        name: element.tags?.name,
        distance: Math.round(distance),
      });
    }

    // Calculate score
    let score = 0;
    const hasParking = features.some(f => f.type === 'parking');
    const hasPark = features.some(f => f.type === 'park');
    const hasViewpoint = features.some(f => f.type === 'viewpoint');
    const hasRoad = features.some(f => f.type === 'road');

    if (hasParking) score += 2;
    if (hasPark) score += 2;
    if (hasViewpoint) score += 1;
    if (hasRoad) score += 1;

    // Sort features by distance
    features.sort((a, b) => a.distance - b.distance);

    // Keep only the most relevant features (top 5, excluding roads)
    const topFeatures = features
      .filter(f => f.type !== 'road')
      .slice(0, 5);

    return { score, features: topFeatures };
  } catch (error) {
    console.error('Error fetching accessibility data:', error);
    return { score: 0, features: [] };
  }
}
