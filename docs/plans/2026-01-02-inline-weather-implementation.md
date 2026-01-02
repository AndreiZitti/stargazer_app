# Inline Weather Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace modal-based weather for saved places with inline expandable cards showing night hours with cloud coverage %.

**Architecture:** Add autoLoadWeather flag to SavedPlace, create weather cache in UserContext with background fetch on load, update UserSidebar with expandable cards and toggle switches.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing CloudForecast types and API

---

## Task 1: Add autoLoadWeather to SavedPlace Type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add the new field to SavedPlace interface**

Find the SavedPlace interface and add the new optional field:

```typescript
export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bortle?: number;
  label?: string;
  savedAt: string; // ISO date
  notes?: string;
  autoLoadWeather?: boolean; // NEW
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add autoLoadWeather flag to SavedPlace type"
```

---

## Task 2: Add Weather Cache to UserContext

**Files:**
- Modify: `src/contexts/UserContext.tsx`

**Step 1: Add CloudForecast import and cache types**

Add at top of file:
```typescript
import { UserProfile, SavedPlace, CloudForecast } from "@/lib/types";
```

**Step 2: Add cache state and context type**

Add to UserContextType interface:
```typescript
// Weather cache (in-memory only)
weatherCache: Map<string, { forecast: CloudForecast; fetchedAt: number }>;
getWeather: (lat: number, lng: number) => { forecast: CloudForecast; fetchedAt: number } | undefined;
fetchWeather: (lat: number, lng: number) => Promise<CloudForecast | null>;
```

**Step 3: Add cache state inside UserProvider**

After the existing useState declarations:
```typescript
const [weatherCache, setWeatherCache] = useState<Map<string, { forecast: CloudForecast; fetchedAt: number }>>(new Map());

const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const getCacheKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const getWeather = useCallback((lat: number, lng: number) => {
  const key = getCacheKey(lat, lng);
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
    return cached;
  }
  return undefined;
}, [weatherCache]);

const fetchWeather = useCallback(async (lat: number, lng: number): Promise<CloudForecast | null> => {
  const key = getCacheKey(lat, lng);
  try {
    const res = await fetch(`/api/cloud-forecast?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const forecast: CloudForecast = await res.json();
    setWeatherCache(prev => {
      const next = new Map(prev);
      next.set(key, { forecast, fetchedAt: Date.now() });
      return next;
    });
    return forecast;
  } catch {
    return null;
  }
}, []);
```

**Step 4: Add to provider value**

Add to the value object:
```typescript
weatherCache,
getWeather,
fetchWeather,
```

**Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/contexts/UserContext.tsx
git commit -m "feat: add weather cache to UserContext"
```

---

## Task 3: Add Background Weather Fetch on Load

**Files:**
- Modify: `src/contexts/UserContext.tsx`

**Step 1: Add useEffect for background fetch**

Add after the existing useEffects (after the auth effect):
```typescript
// Background fetch weather for auto-load places
useEffect(() => {
  if (placesLoading || authLoading) return;

  // Get places with autoLoadWeather enabled, sorted by most recent
  const autoLoadPlaces = savedPlaces
    .filter(p => p.autoLoadWeather)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 5);

  if (autoLoadPlaces.length === 0) return;

  // Defer to avoid blocking initial render
  const timeoutId = setTimeout(() => {
    Promise.all(
      autoLoadPlaces.map(place => fetchWeather(place.lat, place.lng))
    );
  }, 100);

  return () => clearTimeout(timeoutId);
}, [savedPlaces, placesLoading, authLoading, fetchWeather]);
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/contexts/UserContext.tsx
git commit -m "feat: add background weather fetch for auto-load places"
```

---

## Task 4: Create NightHoursGrid Component

