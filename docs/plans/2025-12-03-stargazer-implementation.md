# Stargazer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that finds the best stargazing spots near a location with weather forecasts and sky event recommendations.

**Architecture:** Next.js 14 App Router with API routes. Static light pollution data stored as JSON. External API calls to Open-Meteo (weather) and Nominatim (geocoding). Single-page UI with dark theme.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Nominatim API, Open-Meteo API

---

## Task 1: Project Setup

**Files:**
- Create: Next.js project structure via CLI

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/zitti/Documents/GitHub/stargazer
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: Project scaffolded with src/app directory structure

**Step 2: Verify setup**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Configure Dark Theme

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Step 1: Update globals.css for dark theme**

Replace contents of `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0f;
  --foreground: #e5e5e5;
  --card: #1a1a24;
  --card-border: #2a2a3a;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}
```

**Step 2: Update Tailwind config with custom colors**

Replace contents of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-border": "var(--card-border)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add .
git commit -m "feat: configure dark theme for stargazing aesthetic"
```

---

## Task 3: Create Type Definitions

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create types file**

Create `src/lib/types.ts`:

```typescript
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodedLocation extends Coordinates {
  displayName: string;
}

export interface LightPollutionData {
  resolution: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  grid: number[][];
}

export interface SpotResult {
  radius: number;
  lat: number;
  lng: number;
  bortle: number;
  label: string;
}

export interface SpotsResponse {
  origin: GeocodedLocation;
  spots: SpotResult[];
}

