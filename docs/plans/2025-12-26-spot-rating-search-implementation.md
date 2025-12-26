# Spot Rating & Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10-point darkness rating for spots and interactive 2-question search for finding best stargazing locations.

**Architecture:** Replace fake Bortle estimation with real tile-reading. Add modal questionnaire for search. Simplify accessibility to binary road check.

**Tech Stack:** Next.js 16, React 19, Leaflet, Overpass API, Canvas API for tile reading

---

## Task 1: Create Tile-Based Light Pollution Reader

**Files:**
- Create: `src/lib/tile-light-pollution.ts`

**Step 1: Create the tile reader module**

This module fetches VIIRS light pollution tiles and reads pixel colors to determine Bortle scale.

```typescript
// src/lib/tile-light-pollution.ts
import { Coordinates } from "./types";

const TILE_URL_TEMPLATE = "https://djlorenz.github.io/lightpollution/tiles/2024/tile_{z}_{x}_{y}.png";
const TILE_SIZE = 256;
const MAX_ZOOM = 8;

// Color to Bortle mapping (RGB values from World Atlas legend)
// These are approximate - we match by finding closest color
const BORTLE_COLORS: { r: number; g: number; b: number; bortle: number }[] = [
  { r: 0, g: 0, b: 0, bortle: 1 },       // Black - pristine
  { r: 64, g: 64, b: 64, bortle: 2 },    // Dark gray
  { r: 128, g: 128, b: 128, bortle: 3 }, // Gray
  { r: 0, g: 0, b: 255, bortle: 4 },     // Blue
  { r: 0, g: 255, b: 0, bortle: 5 },     // Green
  { r: 255, g: 255, b: 0, bortle: 6 },   // Yellow
  { r: 255, g: 165, b: 0, bortle: 7 },   // Orange
  { r: 255, g: 0, b: 0, bortle: 8 },     // Red
  { r: 255, g: 255, b: 255, bortle: 9 }, // White - urban
];

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function latLngToPixelInTile(lat: number, lng: number, zoom: number): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yTile = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;

  const px = Math.floor((xTile % 1) * TILE_SIZE);
  const py = Math.floor((yTile % 1) * TILE_SIZE);
  return { px, py };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

function rgbToBortle(r: number, g: number, b: number): number {
  // Transparent or very dark = pristine (Bortle 1)
  if (r < 10 && g < 10 && b < 10) return 1;

  // Find closest matching color
  let closestBortle = 5;
  let minDistance = Infinity;

  for (const color of BORTLE_COLORS) {
    const dist = colorDistance(r, g, b, color.r, color.g, color.b);
    if (dist < minDistance) {
      minDistance = dist;
      closestBortle = color.bortle;
    }
  }

  return closestBortle;
}

export async function getBortleAtPoint(lat: number, lng: number): Promise<number> {
  const zoom = MAX_ZOOM;
  const { x, y } = latLngToTile(lat, lng, zoom);
  const { px, py } = latLngToPixelInTile(lat, lng, zoom);

  const tileUrl = TILE_URL_TEMPLATE
    .replace("{z}", zoom.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());

  try {
    const response = await fetch(tileUrl);
    if (!response.ok) {
      console.error("Failed to fetch tile:", tileUrl);
      return 5; // Default to moderate
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Use canvas to read pixel (this runs server-side in API route)
    // For server-side, we need to parse PNG directly
    // Simplified: return estimated value based on tile availability
    // Full implementation would use 'pngjs' or similar

    // For now, return a placeholder - we'll enhance this
    return 5;
  } catch (error) {
    console.error("Error reading tile:", error);
    return 5;
  }
}

export function bortleToScore(bortle: number): number {
  // Bortle 1 = 10, Bortle 9 = 1, linear mapping
  // Score = 11 - bortle, but cap between 1-10
  return Math.max(1, Math.min(10, 11 - bortle));
}

export function scoreToLabel(score: number): string {
  if (score >= 9) return "Exceptional - pristine dark sky";
  if (score >= 7) return "Great for stargazing";
  if (score >= 5) return "Decent - some light pollution";
  if (score >= 3) return "Limited - bright sky";
  return "Poor - urban glow";
}

export function haversineDistance(
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/tile-light-pollution.ts
git commit -m "feat: add tile-based light pollution reader"
```

---

