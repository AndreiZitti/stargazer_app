# Cloud Coverage Forecast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 48-hour cloud coverage forecasts to saved places and spot info popups, helping stargazers plan optimal viewing times.

**Architecture:** Create Open-Meteo API integration for cloud data, add forecast modal component, integrate buttons into UserSidebar (saved places) and LightPollutionMap (spot popups).

**Tech Stack:** Next.js 16, React 19, Open-Meteo API (free, no key required), TypeScript

---

## Task 1: Add Cloud Coverage Types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add cloud forecast types at end of file**

```typescript
// Cloud coverage forecast types
export type CloudRating = "excellent" | "great" | "good" | "poor" | "bad";

export interface CloudHour {
  time: string;           // ISO timestamp
  isNight: boolean;
  cloudTotal: number;     // 0-100%
  cloudLow: number;       // 0-100%
  cloudMid: number;       // 0-100%
  cloudHigh: number;      // 0-100%
  precipitation: number;  // probability %
  rating: CloudRating;
}

export interface CloudForecast {
  location: {
    lat: number;
    lng: number;
    timezone: string;
  };
  generatedAt: string;
  hours: CloudHour[];
  bestWindows: {
    time: string;
    cloudTotal: number;
    rating: CloudRating;
  }[];
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add cloud coverage forecast types"
```

---

## Task 2: Create Cloud Forecast Library

**Files:**
- Create: `src/lib/cloud-forecast.ts`

**Step 1: Create the cloud forecast module**

```typescript
// src/lib/cloud-forecast.ts
import { CloudForecast, CloudHour, CloudRating } from "./types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    precipitation_probability: number[];
    is_day: number[];
  };
}

function rateCloudConditions(cloudTotal: number, precipitation: number): CloudRating {
  // Bad if high precipitation chance
  if (precipitation > 50) return "bad";

  // Rate by cloud coverage
  if (cloudTotal <= 10) return "excellent";
  if (cloudTotal <= 25) return "great";
  if (cloudTotal <= 40) return "good";
  if (cloudTotal <= 70) return "poor";
  return "bad";
}

function buildOpenMeteoUrl(lat: number, lng: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "precipitation_probability",
      "is_day",
    ].join(","),
    timezone: timezone,
    forecast_days: "2",
  });

  return `${OPEN_METEO_URL}?${params.toString()}`;
}

export async function getCloudForecast(
  lat: number,
  lng: number,
  timezone: string = "auto"
): Promise<CloudForecast> {
  const url = buildOpenMeteoUrl(lat, lng, timezone);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  // Transform to our format
  const hours: CloudHour[] = data.hourly.time.map((time, i) => {
    const cloudTotal = data.hourly.cloud_cover[i];
    const precipitation = data.hourly.precipitation_probability[i];

    return {
      time,
      isNight: data.hourly.is_day[i] === 0,
      cloudTotal,
      cloudLow: data.hourly.cloud_cover_low[i],
      cloudMid: data.hourly.cloud_cover_mid[i],
      cloudHigh: data.hourly.cloud_cover_high[i],
      precipitation,
      rating: rateCloudConditions(cloudTotal, precipitation),
    };
  });

  // Extract best windows (night hours with good+ rating)
  const bestWindows = hours
    .filter((h) => h.isNight && ["excellent", "great", "good"].includes(h.rating))
    .sort((a, b) => {
      const ratingOrder: Record<CloudRating, number> = {
        excellent: 0,
        great: 1,
        good: 2,
        poor: 3,
        bad: 4,
      };
      return ratingOrder[a.rating] - ratingOrder[b.rating];
    })
    .slice(0, 5)
    .map((h) => ({
      time: h.time,
      cloudTotal: h.cloudTotal,
      rating: h.rating,
    }));

  return {
    location: {
      lat: data.latitude,
      lng: data.longitude,
      timezone: data.timezone,
    },
    generatedAt: new Date().toISOString(),
    hours,
    bestWindows,
  };
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/cloud-forecast.ts
git commit -m "feat: add Open-Meteo cloud forecast library"
```

---

## Task 3: Create Cloud Forecast API Route

**Files:**
- Create: `src/app/api/cloud-forecast/route.ts`

**Step 1: Create the API endpoint**

```typescript
// src/app/api/cloud-forecast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudForecast } from "@/lib/cloud-forecast";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const timezone = searchParams.get("timezone") || "auto";

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

  try {
    const forecast = await getCloudForecast(lat, lng, timezone);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Cloud forecast error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cloud forecast" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/cloud-forecast/route.ts
git commit -m "feat: add cloud forecast API endpoint"
```

