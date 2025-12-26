# Spot Rating & Search Redesign

**Date:** 2025-12-26
**Status:** Approved

## Overview

Redesign the two right-click map features:
1. **"Check this spot"** → Show a clear 10-point darkness rating
2. **"Find best spots"** → Interactive 2-question search for optimal stargazing locations

## Feature 1: Check This Spot

### User Flow
1. User right-clicks anywhere on map
2. Clicks "Check this spot"
3. Sees popup with darkness rating and accessibility info

### Rating Display
```
┌─────────────────────────────┐
│  ★ 8.2 / 10                 │
│  "Great for stargazing"     │
│                             │
│  ✓ Road access nearby       │
│    (Parking 400m away)      │
└─────────────────────────────┘
```

### Score Calculation
Linear mapping from Bortle scale:
- Bortle 1 → 10/10
- Bortle 2 → 9/10
- Bortle 3 → 8/10
- Bortle 4 → 7/10
- Bortle 5 → 6/10
- Bortle 6 → 5/10
- Bortle 7 → 4/10
- Bortle 8 → 3/10
- Bortle 9 → 1/10

### Score Labels
| Score | Label |
|-------|-------|
| 9-10 | "Exceptional - pristine dark sky" |
| 7-8 | "Great for stargazing" |
| 5-6 | "Decent - some light pollution" |
| 3-4 | "Limited - bright sky" |
| 1-2 | "Poor - urban glow" |

### Accessibility Check
Binary indicator (not part of score):
- Query Overpass API for roads within 1km
- If found: "✓ Road access nearby" + optional parking/park name
- If not found: "⚠️ Remote area - no road access"

## Feature 2: Find Best Spots

### User Flow
1. User right-clicks on map
2. Clicks "Find best spots"
3. Modal appears with 2 questions
4. User answers and clicks "Find Spots"
5. Map shows top 3 recommended spots

### Questionnaire Modal
```
┌─────────────────────────────────────────┐
│  Find Your Stargazing Spot              │
│                                         │
│  How far are you willing to travel?     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐  │
│  │15 min│ │30 min│ │1 hour│ │2+ hrs │  │
│  └──────┘ └──────┘ └──────┘ └───────┘  │
│                                         │
│  Do you have a car?                     │
│  ┌──────┐ ┌──────┐                      │
│  │ Yes  │ │  No  │                      │
│  └──────┘ └──────┘                      │
│                                         │
│            [ Find Spots ]               │
└─────────────────────────────────────────┘
```

### Search Logic
1. Convert travel time to distance:
   - 15 min → 15km
   - 30 min → 40km
   - 1 hour → 80km
   - 2+ hours → 150km

2. Sample points within radius from light pollution data

3. Filter requirements:
   - Must have road within 1km
   - If "No car": must be within 2km of a town/village

4. Rank by darkness score (highest first)

5. Return top 3 spots

### Results Display
- 3 numbered pins on map (1, 2, 3)
- Results panel showing:
  - Spot name (if identifiable) or coordinates
  - Distance from search location
  - Darkness score

## Technical: Reading Light Pollution Data

### Problem
Current implementation fakes Bortle scores. Need to read actual values from map tiles.

### Solution
Query the VIIRS light pollution tiles (already displayed on map from `djlorenz.github.io/lightpollution`).

### Implementation
1. For a lat/lng, calculate which tile contains it (z/x/y)
2. Fetch that tile image
3. Read pixel color at exact coordinate within tile
4. Map color to Bortle scale

### Color → Bortle Mapping
| Tile Color | Bortle | 10-Point Score |
|------------|--------|----------------|
| Black/Dark gray | 1-2 | 9-10 |
| Gray | 3 | 8 |
| Blue | 4 | 7 |
| Green | 5 | 6 |
| Yellow | 6 | 5 |
| Orange | 7 | 4 |
| Red | 8 | 3 |
| White/Pink | 9 | 1-2 |

### API
```typescript
// src/lib/light-pollution.ts
getBortleAtPoint(lat: number, lng: number): Promise<number>
getDarknessScore(lat: number, lng: number): Promise<number>
findDarkestSpots(center: Coordinates, radiusKm: number, count: number): Promise<Spot[]>
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/light-pollution.ts` | Create | Read tiles, get Bortle, find dark spots |
| `src/lib/accessibility.ts` | Simplify | Binary road check only |
| `src/app/api/spot-info/route.ts` | Modify | Use real Bortle, return 10-point score |
| `src/app/api/find-spots/route.ts` | Create | Search endpoint with distance/car params |
| `src/components/SpotSearchModal.tsx` | Create | 2-question questionnaire |
| `src/components/SpotRatingPopup.tsx` | Create | Display for 10-point score |
| `src/components/MapContextMenu.tsx` | Modify | Rename button, wire up modal |
| `src/app/page.tsx` | Modify | State for modal, search results |

## Out of Scope
- Weather/moon phase integration
- Experience level filtering
- Public transit routing
- Saving/favoriting spots (existing feature handles this)