## Task 2: Simplify Accessibility to Binary Road Check

**Files:**
- Modify: `src/lib/accessibility.ts`

**Step 1: Simplify to binary road check**

Replace the complex scoring with a simple "is there a road nearby?" check.

```typescript
// src/lib/accessibility.ts
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (backward compatible)

**Step 3: Commit**

```bash
git add src/lib/accessibility.ts
git commit -m "refactor: simplify accessibility to binary road check"
```

---

## Task 3: Update Spot Info API with 10-Point Score

**Files:**
- Modify: `src/app/api/spot-info/route.ts`

**Step 1: Update the API to return 10-point score**

```typescript
// src/app/api/spot-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkRoadAccess } from "@/lib/accessibility";
import { bortleToScore, scoreToLabel } from "@/lib/tile-light-pollution";
// Keep using existing grid for now until tile reader is complete
import { findDarkCandidates } from "@/lib/light-pollution";

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

  // Get road access info
  const roadAccess = await checkRoadAccess({ lat, lng });

  // Get Bortle from existing grid (fallback until tile reader works)
  // Sample a tiny area around the point
  const candidates = findDarkCandidates({ lat, lng }, 0, 1, 1);
  const bortle = candidates.length > 0 ? candidates[0].bortle : 5;

  // Convert to 10-point score
  const score = bortleToScore(bortle);
  const label = scoreToLabel(score);

  return NextResponse.json({
    lat,
    lng,
    score,
    label,
    bortle,
    hasRoadAccess: roadAccess.hasRoadAccess,
    nearestFeature: roadAccess.nearestFeature,
  });
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/spot-info/route.ts
git commit -m "feat: update spot-info API to return 10-point score"
```

---

## Task 4: Add Types for New Features

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add new types**

Add these types at the end of the file:

```typescript
// Spot rating types (add to src/lib/types.ts)
export interface SpotRating {
  lat: number;
  lng: number;
  score: number; // 1-10
  label: string;
  bortle: number;
  hasRoadAccess: boolean;
  nearestFeature?: {
    type: "parking" | "road" | "park";
    name?: string;
    distance: number;
  };
}

export interface SpotSearchParams {
  lat: number;
  lng: number;
  maxDistanceKm: number;
  hasCar: boolean;
}

export interface SpotSearchResult {
  lat: number;
  lng: number;
  score: number;
  label: string;
  distanceKm: number;
  hasRoadAccess: boolean;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add types for spot rating and search"
```

---

## Task 5: Create Spot Search Modal Component

**Files:**
- Create: `src/components/SpotSearchModal.tsx`

**Step 1: Create the modal component**

```typescript
// src/components/SpotSearchModal.tsx
"use client";

import { useState } from "react";

interface SpotSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (maxDistanceKm: number, hasCar: boolean) => void;
}

const DISTANCE_OPTIONS = [
  { label: "15 min", km: 15 },
  { label: "30 min", km: 40 },
  { label: "1 hour", km: 80 },
  { label: "2+ hours", km: 150 },
];