**Files:**
- Create: `src/components/NightHoursGrid.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { CloudForecast, CloudHour } from "@/lib/types";

interface NightHoursGridProps {
  forecast: CloudForecast;
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(":00", "");
}

function groupNightHoursByDate(hours: CloudHour[]): { label: string; hours: CloudHour[] }[] {
  const nightHours = hours.filter(h => h.isNight);
  if (nightHours.length === 0) return [];

  const groups: { label: string; hours: CloudHour[] }[] = [];
  let currentDate = "";
  let currentGroup: CloudHour[] = [];

  nightHours.forEach((hour, idx) => {
    const date = new Date(hour.time);
    const hourNum = date.getHours();

    // Determine which "night" this belongs to
    // Hours 18-23 = "Tonight" or that day's evening
    // Hours 0-6 = continuation of previous night
    let nightLabel: string;
    if (hourNum >= 18) {
      nightLabel = idx === 0 ? "Tonight" : "Tomorrow Night";
    } else {
      nightLabel = currentDate || "Tonight";
    }

    if (nightLabel !== currentDate && currentGroup.length > 0) {
      groups.push({ label: currentDate, hours: currentGroup });
      currentGroup = [];
    }
    currentDate = nightLabel;
    currentGroup.push(hour);
  });

  if (currentGroup.length > 0) {
    groups.push({ label: currentDate, hours: currentGroup });
  }

  // Simplify: just split into "Tonight" and "Tomorrow Night"
  const tonight: CloudHour[] = [];
  const tomorrow: CloudHour[] = [];
  const now = new Date();
  const todayDate = now.toDateString();

  nightHours.forEach(hour => {
    const hourDate = new Date(hour.time);
    const hourDateStr = hourDate.toDateString();
    const hourNum = hourDate.getHours();

    // If same calendar day or early morning of next day (continuation)
    if (hourDateStr === todayDate || (hourNum < 6 && new Date(hourDate.getTime() - 6 * 60 * 60 * 1000).toDateString() === todayDate)) {
      tonight.push(hour);
    } else {
      tomorrow.push(hour);
    }
  });

  const result: { label: string; hours: CloudHour[] }[] = [];
  if (tonight.length > 0) result.push({ label: "Tonight", hours: tonight });
  if (tomorrow.length > 0) result.push({ label: "Tomorrow Night", hours: tomorrow });

  return result;
}

export default function NightHoursGrid({ forecast }: NightHoursGridProps) {
  const groups = groupNightHoursByDate(forecast.hours);

  if (groups.length === 0) {
    return (
      <div className="text-xs text-foreground/50 text-center py-2">
        No night hours in forecast
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, idx) => (
        <div key={idx}>
          <div className="text-xs text-foreground/50 mb-1.5">{group.label}</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {group.hours.map((hour, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-center px-1.5 py-1 bg-foreground/5 rounded"
                style={{ minWidth: "40px" }}
              >
                <div className="text-[10px] text-foreground/40">{formatHour(hour.time)}</div>
                <div className="text-xs font-medium">{hour.cloudTotal}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/NightHoursGrid.tsx
git commit -m "feat: add NightHoursGrid component for inline weather"
```

---

## Task 5: Update UserSidebar with Expandable Cards

**Files:**
- Modify: `src/components/UserSidebar.tsx`

**Step 1: Update imports**

Replace CloudForecastModal import with NightHoursGrid:
```typescript
import NightHoursGrid from "./NightHoursGrid";
```

Add CloudForecast to types import:
```typescript
import { SavedPlace, CloudForecast } from "@/lib/types";
```

**Step 2: Update useUser destructuring**

Add the new weather methods:
```typescript
const { user, isAuthenticated, signOut, profile, savedPlaces, isLoading, updateProfile, removeSavedPlace, updateSavedPlace, getWeather, fetchWeather } = useUser();
```

**Step 3: Replace cloudForecast state with expansion state**

Remove:
```typescript
const [cloudForecast, setCloudForecast] = useState<{...} | null>(null);
```

Add:
```typescript
const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
const [loadingWeather, setLoadingWeather] = useState<Set<string>>(new Set());
```

