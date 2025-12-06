# Location Interaction Redesign

**Date:** 2025-12-06
**Status:** Approved

## Problem

Users land on the map and don't know what to do. There's no guidance to search for their location or find dark spots. The current pin design is plain and doesn't draw attention.

## Solution

1. First-visit onboarding modal
2. Redesigned location pin with animations
3. Right-click context menu for map interactions
4. Save-to-plan engagement flow

---

## 1. First-Visit Onboarding Modal

**When:** First visit only (tracked via `localStorage` flag `stargazer_onboarded`).

**Layout:**
- Centered card over dimmed map
- Headline: "Where are you stargazing from?"
- Subtext: "We'll find the darkest skies near you"
- Primary button: "Use my location" (triggers geolocation)
- Search input: placeholder "Or enter a city..."
- No skip button - user must choose one

**After selection:**
- Modal fades out
- Map zooms to location (zoom 10)
- Pin drops with animation

---

## 2. Location Pin Design

**Appearance:**
- Classic teardrop shape (36px tall, 24px wide)
- Dark indigo fill (`#6366f1`) with white 2px border
- White star icon centered in bulb
- Subtle drop shadow

**Drop animation (on placement):**
- Pin drops from above (200ms ease-out)
- Brief squish/bounce on land
- Immediately starts pulse animation

**Pulse animation (attention state):**
- Soft glow ring expands from pin base
- Color: `#6366f1` at 30% opacity
- Repeats 3 times over ~3 seconds, then stops

**Idle state:**
- Static with subtle shadow
- Hover: scale 1.1x, glow returns

---

## 3. Right-Click Context Menu

**Trigger:** Right-click anywhere on map.

**Menu:**
```
┌──────────────────────────┐
│ ⭐ Check this spot       │
│ 📍 Search from here      │
└──────────────────────────┘
```

- Dark card (`bg-card`), min-width 180px
- Appears at cursor position

**"Check this spot":**
- Fetches Bortle rating + accessibility info
- Shows in expanded popup
- Includes: Save, Directions, Plan trip

**"Search from here":**
- Drops new pin at location (replaces previous)
- Pin does drop + pulse animation
- Opens popup with "Find Dark Skies" button
- Clears previous search results

**Dismiss:** Click elsewhere or Escape key.

---

## 4. Save-to-Plan Flow

After user saves a spot (clicks star icon), show a brief prompt:

- Small toast/card near the save button
- Text: "Plan a trip here?"
- Link to `/plan?lat=X&lng=Y&name=...`
- Auto-dismisses after 5 seconds or on click

---

## Out of Scope

- Mobile-specific considerations
- Multiple simultaneous pins
- Onboarding tutorial beyond first modal

## Implementation Notes

- Pin SVG can be inline or imported asset
- Animations via CSS keyframes (no animation library needed)
- Context menu position needs viewport boundary checking
- Store `stargazer_onboarded` alongside existing user data
