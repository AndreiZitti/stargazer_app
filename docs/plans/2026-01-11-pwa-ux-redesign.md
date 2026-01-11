# PWA Conversion & UX Redesign

**Date:** 2026-01-11
**Status:** Approved

## Overview

Convert Stargazer to a Progressive Web App with feature detection for phone-specific capabilities, and consolidate the fragmented UX around a unified bottom sheet pattern.

## Goals

1. Make app installable as PWA with offline Sky Lab support
2. Hide phone-only features (compass/AR) on desktop browsers
3. Consolidate scattered location interactions into unified bottom sheet
4. Improve map marker performance with clustering and memoization
5. Simplify navigation flows and remove duplicate UIs

---

## 1. PWA Foundation

### Manifest (`public/manifest.json`)
```json
{
  "name": "Stargazer",
  "short_name": "Stargazer",
  "description": "Find the best stargazing spots near you",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#1e3a5f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker Strategy
- **Sky Lab assets**: Cache-first (WASM, JS, CSS, SVGs) - fully offline capable
- **Main app**: Network-first with offline fallback page
- **API calls**: Network-only (weather, geocoding require fresh data)
- **No map tile caching**: Too large, stale quickly

### Feature Detection
```typescript
// src/lib/device-capabilities.ts
export const hasDeviceOrientation = () =>
  typeof DeviceOrientationEvent !== 'undefined' &&
  (typeof DeviceOrientationEvent.requestPermission === 'function' ||
   'ondeviceorientation' in window);

export const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
```

- Hide compass button in Sky Lab when `hasDeviceOrientation()` returns false
- Show "Desktop mode" indicator in Sky Lab settings (informational)

---

## 2. Unified Bottom Sheet

### New Component: `src/components/LocationSheet.tsx`

**Triggers (replaces all popups):**
- Tap any map marker (saved, dark sky, search result)
- Tap search location pin
- Right-click/long-press map
- Click item in SavedPlacesWidget

**Layout (partial overlay, ~40% viewport height):**
```
┌─────────────────────────────────┐
│  ─────  (drag handle)           │
│  ★ Location Name           [♡]  │  ← Name + save/unsave toggle
│  Bortle 3 · Excellent skies     │  ← Sky quality badge
│                                 │
│  ☁ 12% clouds · Clear tonight   │  ← Weather summary (auto-fetched)
│  [View Forecast]  [Find Spots]  │  ← Primary action buttons
│                                 │
│  48.2km away · Saved 3 days ago │  ← Distance + meta info
└─────────────────────────────────┘
```

**Swipe Behavior:**
- Swipe down → collapse to pill (name only, 60px height)
- Swipe up → expand full (adds notes, inline forecast, edit controls)
- Tap outside sheet → dismiss entirely
- Drag handle for precise control

**Expanded State (full height ~80%):**
- Editable name field (for saved places)
- Notes textarea
- 24h forecast preview (inline, not modal)
- Delete button (saved places only)
- "Open in Sky Lab" button

**State Management:**
```typescript
interface LocationSheetState {
  isOpen: boolean;
  location: {
    lat: number;
    lng: number;
    name?: string;
    type: 'saved' | 'search' | 'darksky' | 'context';
    savedPlaceId?: string;
  } | null;
  expandedState: 'pill' | 'partial' | 'full';
}
```

---

## 3. Marker Performance & Clustering

### Dependencies
```bash
npm install react-leaflet-cluster
```

### Clustering Implementation
- Cluster Dark Sky Places (~300 markers) at zoom < 8
- Individual markers visible at zoom >= 8
- Cluster badge shows count + color of best sky quality in group
- Click cluster → zoom to expand

### Icon Memoization
```typescript
// src/lib/map-icons.ts
const iconCache = new Map<string, L.DivIcon>();

