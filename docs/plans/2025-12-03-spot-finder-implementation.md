# Spot Finder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Find the best accessible stargazing spots at 3 radius bands (10km, 50km, 150km) using light pollution data and OSM accessibility scoring, displayed as pins on the map.

**Architecture:** Server-side API queries Overpass for accessibility data, combines with Bortle scores to rank candidates, returns best spot per radius. Client displays search location + 3 spot pins on map with popups.

**Tech Stack:** Next.js 14, React-Leaflet, Overpass API, TypeScript

---

## Task 1: Add Accessibility Types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add new types for accessibility**

Add these types at the end of `src/lib/types.ts`:

```typescript
export interface AccessibilityFeature {
  type: 'parking' | 'park' | 'viewpoint' | 'road';
  name?: string;
  distance: number; // meters from spot
}

export interface AccessibilityScore {
  score: number;
  features: AccessibilityFeature[];
}

export interface SpotCandidate {
  lat: number;
  lng: number;
  bortle: number;
  distance: number; // km from origin
}

export interface ScoredSpot extends SpotResult {
  accessibilityScore: number;
  accessibilityFeatures: AccessibilityFeature[];
}

export interface SpotsResponseV2 {
  origin: GeocodedLocation;
  searchLocation: Coordinates;
  spots: ScoredSpot[];
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add accessibility types for spot finder"
```

---

## Task 2: Create Accessibility Module

**Files:**
- Create: `src/lib/accessibility.ts`

**Step 1: Create the accessibility module with Overpass query**

Create `src/lib/accessibility.ts`:

```typescript
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

    // Keep only the most relevant features (top 5)
    const topFeatures = features
      .filter(f => f.type !== 'road') // Don't show roads in features list
      .slice(0, 5);

    return { score, features: topFeatures };
  } catch (error) {
    console.error('Error fetching accessibility data:', error);
    return { score: 0, features: [] };
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/accessibility.ts
git commit -m "feat(accessibility): add Overpass API integration for accessibility scoring"
```

---

## Task 3: Modify Light Pollution Module for Multi-Candidate Search

**Files:**
- Modify: `src/lib/light-pollution.ts`

**Step 1: Add function to find multiple dark candidates**

Add this new function to `src/lib/light-pollution.ts` (keep existing functions):

```typescript
export interface DarkCandidate {
  lat: number;
  lng: number;
  bortle: number;
  distance: number;
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
```

**Step 2: Update findAllSpots to use new radius bands**

Replace the `findAllSpots` function:

```typescript
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
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/light-pollution.ts
git commit -m "feat(light-pollution): add multi-candidate search and update radius bands"
```

---

## Task 4: Update API Route with Accessibility Scoring

**Files:**
- Modify: `src/app/api/spots/route.ts`

**Step 1: Rewrite the API route to combine accessibility scoring**

Replace entire contents of `src/app/api/spots/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { findDarkCandidates } from "@/lib/light-pollution";
import { getAccessibilityScore } from "@/lib/accessibility";
import { reverseGeocode } from "@/lib/geocode";
import { ScoredSpot, SpotsResponseV2 } from "@/lib/types";

const RADIUS_BANDS = [
  { min: 0, max: 10, label: 10 },
  { min: 10, max: 50, label: 50 },
  { min: 50, max: 150, label: 150 },
];

const CANDIDATES_PER_BAND = 5;

// Weighting for combined score (higher = more important)
const DARKNESS_WEIGHT = 2;
const ACCESSIBILITY_WEIGHT = 1;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  const origin = { lat, lng };
  const spots: ScoredSpot[] = [];

  // Process each radius band
  for (const band of RADIUS_BANDS) {
    const candidates = findDarkCandidates(origin, band.min, band.max, CANDIDATES_PER_BAND);

    if (candidates.length === 0) continue;

    // Score each candidate for accessibility
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const accessibility = await getAccessibilityScore({
          lat: candidate.lat,
          lng: candidate.lng,
        });

        // Combined score: darkness (inverted bortle) + accessibility
        const darknessScore = (9 - candidate.bortle) * DARKNESS_WEIGHT;
        const combinedScore = darknessScore + (accessibility.score * ACCESSIBILITY_WEIGHT);

        return {
          ...candidate,
          accessibilityScore: accessibility.score,
          accessibilityFeatures: accessibility.features,
          combinedScore,
        };
      })
    );

    // Sort by combined score (highest first)
    scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    // Take the best candidate for this band
    const best = scoredCandidates[0];

    spots.push({
      radius: band.label,
      lat: best.lat,
      lng: best.lng,
      bortle: best.bortle,
      label: getBortleLabel(best.bortle),
      accessibilityScore: best.accessibilityScore,
      accessibilityFeatures: best.accessibilityFeatures,
    });
  }

  // Get location name for origin
  const displayName = await reverseGeocode(lat, lng);

  const response: SpotsResponseV2 = {
    origin: {
      lat,
      lng,
      displayName: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    },
    searchLocation: { lat, lng },
    spots,
  };

  return NextResponse.json(response);
}

function getBortleLabel(bortle: number): string {
  const labels: Record<number, string> = {
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
  return labels[Math.min(9, Math.max(1, Math.round(bortle)))] || "Unknown";
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test the API manually**

Run: `curl "http://localhost:3000/api/spots?lat=48.1351&lng=11.582"`
Expected: JSON response with spots containing `accessibilityScore` and `accessibilityFeatures`

**Step 4: Commit**

```bash
git add src/app/api/spots/route.ts
git commit -m "feat(api): add accessibility scoring to spots endpoint"
```

---

## Task 5: Add Map Pins to LightPollutionMap Component

**Files:**
- Modify: `src/components/LightPollutionMap.tsx`

**Step 1: Update component to accept and display spots**

Replace entire contents of `src/components/LightPollutionMap.tsx`:

```typescript
"use client";

