# Inline Weather for Saved Places - Design Document

## Overview

Replace the cloud forecast modal for saved places with inline expandable weather summaries. Users can toggle auto-load per location, and weather data loads in the background without blocking the UI.

## Requirements

1. Toggle per saved place to enable/disable auto-load weather
2. Background fetch on page load (non-blocking, first 5 places)
3. Click saved place to expand and see inline night hours grid
4. Show cloud coverage % for night hours only (no color coding)

## Data Model

### SavedPlace (modified)
```typescript
interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bortle?: number;
  label?: string;
  savedAt: string;
  notes?: string;
  autoLoadWeather?: boolean;  // NEW - defaults to false
}
```

### WeatherCache (new, in-memory only)
```typescript
// Stored in UserContext, not persisted
weatherCache: Map<string, {
  forecast: CloudForecast;
  fetchedAt: number;  // timestamp for cache invalidation (30 min TTL)
}>
```

Cache key format: `${lat.toFixed(4)},${lng.toFixed(4)}`

## Background Loading Strategy

1. After initial render, identify places with `autoLoadWeather: true`
2. Take first 5 (sorted by most recently saved)
3. Fetch in parallel using `Promise.all`
4. Store in weatherCache
5. Use `setTimeout(..., 0)` to avoid blocking initial render

When user expands a non-cached place:
- Fetch on-demand with loading spinner
- Cache the result

## UI Design

### Saved Place Card (collapsed)
```
+------------------------------------------+
| [Name of Place]                    [==o] |  <- toggle for auto-load
| Excellent Sky - Bortle 3                 |
| Saved Jan 2, 2026                        |
+------------------------------------------+
```

### Saved Place Card (expanded)
```
+------------------------------------------+
| [Name of Place]                    [==o] |
| Excellent Sky - Bortle 3                 |
| Saved Jan 2, 2026                        |
|------------------------------------------|
| Tonight                                  |
| 22:00  23:00  00:00  01:00  02:00  03:00 |
|  12%    8%    15%    22%    35%    28%  |
|                                          |
| Tomorrow Night                           |
| 22:00  23:00  00:00  01:00  02:00  03:00 |
|  45%   52%    48%    41%    38%    35%  |
+------------------------------------------+
```

### States
- **No weather data**: "Enable auto-load or tap to fetch"
- **Loading**: Small spinner
- **Error**: "Failed to load forecast"
- **Cached**: Shows grid immediately

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `autoLoadWeather?: boolean` to SavedPlace |
| `src/contexts/UserContext.tsx` | Add weatherCache, background fetch, updateSavedPlace |
| `src/components/UserSidebar.tsx` | Expandable cards, toggle, night hours grid |

## Not Changing

- `LightPollutionMap.tsx` - keeps modal for spot popups
- `CloudForecastModal.tsx` - still used by map popups
- API route and cloud forecast library - unchanged

## Cache Behavior

- TTL: 30 minutes
- Key: `lat,lng` with 4 decimal precision
- Storage: In-memory only (not persisted across page reloads)
- Invalidation: Check `fetchedAt` timestamp on access