export interface WeatherForecast {
  date: string;
  cloudCover: number;
  visibility: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface SkyEvent {
  name: string;
  dates: string;
  description: string;
  type: "meteor_shower" | "planet" | "eclipse" | "conjunction" | "other";
}

export interface MoonPhase {
  newMoon: string;
  fullMoon: string;
}

export interface MonthlyEvents {
  month: string;
  updated: string;
  highlights: SkyEvent[];
  moonPhase: MoonPhase;
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 4: Create Sample Light Pollution Data

**Files:**
- Create: `src/data/light-pollution-sample.json`
- Create: `src/data/README.md`

**Note:** This is sample data for development. Real VIIRS data will be processed separately.

**Step 1: Create sample data file**

Create `src/data/light-pollution-sample.json`:

```json
{
  "resolution": 10,
  "bounds": {
    "minLat": 47,
    "maxLat": 55,
    "minLng": 5,
    "maxLng": 15
  },
  "grid": [
    [4, 4, 5, 5, 6, 6, 5, 5, 4, 4],
    [4, 3, 4, 5, 6, 7, 6, 5, 4, 3],
    [3, 3, 4, 5, 7, 8, 7, 5, 4, 3],
    [3, 2, 3, 4, 6, 7, 6, 4, 3, 2],
    [2, 2, 3, 4, 5, 6, 5, 4, 3, 2],
    [3, 2, 2, 3, 4, 5, 4, 3, 2, 2],
    [3, 3, 2, 2, 3, 4, 3, 2, 2, 3],
    [4, 3, 3, 2, 2, 3, 2, 2, 3, 3]
  ]
}
```

**Step 2: Create data README**

Create `src/data/README.md`:

```markdown
# Data Files

## light-pollution-sample.json

Sample light pollution data for development/testing.

- Coverage: Central Europe (roughly Germany area)
- Resolution: 10km per grid cell
- Values: Bortle scale 1-9 (lower = darker)

## Production Data

For production, download VIIRS nighttime lights data from:
- https://www.lightpollutionmap.info (export GeoTIFF)
- https://eogdata.mines.edu/products/vnl/ (NASA VIIRS)

Process into the same JSON format with higher resolution (~1km).
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add sample light pollution data for development"
```

---

## Task 5: Implement Light Pollution Query Library

**Files:**
- Create: `src/lib/light-pollution.ts`

**Step 1: Create light pollution library**

Create `src/lib/light-pollution.ts`:

```typescript
import { Coordinates, SpotResult, LightPollutionData } from "./types";
import lightPollutionData from "@/data/light-pollution-sample.json";

const data = lightPollutionData as LightPollutionData;

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
  const radiuses = [50, 100, 200];
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

**Step 2: Verify TypeScript compiles**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement light pollution query library"
```

---

## Task 6: Implement Geocoding Library

**Files:**
- Create: `src/lib/geocode.ts`

**Step 1: Create geocoding library**

Create `src/lib/geocode.ts`:

```typescript
import { GeocodedLocation } from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(
  address: string
): Promise<GeocodedLocation | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": "Stargazer/1.0 (stargazing spot finder)",
      },
    });

    if (!response.ok) {
      console.error("Geocoding failed:", response.status);
      return null;
    }

    const results = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        "User-Agent": "Stargazer/1.0 (stargazing spot finder)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement geocoding library with Nominatim"
```

---

## Task 7: Implement Weather Library

**Files:**
- Create: `src/lib/weather.ts`

**Step 1: Create weather library**

Create `src/lib/weather.ts`:

```typescript
import { WeatherForecast } from "./types";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

function getVisibilityLabel(
  cloudCover: number
): "Excellent" | "Good" | "Fair" | "Poor" {
  if (cloudCover <= 20) return "Excellent";
  if (cloudCover <= 40) return "Good";
  if (cloudCover <= 60) return "Fair";
  return "Poor";
}

export async function getWeatherForecast(
  lat: number,
  lng: number
): Promise<WeatherForecast[]> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily: "cloud_cover_mean",
      timezone: "auto",
      forecast_days: "3",
    });

    const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

    if (!response.ok) {
      console.error("Weather API failed:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.daily?.time || !data.daily?.cloud_cover_mean) {
      return [];
    }

    const forecasts: WeatherForecast[] = [];

    for (let i = 0; i < data.daily.time.length; i++) {
      const cloudCover = Math.round(data.daily.cloud_cover_mean[i]);
      forecasts.push({
        date: data.daily.time[i],
        cloudCover,
        visibility: getVisibilityLabel(cloudCover),
      });
    }

    return forecasts;
  } catch (error) {
    console.error("Weather API error:", error);
    return [];
  }
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement weather library with Open-Meteo"
```

---

## Task 8: Create API Route - Geocode

**Files:**
- Create: `src/app/api/geocode/route.ts`

**Step 1: Create geocode API route**

Create `src/app/api/geocode/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  const result = await geocodeAddress(address);

  if (!result) {
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add geocode API route"
```

---

## Task 9: Create API Route - Spots

**Files:**
- Create: `src/app/api/spots/route.ts`

**Step 1: Create spots API route**

Create `src/app/api/spots/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { findAllSpots } from "@/lib/light-pollution";
import { reverseGeocode } from "@/lib/geocode";
import { SpotsResponse } from "@/lib/types";

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

  const spots = findAllSpots({ lat, lng });

  // Get location name for origin
  const displayName = await reverseGeocode(lat, lng);

  const response: SpotsResponse = {
    origin: {
      lat,
      lng,
      displayName: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    },
    spots,
  };

  return NextResponse.json(response);
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add spots API route"
```

---

## Task 10: Create API Route - Weather

**Files:**
- Create: `src/app/api/weather/route.ts`

**Step 1: Create weather API route**

Create `src/app/api/weather/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/weather";

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

  const forecasts = await getWeatherForecast(lat, lng);

  return NextResponse.json({ forecasts });
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add weather API route"
```

---

## Task 11: Create Monthly Events Data

**Files:**
- Create: `src/data/monthly-events.json`

**Step 1: Create December 2025 events**

Create `src/data/monthly-events.json`:

```json
{
  "month": "2025-12",
  "updated": "2025-12-01",
  "highlights": [
    {
      "name": "Geminid Meteor Shower",
      "dates": "Dec 13-14",
      "description": "One of the best meteor showers of the year. Up to 150 multicolored meteors per hour. Best viewing after midnight.",
      "type": "meteor_shower"
    },
    {
      "name": "Ursid Meteor Shower",
      "dates": "Dec 21-22",
      "description": "Minor shower with 5-10 meteors per hour. Peaks on the winter solstice.",
      "type": "meteor_shower"
    },
    {
      "name": "Jupiter",
      "dates": "All month",
      "description": "Bright and visible most of the night in Taurus. Look for its four largest moons with binoculars.",
      "type": "planet"
    },
    {
      "name": "Saturn",
      "dates": "All month",
      "description": "Visible in the evening sky in Aquarius. Sets around midnight.",
      "type": "planet"
    },
    {
      "name": "Venus",
      "dates": "All month",
      "description": "Brilliant evening star in the west after sunset. Unmistakably bright.",
      "type": "planet"
    }
  ],
  "moonPhase": {
    "newMoon": "Dec 1",
    "fullMoon": "Dec 15"
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add December 2025 sky events data"
```

---

## Task 12: Create SearchForm Component

**Files:**
- Create: `src/components/SearchForm.tsx`

**Step 1: Create SearchForm component**

Create `src/components/SearchForm.tsx`:

```typescript
"use client";

import { useState } from "react";

interface SearchFormProps {
  onSearch: (lat: number, lng: number) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to find location");
        return;
      }

      onSearch(data.lat, data.lng);
    } catch {
      setError("Failed to search. Please try again.");
    }
  };

  const handleGeolocation = () => {
    setError(null);
    setIsGeolocating(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSearch(position.coords.latitude, position.coords.longitude);
        setIsGeolocating(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Please enter an address instead."
            : "Could not get your location. Please enter an address."
        );
        setIsGeolocating(false);
      }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={handleGeolocation}
        disabled={isLoading || isGeolocating}
        className="w-full mb-4 px-4 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isGeolocating ? "Getting location..." : "Use my location"}
      </button>

      <div className="text-center text-foreground/60 mb-4">or</div>

      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter city or address..."
          className="flex-1 px-4 py-3 bg-card border border-card-border rounded-lg focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-error text-sm text-center">{error}</p>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add SearchForm component"
```

---

## Task 13: Create SpotCard Component

**Files:**
- Create: `src/components/SpotCard.tsx`

**Step 1: Create SpotCard component**

Create `src/components/SpotCard.tsx`:

```typescript
import { SpotResult, WeatherForecast } from "@/lib/types";

interface SpotCardProps {
  spot: SpotResult;
  weather: WeatherForecast[] | null;
  isLoadingWeather: boolean;
}

const BORTLE_COLORS: Record<string, string> = {
  Excellent: "text-success",
  Good: "text-green-400",
  Moderate: "text-warning",
  Poor: "text-error",
};

const VISIBILITY_COLORS: Record<string, string> = {
  Excellent: "text-success",
  Good: "text-green-400",
  Fair: "text-warning",
  Poor: "text-error",
};

export default function SpotCard({
  spot,
  weather,
  isLoadingWeather,
}: SpotCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  const tonight = weather?.[0];

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{spot.radius}km radius</h3>
        <span className={`font-medium ${BORTLE_COLORS[spot.label]}`}>
          Bortle {spot.bortle} ({spot.label})
        </span>
      </div>

      <div className="text-foreground/60 text-sm mb-3">
        {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
      </div>

      {isLoadingWeather ? (
        <div className="text-foreground/40 text-sm mb-3">
          Loading weather...
        </div>
      ) : tonight ? (
        <div className="mb-3">
          <span className="text-foreground/60">Tonight: </span>
          <span>{tonight.cloudCover}% clouds - </span>
          <span className={VISIBILITY_COLORS[tonight.visibility]}>
            {tonight.visibility}
          </span>
        </div>
      ) : (
        <div className="text-foreground/40 text-sm mb-3">
          Weather unavailable
        </div>
      )}

      {weather && weather.length > 1 && (
        <div className="text-sm text-foreground/60 mb-3">
          <div className="flex gap-4">
            {weather.slice(1).map((day) => (
              <span key={day.date}>
                {new Date(day.date).toLocaleDateString("en", {
                  weekday: "short",
                })}
                :{" "}
                <span className={VISIBILITY_COLORS[day.visibility]}>
                  {day.visibility}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-card-border hover:bg-accent/20 rounded transition-colors text-sm"
      >
        Open in Maps
      </a>
    </div>
  );
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add SpotCard component"
```

---

## Task 14: Create SkyEvents Component

**Files:**
- Create: `src/components/SkyEvents.tsx`

**Step 1: Create SkyEvents component**

Create `src/components/SkyEvents.tsx`:

```typescript
import { MonthlyEvents } from "@/lib/types";

interface SkyEventsProps {
  events: MonthlyEvents;
}

const EVENT_ICONS: Record<string, string> = {
  meteor_shower: "☄️",
  planet: "🪐",
  eclipse: "🌑",
  conjunction: "✨",
  other: "⭐",
};

export default function SkyEvents({ events }: SkyEventsProps) {
  const today = new Date();
  const isNearNewMoon = (() => {
    const newMoonDate = new Date(
      `${events.month.slice(0, 4)}-${events.moonPhase.newMoon.replace("Dec ", "12-").replace("Jan ", "01-").replace("Feb ", "02-")}`
    );
    const diff = Math.abs(today.getTime() - newMoonDate.getTime());
    return diff < 5 * 24 * 60 * 60 * 1000; // Within 5 days
  })();

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">What to see tonight</h2>

      <div className="space-y-3">
        {events.highlights.map((event, index) => (
          <div key={index} className="flex gap-3">
            <span className="text-xl">
              {EVENT_ICONS[event.type] || EVENT_ICONS.other}
            </span>
            <div>
              <div className="font-medium">
                {event.name}
                <span className="text-foreground/60 text-sm ml-2">
                  ({event.dates})
                </span>
              </div>
              <div className="text-sm text-foreground/60">
                {event.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-card-border">
        <div className="flex gap-4 text-sm">
          <span>
            🌑 New Moon: {events.moonPhase.newMoon}
            {isNearNewMoon && (
              <span className="text-success ml-1">(ideal darkness!)</span>
            )}
          </span>
          <span>🌕 Full Moon: {events.moonPhase.fullMoon}</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add SkyEvents component"
```

---

## Task 15: Build Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Implement main page**

Replace contents of `src/app/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import SearchForm from "@/components/SearchForm";
import SpotCard from "@/components/SpotCard";
import SkyEvents from "@/components/SkyEvents";
import { SpotsResponse, WeatherForecast, MonthlyEvents } from "@/lib/types";
import monthlyEventsData from "@/data/monthly-events.json";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [spotsData, setSpotsData] = useState<SpotsResponse | null>(null);
  const [weatherData, setWeatherData] = useState<
    Record<number, WeatherForecast[]>
  >({});
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setSpotsData(null);
    setWeatherData({});

    try {
      const response = await fetch(`/api/spots?lat=${lat}&lng=${lng}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to find spots");
        return;
      }

