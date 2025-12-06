# Spot Weather & Trip Planning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add weather integration to spot search, create trip planning modal, and fix popup styling.

**Architecture:** Enhance weather API to return hourly data for tonight. Add in-memory weather cache. Create TripPlanModal component with Tonight/Pick Another Day tabs. Style Leaflet popups to match dark theme.

**Tech Stack:** Next.js, React, Open-Meteo API, Leaflet, Tailwind CSS

---

## Task 1: Add Leaflet Popup Dark Theme Styling

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add Leaflet popup overrides**

Add to `src/app/globals.css`:

```css
/* Leaflet Popup Dark Theme */
.leaflet-popup-content-wrapper {
  background: #1a1a24;
  color: #e5e5e5;
  border: 1px solid #2a2a3a;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.leaflet-popup-content {
  margin: 12px 14px;
}

.leaflet-popup-tip {
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  box-shadow: none;
}

.leaflet-popup-close-button {
  color: #e5e5e5 !important;
  opacity: 0.6;
}

.leaflet-popup-close-button:hover {
  opacity: 1;
  color: #e5e5e5 !important;
}

.leaflet-container a {
  color: #6366f1;
}

.leaflet-container a:hover {
  color: #818cf8;
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add dark theme for Leaflet popups"
```

---

## Task 2: Enhance Weather API with Hourly Tonight Data

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/weather.ts`

**Step 1: Add hourly types**

Add to `src/lib/types.ts`:

```typescript
export interface HourlyCondition {
  hour: number; // 0-23
  cloudCover: number;
  icon: "clear" | "partly" | "cloudy" | "rainy";
}

export interface TonightForecast {
  hours: HourlyCondition[];
  overallScore: number;
  bestHour: number;
  summary: string; // e.g., "Mostly clear after 10pm"
}
```

**Step 2: Add getTonightForecast function**

Add to `src/lib/weather.ts`:

```typescript
import { WeatherForecast, HourlyCondition, TonightForecast } from "./types";

function getWeatherIcon(cloudCover: number, precipitation: number): "clear" | "partly" | "cloudy" | "rainy" {
  if (precipitation > 0.5) return "rainy";
  if (cloudCover <= 30) return "clear";
  if (cloudCover <= 60) return "partly";
  return "cloudy";
}

export async function getTonightForecast(
  lat: number,
  lng: number
): Promise<TonightForecast | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      hourly: "cloud_cover,precipitation",
      timezone: "auto",
      forecast_days: "2",
    });

    const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.hourly?.time) return null;

    const now = new Date();
    const currentHour = now.getHours();

    // Get hours from 20:00 (8pm) to 02:00 (2am next day)
    const hours: HourlyCondition[] = [];
    const targetHours = [20, 21, 22, 23, 0, 1, 2];

    for (const targetHour of targetHours) {
      // Find index in hourly data
      const dayOffset = targetHour < 12 ? 1 : 0; // 0-2am is next day
      const hourIndex = dayOffset * 24 + targetHour;

      if (hourIndex < data.hourly.cloud_cover.length) {
        const cloudCover = data.hourly.cloud_cover[hourIndex] ?? 50;
        const precip = data.hourly.precipitation?.[hourIndex] ?? 0;

        hours.push({
          hour: targetHour,
          cloudCover: Math.round(cloudCover),
          icon: getWeatherIcon(cloudCover, precip),
        });
      }
    }

    const avgCloud = hours.reduce((sum, h) => sum + h.cloudCover, 0) / hours.length;
    const overallScore = Math.round(100 - avgCloud);
    const bestHourData = hours.reduce((best, h) => h.cloudCover < best.cloudCover ? h : best, hours[0]);

    // Generate summary
    let summary = "Clear skies tonight";
    if (avgCloud > 70) summary = "Mostly cloudy tonight";
    else if (avgCloud > 40) summary = "Partly cloudy tonight";
    else if (bestHourData.hour !== hours[0].hour) {
      const hourStr = bestHourData.hour === 0 ? "midnight" :
                      bestHourData.hour < 12 ? `${bestHourData.hour}am` :
                      bestHourData.hour === 12 ? "noon" : `${bestHourData.hour - 12}pm`;
      summary = `Clearest around ${hourStr}`;
    }

    return {
      hours,
      overallScore,
      bestHour: bestHourData.hour,
      summary,
    };
  } catch (error) {
    console.error("Tonight forecast error:", error);
    return null;
  }
}
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/weather.ts
git commit -m "feat: add tonight hourly forecast API"
```

---

## Task 3: Create Weather Cache Hook

**Files:**
- Create: `src/hooks/useWeatherCache.ts`

**Step 1: Create cache hook**

Create `src/hooks/useWeatherCache.ts`:

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { TonightForecast } from "@/lib/types";

interface CacheEntry {
  data: TonightForecast;
  timestamp: number;
}

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export function useWeatherCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const getFromCache = useCallback((lat: number, lng: number): TonightForecast | null => {
    const key = getCacheKey(lat, lng);
    const entry = cacheRef.current.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
    if (isExpired) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const setInCache = useCallback((lat: number, lng: number, data: TonightForecast) => {
    const key = getCacheKey(lat, lng);
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<TonightForecast | null> => {
    // Check cache first
    const cached = getFromCache(lat, lng);
    if (cached) return cached;

    const key = getCacheKey(lat, lng);

    // Prevent duplicate fetches
    if (loading.has(key)) return null;

    setLoading(prev => new Set(prev).add(key));

    try {
      const response = await fetch(`/api/weather/tonight?lat=${lat}&lng=${lng}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.tonight) {
        setInCache(lat, lng, data.tonight);
        return data.tonight;
      }
      return null;
    } catch {
      return null;
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [getFromCache, setInCache, loading]);

  return { fetchWeather, getFromCache };
}
```

**Step 2: Create tonight API route**

Create `src/app/api/weather/tonight/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTonightForecast } from "@/lib/weather";

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

  const tonight = await getTonightForecast(lat, lng);

  return NextResponse.json({ tonight });
}
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/hooks/useWeatherCache.ts src/app/api/weather/tonight/route.ts
git commit -m "feat: add weather cache hook and tonight API route"
```

---

## Task 4: Create SpotWeatherBadge Component

**Files:**
- Create: `src/components/SpotWeatherBadge.tsx`

**Step 1: Create component**

Create `src/components/SpotWeatherBadge.tsx`:

```typescript
"use client";

