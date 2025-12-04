# Stargazer - Design Document

**Date:** 2025-12-03
**Status:** Approved

## Overview

A simple web app to find the best stargazing spots near a given location, with weather forecasts and sky event recommendations.

**Target users:** Friends (no auth, public access)

## Core Features

### 1. Location Input
- Browser geolocation ("Use my location" button)
- Address/city search as fallback
- Geocoding to convert addresses to coordinates

### 2. Dark Spot Finder
- Find darkest stargazing spot within 50km, 100km, and 200km radius
- Based on pre-processed light pollution data (Bortle scale)
- Returns approximate coordinates of darkest area in each radius

### 3. Weather Integration
- Cloud cover forecast from Open-Meteo (free, no API key)
- Show visibility score for next 3 nights
- Graceful degradation if API fails

### 4. Sky Events ("What to See Tonight")
- Hardcoded monthly JSON with highlights
- Meteor showers, visible planets, notable events
- Moon phase display (important for darkness)
- Manual updates ~monthly

## Technical Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 14 (App Router) | Familiar stack, handles frontend + API |
| Styling | Tailwind CSS, dark theme | Quick to build, fits stargazing aesthetic |
| Deployment | Vercel | Easy Next.js deployment |
| Light pollution data | Pre-processed static file | No external API dependency for core feature |
| Weather API | Open-Meteo | Free, no API key, reliable |
| Database | None | All data is static files or external APIs |
| Auth | None | Simple public access |

## Data

### Light Pollution Data
- Source: VIIRS Nighttime Lights (NASA) or lightpollutionmap.info exports
- Coverage: Europe only (initial scope)
- Resolution: ~1km per cell
- Format: JSON grid with Bortle scale values (1-9)
- Size estimate: 5-10MB

```json
{
  "resolution": 1,
  "bounds": { "minLat": 35, "maxLat": 72, "minLng": -25, "maxLng": 45 },
  "grid": [[3, 4, 5, ...], [...]]
}
```

### Bortle Scale Display
| Value | Label | Color |
|-------|-------|-------|
| 1-2 | Excellent | Dark green |
| 3-4 | Good | Green |
| 5-6 | Moderate | Yellow |
| 7-9 | Poor | Orange/Red |

### Monthly Sky Events
```json
{
  "month": "2025-12",
  "updated": "2025-12-01",
  "highlights": [
    {
      "name": "Geminid Meteor Shower",
      "dates": "Dec 13-14",
      "description": "Up to 150 meteors/hour, best after midnight",
      "type": "meteor_shower"
    }
  ],
  "moon_phase": {
    "new_moon": "Dec 1",
    "full_moon": "Dec 15"
  }
}
```

## API Design

### GET /api/geocode
Convert address to coordinates.
- Query: `?address=Berlin`
- Response: `{ lat: 52.52, lng: 13.41, display_name: "Berlin, Germany" }`

### GET /api/spots
Find dark spots for given coordinates.
- Query: `?lat=52.52&lng=13.41`
- Response:
```json
{
  "origin": { "lat": 52.52, "lng": 13.41, "name": "Berlin, Germany" },
  "spots": [
    { "radius": 50, "lat": 52.8, "lng": 13.9, "bortle": 4, "label": "Good" },
    { "radius": 100, "lat": 53.1, "lng": 14.2, "bortle": 3, "label": "Good" },
    { "radius": 200, "lat": 53.5, "lng": 14.8, "bortle": 2, "label": "Excellent" }
  ]
}
```

### GET /api/weather
Get cloud cover forecast for coordinates.
- Query: `?lat=52.8&lng=13.9`
- Response:
```json
{
  "forecasts": [
    { "date": "2025-12-03", "cloud_cover": 15, "visibility": "Excellent" },
    { "date": "2025-12-04", "cloud_cover": 45, "visibility": "Fair" },
    { "date": "2025-12-05", "cloud_cover": 80, "visibility": "Poor" }
  ]
}
```

## User Interface

Single page with dark theme:

```
┌─────────────────────────────────────────┐
│  Stargazer                              │
├─────────────────────────────────────────┤
│  [Use my location]  or                  │
│  [Enter address________________] [Search]│
├─────────────────────────────────────────┤
│  Results for: Berlin, Germany           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 50km: Bortle 4 (Good)           │   │
│  │ Tonight: 15% clouds - Excellent │   │
│  │ [Open in Maps]                   │   │
│  └─────────────────────────────────┘   │
│  (repeat for 100km, 200km)              │
│                                         │
├─────────────────────────────────────────┤
│  What to see tonight                    │
│  • Geminid Meteor Shower (Dec 13-14)    │
│  • Jupiter - bright in the east         │
│  • New moon Dec 1 (ideal darkness)      │
└─────────────────────────────────────────┘
```

## Project Structure

```
/app
  /api
    /geocode/route.ts
    /spots/route.ts
    /weather/route.ts
  page.tsx
  layout.tsx
  globals.css
/components
  SearchForm.tsx
  SpotCard.tsx
  SkyEvents.tsx
/data
  light-pollution.json
  monthly-events.json
/lib
  light-pollution.ts
  weather.ts
  geocode.ts
```

## Out of Scope (YAGNI)

- User accounts / authentication
- Saving favorite spots
- Interactive map exploration
- Detailed astronomy weather (humidity, seeing, transparency)
- Regions outside Europe
- Mobile app
- Notifications / alerts

## Open Questions

1. **Light pollution data source:** Need to research best freely available source for Europe
2. **Geocoding service:** Options include Nominatim (OSM, free) or Google Geocoding API (paid)

## Next Steps

1. Set up Next.js project with Tailwind
2. Research and download light pollution data for Europe
3. Implement geocoding API route
4. Implement spot-finding algorithm
5. Integrate Open-Meteo weather
6. Build UI components
7. Add monthly sky events
8. Deploy to Vercel