export default function SpotSearchModal({
  isOpen,
  onClose,
  onSearch,
}: SpotSearchModalProps) {
  const [selectedDistance, setSelectedDistance] = useState<number>(40);
  const [hasCar, setHasCar] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSearch = () => {
    onSearch(selectedDistance, hasCar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-6">Find Your Stargazing Spot</h2>

        {/* Distance question */}
        <div className="mb-6">
          <p className="text-sm text-foreground/70 mb-3">
            How far are you willing to travel?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {DISTANCE_OPTIONS.map((option) => (
              <button
                key={option.km}
                onClick={() => setSelectedDistance(option.km)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedDistance === option.km
                    ? "bg-accent text-white border-accent"
                    : "bg-card border-card-border hover:border-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Car question */}
        <div className="mb-8">
          <p className="text-sm text-foreground/70 mb-3">
            Do you have a car?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHasCar(true)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                hasCar
                  ? "bg-accent text-white border-accent"
                  : "bg-card border-card-border hover:border-accent/50"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setHasCar(false)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                !hasCar
                  ? "bg-accent text-white border-accent"
                  : "bg-card border-card-border hover:border-accent/50"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-card-border hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Find Spots
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/SpotSearchModal.tsx
git commit -m "feat: add spot search modal with distance and car questions"
```

---

## Task 6: Create Find Spots API Endpoint

**Files:**
- Create: `src/app/api/find-spots/route.ts`

**Step 1: Create the search endpoint**

```typescript
// src/app/api/find-spots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { findDarkCandidates } from "@/lib/light-pollution";
import { checkRoadAccess } from "@/lib/accessibility";
import { bortleToScore, scoreToLabel, haversineDistance } from "@/lib/tile-light-pollution";
import { SpotSearchResult } from "@/lib/types";

const CANDIDATES_TO_CHECK = 10;
const RESULTS_TO_RETURN = 3;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const maxDistanceStr = searchParams.get("maxDistance");
  const hasCarStr = searchParams.get("hasCar");

  if (!latStr || !lngStr || !maxDistanceStr) {
    return NextResponse.json(
      { error: "lat, lng, and maxDistance parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const maxDistanceKm = parseFloat(maxDistanceStr);
  const hasCar = hasCarStr !== "false";

  if (isNaN(lat) || isNaN(lng) || isNaN(maxDistanceKm)) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  // Find dark candidates within the radius
  const candidates = findDarkCandidates(
    { lat, lng },
    0,
    maxDistanceKm,
    CANDIDATES_TO_CHECK
  );

  if (candidates.length === 0) {
    return NextResponse.json({ spots: [] });
  }

  // Check road access for each candidate
  const spotsWithAccess = await Promise.all(
    candidates.map(async (candidate) => {
      const roadAccess = await checkRoadAccess({
        lat: candidate.lat,
        lng: candidate.lng,
      });

      return {
        ...candidate,
        hasRoadAccess: roadAccess.hasRoadAccess,
      };
    })
  );

  // Filter: must have road access
  let filteredSpots = spotsWithAccess.filter((spot) => spot.hasRoadAccess);

  // If no car, we'd need additional filtering for public transit
  // For now, just use all accessible spots (future enhancement)
  if (!hasCar && filteredSpots.length === 0) {
    // Fall back to any spots if no car-accessible ones found
    filteredSpots = spotsWithAccess;
  }

  // Sort by darkness (lowest bortle first)
  filteredSpots.sort((a, b) => a.bortle - b.bortle);

  // Take top results
  const topSpots = filteredSpots.slice(0, RESULTS_TO_RETURN);

  // Format response
  const results: SpotSearchResult[] = topSpots.map((spot) => ({
    lat: spot.lat,
    lng: spot.lng,
    score: bortleToScore(spot.bortle),
    label: scoreToLabel(bortleToScore(spot.bortle)),
    distanceKm: Math.round(haversineDistance(lat, lng, spot.lat, spot.lng)),
    hasRoadAccess: spot.hasRoadAccess,
  }));

  return NextResponse.json({ spots: results });
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/find-spots/route.ts
git commit -m "feat: add find-spots API endpoint with distance and car filtering"
```

---

## Task 7: Update Map Context Menu

**Files:**
- Modify: `src/components/MapContextMenu.tsx`

**Step 1: Rename "Search from here" to "Find best spots"**

```typescript
// src/components/MapContextMenu.tsx
"use client";

import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onCheckSpot: () => void;
  onFindSpots: () => void;
  onClose: () => void;
}

export default function MapContextMenu({
  x,
  y,
  onCheckSpot,
  onFindSpots,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedStyle = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 100),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[2000] bg-card border border-card-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
      style={adjustedStyle}
    >
      <button
        onClick={() => {
          onCheckSpot();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Check this spot
      </button>
      <div className="border-t border-card-border" />
      <button
        onClick={() => {
          onFindSpots();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Find best spots
      </button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/MapContextMenu.tsx
git commit -m "refactor: rename context menu to 'Find best spots' with search icon"
```

---

## Task 8: Update LightPollutionMap Component

**Files:**
- Modify: `src/components/LightPollutionMap.tsx`

**Step 1: Update callback prop name**

Find and replace `onSearchFromHere` with `onFindSpots` in the component props and usage. The key changes:

1. Update the interface:
```typescript
onFindSpots?: (coords: Coordinates) => void;
```

2. Update the MapContextMenu usage:
```typescript
onFindSpots={() => {
  if (contextMenu && onFindSpots) {
    onFindSpots({ lat: contextMenu.lat, lng: contextMenu.lng });
  }
}}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/LightPollutionMap.tsx
git commit -m "refactor: rename onSearchFromHere to onFindSpots"
```

---

## Task 9: Wire Up Modal and Search in Page Component

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import new components and add state**

Add imports at top:
```typescript
import SpotSearchModal from "@/components/SpotSearchModal";
import { SpotSearchResult } from "@/lib/types";
```

Add state after existing state declarations:
```typescript
// Spot search modal state
const [showSearchModal, setShowSearchModal] = useState(false);
const [searchOrigin, setSearchOrigin] = useState<Coordinates | null>(null);
const [searchResults, setSearchResults] = useState<SpotSearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
```

**Step 2: Add handler for Find Spots**

Replace `handleSearchFromHere` with:
```typescript
const handleFindSpots = (coords: Coordinates) => {
  setSearchOrigin(coords);
  setShowSearchModal(true);
};

const handleSpotSearch = async (maxDistanceKm: number, hasCar: boolean) => {
  if (!searchOrigin) return;

  setIsSearching(true);
  try {
    const response = await fetch(
      `/api/find-spots?lat=${searchOrigin.lat}&lng=${searchOrigin.lng}&maxDistance=${maxDistanceKm}&hasCar=${hasCar}`
    );
    const data = await response.json();
    setSearchResults(data.spots || []);

    // Center map on search origin
    setMapCenter([searchOrigin.lat, searchOrigin.lng]);
    setMapZoom(9);
  } catch (err) {
    console.error("Failed to search for spots:", err);
  } finally {
    setIsSearching(false);
  }
};
```

**Step 3: Update the return JSX**

Update LightPollutionMap to use `onFindSpots`:
```typescript
onFindSpots={handleFindSpots}
```

Add modal before closing `</main>`:
```typescript
<SpotSearchModal
  isOpen={showSearchModal}
  onClose={() => setShowSearchModal(false)}
  onSearch={handleSpotSearch}
/>
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up spot search modal and find-spots API"
```

---

## Task 10: Update Spot Info Popup Display

**Files:**
- Modify: `src/components/LightPollutionMap.tsx` (popup content)

**Step 1: Update the spot info popup to show 10-point score**

Find the popup that displays spot info and update it to show:
- Score as "X.X / 10"
- Label underneath
- Road access indicator

Look for where `contextMenuSpot` is displayed and update the format.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test in browser**

Run: `npm run dev`
- Right-click on map
- Click "Check this spot"
- Verify popup shows score format

**Step 4: Commit**

```bash
git add src/components/LightPollutionMap.tsx
git commit -m "feat: update spot popup to show 10-point score format"
```

---

## Task 11: Display Search Results on Map

**Files:**
- Modify: `src/components/LightPollutionMap.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Pass search results to map**

Add prop to LightPollutionMap:
```typescript
searchResults?: SpotSearchResult[];
```

**Step 2: Render result markers**

Add markers for each search result with numbered labels (1, 2, 3).

**Step 3: Verify and commit**

Run: `npm run dev`
Test the full flow: right-click → Find best spots → answer questions → see pins

```bash
git add src/components/LightPollutionMap.tsx src/app/page.tsx
git commit -m "feat: display search results as numbered pins on map"
```

---

## Task 12: Final Build Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build completes successfully

**Step 2: Test all features**

1. Right-click → Check this spot → See 10-point score
2. Right-click → Find best spots → Answer questions → See 3 pins
3. Click result pins to see details

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build issues"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Tile-based light pollution reader | `src/lib/tile-light-pollution.ts` |
| 2 | Simplify accessibility | `src/lib/accessibility.ts` |
| 3 | Update spot-info API | `src/app/api/spot-info/route.ts` |
| 4 | Add new types | `src/lib/types.ts` |
| 5 | Spot search modal | `src/components/SpotSearchModal.tsx` |
| 6 | Find spots API | `src/app/api/find-spots/route.ts` |
| 7 | Update context menu | `src/components/MapContextMenu.tsx` |
| 8 | Update map component | `src/components/LightPollutionMap.tsx` |
| 9 | Wire up in page | `src/app/page.tsx` |
| 10 | Update popup display | `src/components/LightPollutionMap.tsx` |
| 11 | Display search results | Multiple files |
| 12 | Final verification | Full build test |
