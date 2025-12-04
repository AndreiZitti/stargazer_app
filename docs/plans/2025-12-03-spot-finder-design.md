# Stargazing Spot Finder - Design

**Date:** 2025-12-03
**Status:** Approved

## Overview

Find the best accessible stargazing spot at 3 distance bands (10km, 50km, 150km) from a searched location. Spots are evaluated on light pollution (Bortle scale) and accessibility (OSM data).

## User Flow

1. User opens app, sees light pollution map
2. User searches for a location (or uses current location)
3. App displays 4 pins on map:
   - Search location pin
   - 3 recommended spot pins (one per radius band)
4. User clicks a spot pin to see popup with:
   - Distance from search location
   - Accessibility info (park name, parking, etc.)
   - Link to get directions

## Evaluation Criteria

### 1. Light Pollution (Bortle Scale)

Lower Bortle = darker = better for stargazing.

- Bortle 1-2: Excellent
- Bortle 3-4: Good
- Bortle 5-6: Moderate
- Bortle 7-9: Poor

### 2. Accessibility (via OpenStreetMap)

Query Overpass API for features within ~1-2km of candidate spots:

| Feature | OSM Tags | Score |
|---------|----------|-------|
| Parking | `amenity=parking`, rest areas, lay-bys | +2 |
| Parks/Nature | `leisure=park`, `boundary=national_park`, `natural=beach` | +2 |
| Viewpoints | `tourism=viewpoint` | +1 |
| Road proximity | Near any road | +1 |

Spots with no accessible features (score 0) are deprioritized or skipped.

## Algorithm

```
For each radius band (10km, 50km, 150km):
  1. Find top 5-10 darkest grid cells (lowest Bortle)
  2. For each candidate:
     - Query Overpass API for nearby accessibility features
     - Calculate accessibility score
  3. Compute combined score: darkness_weight * (9 - bortle) + accessibility_score
  4. Return candidate with best combined score
```

## Technical Architecture

```
User searches location
        |
        v
/api/spots endpoint
        |
        v
+-----------------------------------+
| 1. Get light pollution data       |
|    (existing Bortle grid)         |
+-----------------------------------+
        |
        v
+-----------------------------------+
| 2. Find top 5-10 dark candidates  |
|    per radius band (10/50/150km)  |
+-----------------------------------+
        |
        v
+-----------------------------------+
| 3. Query Overpass API for each    |
|    candidate's accessibility      |
+-----------------------------------+
        |
        v
+-----------------------------------+
| 4. Score & rank: darkness +       |
|    accessibility combined         |
+-----------------------------------+
        |
        v
+-----------------------------------+
| 5. Return best spot per radius    |
+-----------------------------------+
        |
        v
Display pins on map with popups
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/accessibility.ts` | Create | Overpass API queries, accessibility scoring |
| `src/lib/light-pollution.ts` | Modify | Return multiple candidates, not just single darkest |
| `src/app/api/spots/route.ts` | Modify | Combine darkness + accessibility scoring |
| `src/components/LightPollutionMap.tsx` | Modify | Add pins for search location and spots |

## UI Components

### Map (primary interface)

- Light pollution overlay (existing)
- Search location pin (blue/distinct)
- 3 spot pins (colored by radius band)

### Spot Popup (on pin click)

- Distance from search location
- Accessibility details (park name, parking available, etc.)
- "Get directions" link (opens Google Maps)

### Optional Sidebar

Simple list of 3 spots:
- "10km - Naturpark Bayerischer Wald"
- "50km - Sternenpark Winklmoos"
- "150km - Alpen viewpoint"

Clicking focuses that pin on map.

## Caching Strategy

OSM data doesn't change frequently. Cache Overpass results:
- Key: geographic area (rounded lat/lng)
- TTL: 24 hours or longer
- Storage: In-memory or simple file cache for MVP

## Out of Scope (Future)

- Weather integration (cloud cover, visibility)
- "What to see" (sky events, moon phase)
- Curated dark sky sites database (e.g., IDA certified places)
- User accounts / saved spots
- Driving directions within app
- Photos or reviews
