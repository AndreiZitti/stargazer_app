# Spot Weather & Trip Planning Redesign

**Date:** 2025-12-06
**Status:** Approved

## Overview

Enhance the spot search to include weather data, add stargazing grades to spots, and replace the trip planning page with an integrated modal.

---

## 1. Enhanced Spot Search with Weather

### Parallel Data Fetching
When user clicks "Find Dark Skies":
- Fetch spots from `/api/spots`
- Fetch weather for each spot in parallel from `/api/weather`
- Calculate stargazing score per spot

### Weather Caching
- Cache key: `weather_{lat_rounded}_{lng_rounded}` (2 decimal places)
- Cache duration: 30 minutes
- Storage: React state (in-memory, clears on refresh)
- Reuse cached data for spots in same area

### Stargazing Score Calculation
```
score = 100 - avgCloudCover
// Adjust for moon phase (future enhancement)
```

### Spot Card/Popup Display
Each spot shows:
- Weather icon: ☀️ (>70%), ⛅ (40-70%), ☁️ (<40%)
- Score: "85% clear tonight"
- Existing: Bortle rating, accessibility features

---

## 2. Trip Planning Modal

### Trigger Points
- Spot marker popup → "Plan Trip" button
- Results panel → Click any spot card

### Modal Structure

**Two tabs:** "Tonight" | "Pick Another Day"

#### Tonight Tab
```
┌─────────────────────────────────────────────────┐
│  Plan Your Trip                            [X]  │
├─────────────────────────────────────────────────┤
│  [Tonight]  [Pick Another Day]                  │
├─────────────────────────────────────────────────┤
│  📍 Destination: Dark Sky Spot (Bortle 3)       │
│     52.8°N, 13.9°E                              │
│                                                 │
│  🌙 Tonight's Conditions                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 8pm  9pm  10pm  11pm  12am  1am  2am    │   │
│  │  ☀️   ☀️    ☁️    ☀️    ☀️   ☀️   ☀️     │   │
│  │ 95%  90%  60%   85%   92%  94%  95%     │   │
│  └─────────────────────────────────────────┘   │
│  Overall: 87% clear • New moon in 3 days       │
│                                                 │
│  🚗 From: Munich (45 min drive)      [Change]  │
│                                                 │
│  [Open in Google Maps]  [Save Place]           │
└─────────────────────────────────────────────────┘
```

#### Pick Another Day Tab
```
┌─────────────────────────────────────────────────┐
│  7-Day Forecast                                 │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ Sat  │ │ Sun  │ │ Mon  │ │ Tue  │  ...     │
│  │  ☀️  │ │  ☁️  │ │  ☀️  │ │  🌧️  │          │
│  │ 92%  │ │ 45%  │ │ 88%  │ │ 15%  │          │
│  │ Best │ │      │ │      │ │      │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  Click a day to see hourly breakdown           │
└─────────────────────────────────────────────────┘
```

### Starting Location Inference
Priority order:
1. If user used "My Location" → use that
2. If user searched a city → use that
3. Otherwise → prompt to set one

Always show [Change] button to override.

---

## 3. Popup Styling Fix

Current Leaflet popups use default white styling. Update to match dark theme:

- Background: `bg-card` (#1a1a24)
- Border: `border-card-border` (#2a2a3a)
- Text: `text-foreground` (#e5e5e5)
- Buttons: accent colors
- Custom CSS to override `.leaflet-popup-content-wrapper`

---

## API Changes

### Enhanced `/api/weather`
Add hourly forecast for tonight (8pm - 2am):
```json
{
  "hourly": [
    { "hour": 20, "cloudCover": 15, "icon": "clear" },
    { "hour": 21, "cloudCover": 20, "icon": "clear" },
    ...
  ],
  "daily": [...],
  "stargazingScore": 85
}
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `TripPlanModal.tsx` | Main planning modal with two tabs |
| `HourlyForecast.tsx` | Hour-by-hour weather strip |
| `DayPicker.tsx` | 7-day forecast grid |
| `SpotWeatherBadge.tsx` | Icon + score for spot cards |

---

## Out of Scope

- Drive time calculation (would need routing API)
- Moon phase integration in score (future)
- Push notifications for good conditions
- Offline weather caching (localStorage)