      setSpotsData(data);
    } catch {
      setError("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch weather for each spot after spots are loaded
  useEffect(() => {
    if (!spotsData?.spots.length) return;

    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      const weather: Record<number, WeatherForecast[]> = {};

      await Promise.all(
        spotsData.spots.map(async (spot) => {
          try {
            const response = await fetch(
              `/api/weather?lat=${spot.lat}&lng=${spot.lng}`
            );
            const data = await response.json();
            if (data.forecasts) {
              weather[spot.radius] = data.forecasts;
            }
          } catch {
            // Silently fail for individual weather requests
          }
        })
      );

      setWeatherData(weather);
      setIsLoadingWeather(false);
    };

    fetchWeather();
  }, [spotsData]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Stargazer</h1>
          <p className="text-foreground/60">
            Find the best stargazing spots near you
          </p>
        </header>

        <SearchForm onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="mt-6 p-4 bg-error/20 border border-error rounded-lg text-center">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-8 text-center text-foreground/60">
            Searching for dark skies...
          </div>
        )}

        {spotsData && (
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">
              Results for: {spotsData.origin.displayName}
            </h2>

            <div className="space-y-4">
              {spotsData.spots.map((spot) => (
                <SpotCard
                  key={spot.radius}
                  spot={spot}
                  weather={weatherData[spot.radius] || null}
                  isLoadingWeather={isLoadingWeather}
                />
              ))}

              {spotsData.spots.length === 0 && (
                <div className="text-center text-foreground/60 py-8">
                  No dark spots found within 200km. Try a different location.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <SkyEvents events={monthlyEventsData as MonthlyEvents} />
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement main page with search and results"
```

---

## Task 16: Update Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update layout with metadata**

Replace contents of `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stargazer - Find Dark Sky Spots",
  description:
    "Find the best stargazing spots near you based on light pollution data and weather forecasts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add .
git commit -m "feat: update layout with metadata"
```

---

## Task 17: Final Verification

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Run dev server and test manually**

Run:
```bash
npm run dev
```

Test:
1. Open http://localhost:3000
2. Try "Use my location" button
3. Try searching for "Berlin"
4. Verify spot cards appear with weather
5. Verify sky events display

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete Stargazer MVP implementation"
```

---

## Summary

**Total Tasks:** 17

**What was built:**
- Next.js 14 project with TypeScript and Tailwind
- Dark theme styling
- Light pollution query library with sample Europe data
- Geocoding via Nominatim (free, no API key)
- Weather via Open-Meteo (free, no API key)
- Three API routes: /api/geocode, /api/spots, /api/weather
- Three UI components: SearchForm, SpotCard, SkyEvents
- Main page wiring everything together

**Next steps after MVP:**
1. Source real light pollution data (VIIRS) for Europe
2. Process and convert to JSON format
3. Deploy to Vercel
4. Add more monthly events data