interface SpotWeatherBadgeProps {
  score: number;
  loading?: boolean;
  compact?: boolean;
}

function getWeatherIcon(score: number): string {
  if (score >= 70) return "☀️";
  if (score >= 40) return "⛅";
  return "☁️";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-foreground/60";
}

export default function SpotWeatherBadge({ score, loading, compact }: SpotWeatherBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-foreground/40">
        <div className="w-4 h-4 rounded-full bg-foreground/10 animate-pulse" />
        {!compact && <span className="text-xs">Loading...</span>}
      </div>
    );
  }

  const icon = getWeatherIcon(score);
  const colorClass = getScoreColor(score);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <span>{icon}</span>
        <span className="text-xs font-medium">{score}%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${colorClass}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{score}% clear tonight</span>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/SpotWeatherBadge.tsx
git commit -m "feat: add SpotWeatherBadge component"
```

---

## Task 5: Create HourlyForecast Component

**Files:**
- Create: `src/components/HourlyForecast.tsx`

**Step 1: Create component**

Create `src/components/HourlyForecast.tsx`:

```typescript
"use client";

import { HourlyCondition } from "@/lib/types";

interface HourlyForecastProps {
  hours: HourlyCondition[];
  className?: string;
}

function getIcon(condition: HourlyCondition["icon"]): string {
  switch (condition) {
    case "clear": return "☀️";
    case "partly": return "⛅";
    case "cloudy": return "☁️";
    case "rainy": return "🌧️";
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function getScoreColor(cloudCover: number): string {
  const score = 100 - cloudCover;
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-foreground/50";
}

export default function HourlyForecast({ hours, className = "" }: HourlyForecastProps) {
  return (
    <div className={`flex gap-1 overflow-x-auto ${className}`}>
      {hours.map((hour) => (
        <div
          key={hour.hour}
          className="flex flex-col items-center min-w-[44px] p-2 rounded-lg bg-foreground/5"
        >
          <span className="text-xs text-foreground/60">{formatHour(hour.hour)}</span>
          <span className="text-lg my-1">{getIcon(hour.icon)}</span>
          <span className={`text-xs font-medium ${getScoreColor(hour.cloudCover)}`}>
            {100 - hour.cloudCover}%
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/HourlyForecast.tsx
git commit -m "feat: add HourlyForecast component"
```

---

## Task 6: Create TripPlanModal Component

**Files:**
- Create: `src/components/TripPlanModal.tsx`

**Step 1: Create modal component**

Create `src/components/TripPlanModal.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Coordinates, TonightForecast, WeatherForecast } from "@/lib/types";
import HourlyForecast from "./HourlyForecast";

interface TripPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    lat: number;
    lng: number;
    name?: string;
    bortle?: number;
    label?: string;
  };
  startingLocation?: Coordinates & { name?: string };
  tonight?: TonightForecast | null;
}

type Tab = "tonight" | "pickDay";

export default function TripPlanModal({
  isOpen,
  onClose,
  destination,
  startingLocation,
  tonight,
}: TripPlanModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tonight");
  const [weekForecast, setWeekForecast] = useState<WeatherForecast[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch 7-day forecast when switching to pickDay tab
  useEffect(() => {
    if (activeTab === "pickDay" && weekForecast.length === 0) {
      setLoadingWeek(true);
      fetch(`/api/weather?lat=${destination.lat}&lng=${destination.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.forecasts) setWeekForecast(data.forecasts);
        })
        .finally(() => setLoadingWeek(false));
    }
  }, [activeTab, destination.lat, destination.lng, weekForecast.length]);

  if (!isOpen) return null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}${
    startingLocation ? `&origin=${startingLocation.lat},${startingLocation.lng}` : ""
  }`;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">Plan Your Trip</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "tonight"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Tonight
          </button>
          <button
            onClick={() => setActiveTab("pickDay")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "pickDay"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Pick Another Day
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Destination info - shown in both tabs */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">
                  {destination.name || `${destination.label || "Dark"} Sky Spot`}
                </div>
                <div className="text-sm text-foreground/60">
                  {destination.bortle && `Bortle ${destination.bortle} • `}
                  {destination.lat.toFixed(4)}°, {destination.lng.toFixed(4)}°
                </div>
              </div>
            </div>
          </div>

          {activeTab === "tonight" && (
            <>
              {/* Tonight's conditions */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌙</span>
                  <span className="font-medium">Tonight's Conditions</span>
                </div>

                {tonight ? (
                  <>
                    <HourlyForecast hours={tonight.hours} className="mb-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/60">{tonight.summary}</span>
                      <span className={`font-medium ${
                        tonight.overallScore >= 70 ? "text-success" :
                        tonight.overallScore >= 40 ? "text-warning" : "text-foreground/60"
                      }`}>
                        {tonight.overallScore}% clear overall
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-foreground/50 text-sm">Loading forecast...</div>
                )}
              </div>

              {/* Starting location */}
              {startingLocation && (
                <div className="mb-6 p-4 bg-foreground/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>🚗</span>
                      <span className="text-sm">
                        From: <span className="font-medium">{startingLocation.name || "Your location"}</span>
                      </span>
                    </div>
                    <button className="text-xs text-accent hover:underline">Change</button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "pickDay" && (
            <div>
              {loadingWeek ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 animate-spin text-foreground/40" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {weekForecast.slice(0, 7).map((day, idx) => {
                    const date = new Date(day.date);
                    const isSelected = selectedDay === day.date;
                    const isBest = weekForecast.slice(0, 7).every(d => d.stargazingScore <= day.stargazingScore);

                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day.date)}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-card-border hover:border-foreground/20"
                        }`}
                      >
                        <div className="text-xs text-foreground/60">
                          {idx === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" })}
                        </div>
                        <div className="text-2xl my-1">
                          {day.stargazingScore >= 70 ? "☀️" : day.stargazingScore >= 40 ? "⛅" : "☁️"}
                        </div>
                        <div className={`text-sm font-medium ${
                          day.stargazingScore >= 70 ? "text-success" :
                          day.stargazingScore >= 40 ? "text-warning" : "text-foreground/60"
                        }`}>
                          {day.stargazingScore}%
                        </div>
                        {isBest && (
                          <div className="text-xs text-success mt-1">Best</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-card-border">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white text-center font-medium rounded-lg transition-colors"
          >
            Open in Google Maps
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-card-border rounded-lg text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/TripPlanModal.tsx
git commit -m "feat: add TripPlanModal component with Tonight and Pick Day tabs"
```

---

## Task 7: Integrate Weather into Spot Search

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add weather fetching to handleFindSpots**

Update the handleFindSpots function to fetch weather for all spots in parallel:

```typescript
// Add to imports
import { TonightForecast } from "@/lib/types";

// Add state for spot weather
const [spotWeather, setSpotWeather] = useState<Map<string, TonightForecast>>(new Map());

// Update handleFindSpots
const handleFindSpots = async () => {
  const location = searchLocation || { lat: mapCenter[0], lng: mapCenter[1] };

  if (!searchLocation) {
    setSearchLocation(location);
  }

  setIsLoadingSpots(true);
  setShowSpots(true);
  setSpotWeather(new Map());

  try {
    const response = await fetch(`/api/spots?lat=${location.lat}&lng=${location.lng}`);
    const data = await response.json();

    if (data.spots) {
      setSpots(data.spots);

      if (data.spots.length > 0) {
        setMapZoom(7);

        // Fetch weather for all spots in parallel
        const weatherPromises = data.spots.map(async (spot: ScoredSpot) => {
          const res = await fetch(`/api/weather/tonight?lat=${spot.lat}&lng=${spot.lng}`);
          const weatherData = await res.json();
          return { key: `${spot.lat}_${spot.lng}`, weather: weatherData.tonight };
        });

        const weatherResults = await Promise.all(weatherPromises);
        const weatherMap = new Map<string, TonightForecast>();
        weatherResults.forEach(({ key, weather }) => {
          if (weather) weatherMap.set(key, weather);
        });
        setSpotWeather(weatherMap);
      }
    }
  } catch (err) {
    console.error("Failed to find spots:", err);
  } finally {
    setIsLoadingSpots(false);
  }
};
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: fetch weather for all spots in parallel"
```

---

## Task 8: Add TripPlanModal to Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add modal state and component**

Add to page.tsx:

```typescript
// Add import
import TripPlanModal from "@/components/TripPlanModal";

// Add state for trip modal
const [tripModal, setTripModal] = useState<{
  isOpen: boolean;
  destination: {
    lat: number;
    lng: number;
    name?: string;
    bortle?: number;
    label?: string;
  } | null;
  tonight: TonightForecast | null;
}>({
  isOpen: false,
  destination: null,
  tonight: null,
});

// Add handler
const handlePlanTrip = (spot: ScoredSpot) => {
  const key = `${spot.lat}_${spot.lng}`;
  setTripModal({
    isOpen: true,
    destination: {
      lat: spot.lat,
      lng: spot.lng,
      name: `${spot.radius}km - ${spot.label} Sky`,
      bortle: spot.bortle,
      label: spot.label,
    },
    tonight: spotWeather.get(key) || null,
  });
};

// Add to render, before closing </main>
{tripModal.isOpen && tripModal.destination && (
  <TripPlanModal
    isOpen={tripModal.isOpen}
    onClose={() => setTripModal({ isOpen: false, destination: null, tonight: null })}
    destination={tripModal.destination}
    startingLocation={searchLocation ? { ...searchLocation, name: locationName || undefined } : undefined}
    tonight={tripModal.tonight}
  />
)}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate TripPlanModal into main page"
```

---

## Task 9: Update Results Panel with Weather Badges

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add SpotWeatherBadge to results panel**

Update the spots panel to show weather:

```typescript
// Add import
import SpotWeatherBadge from "@/components/SpotWeatherBadge";

// Update the spot button in results panel
{spots.map((spot) => {
  const weatherKey = `${spot.lat}_${spot.lng}`;
  const weather = spotWeather.get(weatherKey);

  return (
    <button
      key={spot.radius}
      onClick={() => handleSpotClick(spot)}
      className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">Within {spot.radius}km</span>
        <SpotWeatherBadge
          score={weather?.overallScore ?? 0}
          loading={!weather && isLoadingSpots}
          compact
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-foreground/60">
          {spot.accessibilityFeatures?.[0]?.name || `Bortle ${spot.bortle}`}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlanTrip(spot);
          }}
          className="text-xs text-accent hover:underline"
        >
          Plan trip
        </button>
      </div>
    </button>
  );
})}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add weather badges and plan trip button to results panel"
```

---

## Task 10: Final Integration Test

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Test flow**

1. Search for a location
2. Click "Find Dark Skies"
3. Verify weather badges appear on spots
4. Click "Plan trip" on a spot
5. Verify modal opens with hourly forecast
6. Switch to "Pick Another Day" tab
7. Verify 7-day forecast loads
8. Close modal, right-click map, verify popup styling

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete spot weather and trip planning integration"
```

---

## Summary

**Files Created:**
- `src/hooks/useWeatherCache.ts`
- `src/app/api/weather/tonight/route.ts`
- `src/components/SpotWeatherBadge.tsx`
- `src/components/HourlyForecast.tsx`
- `src/components/TripPlanModal.tsx`

**Files Modified:**
- `src/app/globals.css` (popup styling)
- `src/lib/types.ts` (hourly types)
- `src/lib/weather.ts` (tonight forecast)
- `src/app/page.tsx` (integration)

**Total Tasks:** 10