---

## Task 4: Create Cloud Forecast Modal Component

**Files:**
- Create: `src/components/CloudForecastModal.tsx`

**Step 1: Create the modal component**

```typescript
// src/components/CloudForecastModal.tsx
"use client";

import { useState, useEffect } from "react";
import { CloudForecast, CloudRating } from "@/lib/types";

interface CloudForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  placeName?: string;
}

const RATING_COLORS: Record<CloudRating, string> = {
  excellent: "#22c55e",
  great: "#84cc16",
  good: "#eab308",
  poor: "#f97316",
  bad: "#ef4444",
};

const RATING_LABELS: Record<CloudRating, string> = {
  excellent: "Excellent",
  great: "Great",
  good: "Good",
  poor: "Poor",
  bad: "Bad",
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function CloudForecastModal({
  isOpen,
  onClose,
  lat,
  lng,
  placeName,
}: CloudForecastModalProps) {
  const [forecast, setForecast] = useState<CloudForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lat && lng) {
      setIsLoading(true);
      setError(null);

      fetch(`/api/cloud-forecast?lat=${lat}&lng=${lng}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => setForecast(data))
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  // Group hours by date
  const hoursByDate: Record<string, typeof forecast.hours> = {};
  if (forecast) {
    forecast.hours.forEach((hour) => {
      const dateKey = formatDate(hour.time);
      if (!hoursByDate[dateKey]) {
        hoursByDate[dateKey] = [];
      }
      hoursByDate[dateKey].push(hour);
    });
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">48h Cloud Forecast</h2>
            {placeName && (
              <p className="text-sm text-foreground/60">{placeName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-error">
              <p>Failed to load forecast</p>
              <p className="text-sm text-foreground/60 mt-1">{error}</p>
            </div>
          )}

          {forecast && !isLoading && (
            <>
              {/* Best Windows Summary */}
              {forecast.bestWindows.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground/70 mb-3">Best Stargazing Windows</h3>
                  <div className="flex flex-wrap gap-2">
                    {forecast.bestWindows.map((window, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg border border-card-border"
                        style={{ borderLeftColor: RATING_COLORS[window.rating], borderLeftWidth: 3 }}
                      >
                        <div className="text-sm font-medium">
                          {formatDate(window.time)} {formatTime(window.time)}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {window.cloudTotal}% clouds - {RATING_LABELS[window.rating]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Forecast */}
              {Object.entries(hoursByDate).map(([date, hours]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-sm font-medium text-foreground/70 mb-3">{date}</h3>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
                    {hours.map((hour, i) => (
                      <div
                        key={i}
                        className={`relative p-1.5 rounded text-center text-xs ${
                          hour.isNight ? "bg-indigo-950/50" : "bg-foreground/5"
                        }`}
                        title={`${formatTime(hour.time)}: ${hour.cloudTotal}% clouds, ${hour.precipitation}% precip`}
                      >
                        <div className="text-[10px] text-foreground/50">
                          {formatTime(hour.time).replace(/:00/, "")}
                        </div>
                        <div
                          className="w-4 h-4 mx-auto rounded-full mt-1"
                          style={{ backgroundColor: RATING_COLORS[hour.rating] }}
                        />
                        <div className="text-[10px] mt-1">{hour.cloudTotal}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-card-border">
                {(["excellent", "great", "good", "poor", "bad"] as CloudRating[]).map((rating) => (
                  <div key={rating} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RATING_COLORS[rating] }}
                    />
                    <span className="text-xs text-foreground/60">{RATING_LABELS[rating]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
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
git add src/components/CloudForecastModal.tsx
git commit -m "feat: add cloud forecast modal component"
```

---

## Task 5: Add Cloud Button to UserSidebar

**Files:**
- Modify: `src/components/UserSidebar.tsx`

**Step 1: Import modal and add state**

Add at top of file:
```typescript
import CloudForecastModal from "./CloudForecastModal";
```

Add state inside component:
```typescript
const [cloudForecast, setCloudForecast] = useState<{
  lat: number;
  lng: number;
  name: string;
} | null>(null);
```

**Step 2: Add cloud button to each saved place**

Find the saved places list (around line 174-202). Add a cloud button next to each place.

Replace the place button content to include:
```typescript
{savedPlaces.map((place) => (
  <div
    key={place.id}
    className="w-full text-left p-3 rounded-lg border border-card-border hover:bg-foreground/5 transition-colors group"
  >
    <div className="flex items-start justify-between">
      <button
        onClick={() => onPlaceClick?.(place)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="font-medium text-sm truncate">{place.name}</div>
        <div className="text-xs text-foreground/50 mt-0.5">
          {place.label && <span className="mr-2">{place.label} Sky</span>}
          {place.bortle && <span>Bortle {place.bortle}</span>}
        </div>
        <div className="text-xs text-foreground/40 mt-1">
          Saved {new Date(place.savedAt).toLocaleDateString()}
        </div>
      </button>
      <div className="flex items-center gap-1">
        {/* Cloud forecast button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCloudForecast({
              lat: place.lat,
              lng: place.lng,
              name: place.name,
            });
          }}
          className="p-1.5 text-foreground/30 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
          title="Cloud forecast"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </button>
        {/* Delete button */}
        <button
          onClick={(e) => handleDeletePlace(e, place.id)}
          className="p-1 text-foreground/30 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
))}
```

**Step 3: Add modal to render**

Add before the closing `</>` of the component:
```typescript
{/* Cloud Forecast Modal */}
{cloudForecast && (
  <CloudForecastModal
    isOpen={!!cloudForecast}
    onClose={() => setCloudForecast(null)}
    lat={cloudForecast.lat}
    lng={cloudForecast.lng}
    placeName={cloudForecast.name}
  />
)}
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/UserSidebar.tsx
git commit -m "feat: add cloud forecast button to saved places"
```

---

## Task 6: Add Cloud Button to Spot Info Popup

**Files:**
- Modify: `src/components/LightPollutionMap.tsx`

**Step 1: Import modal and add state**

Add import at top:
```typescript
import CloudForecastModal from "./CloudForecastModal";
```

Add state inside component (after existing state):
```typescript
const [cloudForecast, setCloudForecast] = useState<{
  lat: number;
  lng: number;
  name?: string;
} | null>(null);
```

**Step 2: Add cloud button to context spot popup**

Find the context spot popup section (around lines 474-519) where action buttons are.

Add a cloud button in the action buttons div, between the Sky Guide link and the save button:
```typescript
<button
  onClick={() => setCloudForecast({
    lat: contextSpot.lat,
    lng: contextSpot.lng,
    name: contextSpot.label ? `${contextSpot.label} Sky Spot` : undefined,
  })}
  style={{
    color: '#6366f1',
    fontSize: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}
>
  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
  Forecast
</button>
```

**Step 3: Also add to search result popups**

Find the search result marker popups (around lines 842-880) and add the same cloud button.

**Step 4: Add modal to render**

Add after the MapContainer closing tag, before the context menu:
```typescript
{/* Cloud Forecast Modal */}
{cloudForecast && (
  <CloudForecastModal
    isOpen={!!cloudForecast}
    onClose={() => setCloudForecast(null)}
    lat={cloudForecast.lat}
    lng={cloudForecast.lng}
    placeName={cloudForecast.name}
  />
)}
```

**Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/LightPollutionMap.tsx
git commit -m "feat: add cloud forecast button to spot popups"
```

---

## Task 7: Test Full Flow

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Test saved places cloud button**

1. Open sidebar (hamburger menu)
2. Hover over a saved place
3. Click the cloud icon
4. Verify modal opens with 48h forecast
5. Verify best windows are highlighted
6. Close modal

**Step 3: Test spot popup cloud button**

1. Right-click on map
2. Click "Check this spot"
3. In the popup, click "Forecast" button
4. Verify modal opens with forecast for that location

**Step 4: Test search result cloud button**

1. Right-click → Find best spots
2. Answer questions, get results
3. Click a result pin
4. Click "Forecast" in popup
5. Verify modal shows forecast

**Step 5: Run build**

```bash
npm run build
```

Expected: Build completes successfully

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any build or runtime issues"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add cloud types | `src/lib/types.ts` |
| 2 | Cloud forecast library | `src/lib/cloud-forecast.ts` |
| 3 | Cloud forecast API | `src/app/api/cloud-forecast/route.ts` |
| 4 | Cloud forecast modal | `src/components/CloudForecastModal.tsx` |
| 5 | Add to UserSidebar | `src/components/UserSidebar.tsx` |
| 6 | Add to LightPollutionMap | `src/components/LightPollutionMap.tsx` |
| 7 | Test and verify | Full integration test |

## API Reference

**Open-Meteo Endpoint:**
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lng}
  &hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,is_day
  &timezone={timezone}
  &forecast_days=2
```

**Rating Logic:**
- `precipitation > 50%` → bad
- `cloud_total <= 10%` → excellent
- `cloud_total <= 25%` → great
- `cloud_total <= 40%` → good
- `cloud_total <= 70%` → poor
- else → bad