import { MapContainer, TileLayer, LayersControl, useMap, Marker, Popup } from "react-leaflet";
import { LatLngExpression, Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { ScoredSpot, Coordinates } from "@/lib/types";

interface LightPollutionMapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  overlayOpacity?: number;
  searchLocation?: Coordinates | null;
  spots?: ScoredSpot[];
  onSpotClick?: (spot: ScoredSpot) => void;
}

// Component to handle map center and zoom updates
function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

// Custom icon for search location
const searchLocationIcon = new DivIcon({
  className: 'search-location-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom icons for spots by radius
function getSpotIcon(radius: number): DivIcon {
  const colors: Record<number, string> = {
    10: '#22c55e',  // green - closest
    50: '#eab308',  // yellow - medium
    150: '#f97316', // orange - furthest
  };
  const color = colors[radius] || '#6b7280';

  return new DivIcon({
    className: 'spot-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">${radius}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function LightPollutionMap({
  center = [48.1351, 11.582],
  zoom = 6,
  className = "h-[500px] w-full rounded-lg",
  overlayOpacity = 0.4,
  searchLocation,
  spots = [],
  onSpotClick,
}: LightPollutionMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
      maxZoom={18}
    >
      <MapUpdater center={center} zoom={zoom} />

      <LayersControl position="topright" collapsed={false}>
        {/* Base layers */}
        <LayersControl.BaseLayer checked name="Dark">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            className="base-map-enhanced"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Stadia Dark">
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Light pollution overlay */}
        <LayersControl.Overlay checked name="Light Pollution 2024">
          <TileLayer
            url="https://djlorenz.github.io/astronomy/image_tiles/tiles2024/tile_{z}_{x}_{y}.png"
            opacity={overlayOpacity}
            tileSize={1024}
            zoomOffset={-2}
            maxNativeZoom={8}
            maxZoom={18}
            attribution='<a href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html">D. Lorenz</a>'
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Light Pollution 2022">
          <TileLayer
            url="https://djlorenz.github.io/astronomy/image_tiles/tiles2022/tile_{z}_{x}_{y}.png"
            opacity={overlayOpacity}
            tileSize={1024}
            zoomOffset={-2}
            maxNativeZoom={8}
            maxZoom={18}
            attribution='<a href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html">D. Lorenz</a>'
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Night Lights (NASA 2016)">
          <TileLayer
            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png"
            opacity={overlayOpacity}
            maxNativeZoom={8}
            maxZoom={18}
            attribution='NASA VIIRS Black Marble'
          />
        </LayersControl.Overlay>
      </LayersControl>

      {/* Search location marker */}
      {searchLocation && (
        <Marker
          position={[searchLocation.lat, searchLocation.lng]}
          icon={searchLocationIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Your search location</strong>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Spot markers */}
      {spots.map((spot) => (
        <Marker
          key={spot.radius}
          position={[spot.lat, spot.lng]}
          icon={getSpotIcon(spot.radius)}
          eventHandlers={{
            click: () => onSpotClick?.(spot),
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <div className="font-bold mb-2">
                {spot.radius}km - {spot.label} Sky
              </div>

              {spot.accessibilityFeatures && spot.accessibilityFeatures.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Nearby:</div>
                  <ul className="text-xs space-y-1">
                    {spot.accessibilityFeatures.slice(0, 3).map((feature, idx) => (
                      <li key={idx}>
                        {feature.type === 'parking' && '🅿️ '}
                        {feature.type === 'park' && '🌲 '}
                        {feature.type === 'viewpoint' && '👁️ '}
                        {feature.name || feature.type}
                        <span className="text-gray-400 ml-1">
                          ({formatDistance(feature.distance)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs"
              >
                Get directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/LightPollutionMap.tsx
git commit -m "feat(map): add search location and spot markers with popups"
```

---

## Task 6: Update Map Wrapper Component

**Files:**
- Modify: `src/components/Map.tsx`

**Step 1: Update Map props to pass through spots**

Replace entire contents of `src/components/Map.tsx`:

```typescript
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { LatLngExpression } from "leaflet";
import { ScoredSpot, Coordinates } from "@/lib/types";

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  overlayOpacity?: number;
  searchLocation?: Coordinates | null;
  spots?: ScoredSpot[];
  onSpotClick?: (spot: ScoredSpot) => void;
}

export default function Map({
  center,
  zoom,
  className,
  overlayOpacity,
  searchLocation,
  spots,
  onSpotClick,
}: MapProps) {
  const LightPollutionMap = useMemo(
    () =>
      dynamic(() => import("./LightPollutionMap"), {
        loading: () => (
          <div
            className={`${className || "h-[500px] w-full"} bg-surface/50 rounded-lg flex items-center justify-center`}
          >
            <div className="text-foreground/60">Loading map...</div>
          </div>
        ),
        ssr: false,
      }),
    [className]
  );

  return (
    <LightPollutionMap
      center={center}
      zoom={zoom}
      className={className}
      overlayOpacity={overlayOpacity}
      searchLocation={searchLocation}
      spots={spots}
      onSpotClick={onSpotClick}
    />
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/Map.tsx
git commit -m "feat(map): pass spots and search location props to LightPollutionMap"
```

---

## Task 7: Update Main Page to Pass Data to Map

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page to track search location and pass spots to map**

Key changes to `src/app/page.tsx`:

1. Add state for search location coordinates
2. Update `handleSearch` to store search location
3. Update `handleFindSpots` to parse new API response
4. Pass `searchLocation` and `spots` to Map component
5. Add handler for spot clicks

Replace the page with:

```typescript
"use client";

import { useState } from "react";
import Map from "@/components/Map";
import MapSearchBar from "@/components/MapSearchBar";
import { ScoredSpot, Coordinates } from "@/lib/types";

export default function Home() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.1351, 11.582]);
  const [mapZoom, setMapZoom] = useState(6);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  // Search location for pin
  const [searchLocation, setSearchLocation] = useState<Coordinates | null>(null);

  // Stargazing spots state
  const [spots, setSpots] = useState<ScoredSpot[]>([]);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [showSpots, setShowSpots] = useState(false);

  const handleSearch = (lat: number, lng: number, name?: string) => {
    setMapCenter([lat, lng]);
    setMapZoom(10);
    setLocationName(name || null);
    setSearchLocation({ lat, lng });
    setShowSpots(false);
    setSpots([]);
  };

  const handleFindSpots = async () => {
    if (!searchLocation) {
      // Use current map center if no search location
      setSearchLocation({ lat: mapCenter[0], lng: mapCenter[1] });
    }

    const location = searchLocation || { lat: mapCenter[0], lng: mapCenter[1] };

    setIsLoadingSpots(true);
    setShowSpots(true);

    try {
      const response = await fetch(`/api/spots?lat=${location.lat}&lng=${location.lng}`);
      const data = await response.json();

      if (data.spots) {
        setSpots(data.spots);

        // Zoom out to show all spots if we have results
        if (data.spots.length > 0) {
          setMapZoom(7);
        }
      }
    } catch (err) {
      console.error("Failed to find spots:", err);
    } finally {
      setIsLoadingSpots(false);
    }
  };

  const handleSpotClick = (spot: ScoredSpot) => {
    setMapCenter([spot.lat, spot.lng]);
    setMapZoom(12);
  };

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {/* Fullscreen Map */}
      <Map
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        overlayOpacity={overlayOpacity}
        searchLocation={searchLocation}
        spots={spots}
        onSpotClick={handleSpotClick}
      />

      {/* Top Left - Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Find Stargazing Spots Button */}
        <button
          onClick={handleFindSpots}
          disabled={isLoadingSpots}
          className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-4 py-2.5 shadow-lg hover:bg-card transition-colors flex items-center gap-2 text-sm"
        >
          {isLoadingSpots ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )}
          <span>Find Dark Skies</span>
        </button>

        {/* Opacity Control */}
        <button
          onClick={() => setShowOpacitySlider(!showOpacitySlider)}
          className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-4 py-2.5 shadow-lg hover:bg-card transition-colors flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span>Overlay</span>
        </button>

        {/* Opacity Slider */}
        {showOpacitySlider && (
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/60 w-6">0%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-24 accent-accent"
              />
              <span className="text-xs text-foreground/60 w-8">{Math.round(overlayOpacity * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Spots Results Panel */}
      {showSpots && (
        <div className="absolute top-4 right-4 z-[1000] w-72">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <h3 className="font-medium text-sm">Dark Sky Spots</h3>
              <button
                onClick={() => setShowSpots(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoadingSpots ? (
                <div className="p-4 text-center text-foreground/60 text-sm">
                  Searching for dark skies...
                </div>
              ) : spots.length === 0 ? (
                <div className="p-4 text-center text-foreground/60 text-sm">
                  No spots found nearby
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {spots.map((spot) => (
                    <button
                      key={spot.radius}
                      onClick={() => handleSpotClick(spot)}
                      className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Within {spot.radius}km</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          spot.accessibilityScore >= 4 ? 'bg-success/20 text-success' :
                          spot.accessibilityScore >= 2 ? 'bg-warning/20 text-warning' :
                          'bg-foreground/10 text-foreground/60'
                        }`}>
                          {spot.accessibilityScore >= 4 ? 'Easy access' :
                           spot.accessibilityScore >= 2 ? 'Some access' : 'Limited access'}
                        </span>
                      </div>
                      {spot.accessibilityFeatures && spot.accessibilityFeatures.length > 0 && (
                        <div className="text-xs text-foreground/60">
                          {spot.accessibilityFeatures[0].name ||
                           `Near ${spot.accessibilityFeatures[0].type}`}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location indicator - Top Center */}
      {locationName && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground/80">{locationName}</span>
          </div>
        </div>
      )}

      {/* Floating Search Bar - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]">
        <MapSearchBar onSearch={handleSearch} isLoading={false} />
      </div>
    </main>
  );
}
```

**Step 2: Verify the app compiles and runs**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual test**

1. Open http://localhost:3000
2. Search for a location (e.g., "Munich")
3. Click "Find Dark Skies"
4. Verify: Blue pin appears at search location
5. Verify: 3 colored pins appear for spots
6. Verify: Clicking a pin shows popup with accessibility info
7. Verify: Clicking a spot in sidebar zooms to that spot

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): integrate spots with map pins and updated sidebar"
```

---

## Task 8: Final Integration Test and Cleanup

**Files:**
- All modified files

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run the dev server and test**

Run: `npm run dev`

Test checklist:
- [ ] Map loads with light pollution overlay
- [ ] Search works and shows blue pin
- [ ] "Find Dark Skies" button triggers search
- [ ] 3 spot pins appear (green/yellow/orange for 10/50/150km)
- [ ] Clicking spot pin shows popup with accessibility info
- [ ] Popup has "Get directions" link that opens Google Maps
- [ ] Sidebar shows spots with accessibility labels
- [ ] Clicking sidebar item zooms to spot

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete spot finder with accessibility scoring

- Add accessibility types and Overpass API integration
- Update light pollution module for multi-candidate search
- Combine darkness + accessibility scoring in API
- Display search location and spot pins on map
- Show accessibility info in popups and sidebar"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add accessibility types | `src/lib/types.ts` |
| 2 | Create accessibility module | `src/lib/accessibility.ts` |
| 3 | Multi-candidate search | `src/lib/light-pollution.ts` |
| 4 | Update API with scoring | `src/app/api/spots/route.ts` |
| 5 | Add map pins | `src/components/LightPollutionMap.tsx` |
| 6 | Update Map wrapper | `src/components/Map.tsx` |
| 7 | Update main page | `src/app/page.tsx` |
| 8 | Integration test | All files |