export const getMarkerIcon = (type: MarkerType, quality: SkyQuality): L.DivIcon => {
  const key = `${type}-${quality}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, createDivIcon(type, quality));
  }
  return iconCache.get(key)!;
};
```

### CSS Transitions
```css
.leaflet-marker-icon {
  transition: transform 0.15s ease-out, opacity 0.15s ease-out;
}

.leaflet-marker-icon.selected {
  transform: scale(1.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(100, 149, 237, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(100, 149, 237, 0); }
}
```

### Marker Deduplication
Same coordinates with multiple types → show highest priority:
1. Saved Place (user's data, most important)
2. Search Result (current session context)
3. Dark Sky Place (background reference)
4. Context Spot (temporary)

Tooltip indicates overlap: "Also: IDA Dark Sky Reserve"

---

## 4. SavedPlacesWidget Simplification

### Before → After

| Feature | Before | After |
|---------|--------|-------|
| Inline name edit | In widget | In sheet (expanded) |
| Forecast access | Map popup only | Sheet button |
| Delete place | Widget + popup | Sheet only |
| Weather display | Cloud % badge | Cloud % → tap for sheet |
| View all modal | Separate modal | Scrollable in-widget |

### Simplified Widget Layout
```
┌─────────────────────────────────┐
│  Saved Places              [↻]  │  ← Pull/tap to refresh weather
├─────────────────────────────────┤
│  ★ Favorite Spot     ☁ 12%     │  ← Tap → opens sheet
│  ★ Mountain View     ☁ 8%      │
│  ★ Lake Retreat      ☁ 45%     │
│  ──────────────────────────────│
│  + 4 more places               │  ← Scroll to see all
└─────────────────────────────────┘
```

---

## 5. Components to Remove/Modify

### Remove
- `src/components/MapContextMenu.tsx` - unused, right-click → sheet
- Leaflet Popup components in LightPollutionMap - all → sheet
- SavedPlacesWidget "View All" modal - inline scrolling instead

### Modify
- `LightPollutionMap.tsx` - remove popup logic, add sheet triggers
- `MapSearchBar.tsx` - search result → opens sheet (not popup)
- `CloudForecastModal.tsx` - keep for full forecast, triggered from sheet
- `page.tsx` - add LocationSheet state, remove popup states

---

## 6. Consolidated User Flows

### View Location Details
```
Before: Tap marker → Leaflet popup → limited info
After:  Tap marker → Bottom sheet → full info + actions
```

### Save a Location
```
Before: Tap marker → popup → "Save" button → toast confirmation
After:  Tap marker → sheet → heart icon toggle → instant feedback
```

### Get Weather Forecast
```
Before: Tap marker → popup → "Forecast" → modal
        OR see % in widget → tap marker on map → popup → "Forecast"
After:  Tap anything → sheet → "View Forecast" → modal (or inline if expanded)
```

### Find Dark Spots
```
Before: 3 entry points (location popup, right-click, search result)
After:  Tap any location → sheet → "Find Spots" → SpotSearchModal
```

### Edit Saved Place
```
Before: Open widget → click edit icon → inline edit
After:  Tap saved marker → sheet → swipe up → edit name/notes
```

---

## 7. File Changes Summary

### New Files
- `public/manifest.json`
- `public/sw.js` (service worker)
- `public/icons/icon-192.png`, `icon-512.png`
- `src/components/LocationSheet.tsx`
- `src/lib/device-capabilities.ts`
- `src/lib/map-icons.ts`

### Modified Files
- `src/app/layout.tsx` - add manifest link, theme-color meta
- `src/app/page.tsx` - add LocationSheet, remove popup states
- `src/components/LightPollutionMap.tsx` - clustering, memoization, sheet triggers
- `src/components/SavedPlacesWidget.tsx` - simplify, remove modal
- `public/sky-lab/index.html` - feature detection for compass button

### Removed Files
- `src/components/MapContextMenu.tsx`

---

## 8. Implementation Order

1. **PWA basics** - manifest, icons, service worker registration
2. **Feature detection** - device capabilities module, compass hiding
3. **LocationSheet component** - new unified bottom sheet
4. **Integrate sheet** - wire up all marker clicks to sheet
5. **Remove popups** - clean up Leaflet popup code
6. **Marker clustering** - add react-leaflet-cluster for Dark Sky Places
7. **Icon memoization** - performance optimization
8. **Widget simplification** - streamline SavedPlacesWidget
9. **Polish** - transitions, animations, edge cases