**Step 4: Add handler for toggle and expand**

```typescript
const handleToggleAutoLoad = (e: React.MouseEvent, place: SavedPlace) => {
  e.stopPropagation();
  updateSavedPlace(place.id, { autoLoadWeather: !place.autoLoadWeather });
};

const handleExpandPlace = async (place: SavedPlace) => {
  if (expandedPlaceId === place.id) {
    setExpandedPlaceId(null);
    return;
  }

  setExpandedPlaceId(place.id);

  // Fetch weather if not cached
  const cached = getWeather(place.lat, place.lng);
  if (!cached) {
    setLoadingWeather(prev => new Set(prev).add(place.id));
    await fetchWeather(place.lat, place.lng);
    setLoadingWeather(prev => {
      const next = new Set(prev);
      next.delete(place.id);
      return next;
    });
  }
};
```

**Step 5: Update the saved places list render**

Replace the entire savedPlaces.map block with the new expandable card structure:

```typescript
{savedPlaces.map((place) => {
  const isExpanded = expandedPlaceId === place.id;
  const cached = getWeather(place.lat, place.lng);
  const isLoadingThis = loadingWeather.has(place.id);

  return (
    <div
      key={place.id}
      className="rounded-lg border border-card-border overflow-hidden"
    >
      {/* Card header - clickable to expand */}
      <button
        onClick={() => handleExpandPlace(place)}
        className="w-full text-left p-3 hover:bg-foreground/5 transition-colors group"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{place.name}</div>
            <div className="text-xs text-foreground/50 mt-0.5">
              {place.label && <span className="mr-2">{place.label} Sky</span>}
              {place.bortle && <span>Bortle {place.bortle}</span>}
            </div>
            <div className="text-xs text-foreground/40 mt-1">
              Saved {new Date(place.savedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-load toggle */}
            <button
              onClick={(e) => handleToggleAutoLoad(e, place)}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                place.autoLoadWeather ? "bg-accent" : "bg-foreground/20"
              }`}
              title={place.autoLoadWeather ? "Disable auto-load weather" : "Enable auto-load weather"}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  place.autoLoadWeather ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
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
            {/* Expand indicator */}
            <svg
              className={`w-4 h-4 text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded weather section */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-card-border bg-foreground/[0.02]">
          <div className="pt-3">
            {isLoadingThis ? (
              <div className="flex items-center justify-center py-4">
                <svg className="w-5 h-5 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : cached ? (
              <NightHoursGrid forecast={cached.forecast} />
            ) : (
              <div className="text-xs text-foreground/50 text-center py-2">
                {place.autoLoadWeather ? "Loading..." : "Enable auto-load or tap to fetch weather"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
})}
```

**Step 6: Remove the CloudForecastModal at the bottom**

Delete these lines:
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

**Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/components/UserSidebar.tsx
git commit -m "feat: update UserSidebar with expandable weather cards"
```

---

## Task 6: Test and Build

**Step 1: Run build**

```bash
npm run build
```

Expected: Build completes successfully

**Step 2: Manual testing**

Run: `npm run dev`

Test:
1. Open sidebar, see saved places
2. Toggle auto-load on a place - toggle should animate
3. Refresh page - weather should auto-load for toggled places
4. Click a place to expand - see night hours grid
5. Click again to collapse
6. Places without auto-load show "Enable auto-load or tap to fetch"

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any build issues"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add autoLoadWeather to SavedPlace | `src/lib/types.ts` |
| 2 | Add weather cache to UserContext | `src/contexts/UserContext.tsx` |
| 3 | Add background fetch on load | `src/contexts/UserContext.tsx` |
| 4 | Create NightHoursGrid component | `src/components/NightHoursGrid.tsx` |
| 5 | Update UserSidebar with expandable cards | `src/components/UserSidebar.tsx` |
| 6 | Test and build | Full integration test |
