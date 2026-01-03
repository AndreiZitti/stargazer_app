# Sky Lab Minimal UI Redesign

**Date:** 2026-01-03
**Status:** Approved

## Overview

Redesign Sky Lab's UI for a cleaner, mobile-first experience with:
- Minimal bottom toolbar (4 buttons instead of 9+ controls)
- Compact object info cards (instead of full modal)
- New compass/AR mode for phone-based stargazing

## UI Layout

### Minimal Bottom Toolbar

Replace the cluttered bottom bar with 4 essential actions:

| Button | Action |
|--------|--------|
| Search | Opens search overlay |
| Constellations | Toggle constellation lines on/off |
| Compass | Toggle AR tracking mode |
| Settings | Opens slide-up settings panel |

### Settings Panel

Slide-up panel (half-screen) with grouped controls:

**VIEW**
- Atmosphere (toggle)
- Landscape (toggle)
- Deep Sky Objects (toggle)

**GRIDS**
- Azimuthal grid (toggle)
- Equatorial grid (toggle)

**TIME & LOCATION**
- Current location with edit button
- Current date/time with edit button

### Compact Object Info Card

When user taps a celestial object, show a compact card instead of full modal:

```
┌─────────────────────┐
│ Betelgeuse          │
│ Red Supergiant      │
│ Mag: 0.42           │
│ Alt: 45° Az: 120°   │
└─────────────────────┘
```

Fields shown:
- Object name
- Type/classification
- Visual magnitude
- Current altitude and azimuth

Removed from default view:
- Wikipedia summary
- RA/Dec coordinates
- Detailed metadata

## Compass/AR Mode

### Behavior: Hybrid Tracking

1. **Activation** - Tap compass icon
   - Request device orientation permission (iOS requires explicit permission)
   - Show toast if denied: "Enable motion sensors in settings"
   - Compass icon highlights when active

2. **Active tracking**
   - Listen to `deviceorientation` events
   - Convert device orientation (alpha, beta, gamma) to azimuth/altitude
   - Update stellarium view at ~30fps
   - Subtle pulse animation on compass icon

3. **Pause on interaction**
   - Any touch on sky view pauses sensor tracking
   - Show "Compass paused" indicator
   - User can pan/zoom freely

4. **Resume**
   - Tap compass icon to re-sync and resume tracking

5. **Deactivation**
   - Long-press compass or toggle off in settings

### Technical: Orientation to Sky Coordinates

```javascript
// Convert device orientation to view direction
function orientationToAzAlt(alpha, beta, gamma) {
  // alpha: compass heading (0-360)
  // beta: front-back tilt (-180 to 180)
  // gamma: left-right tilt (-90 to 90)

  const azimuth = (360 - alpha) % 360;  // Compass heading
  const altitude = beta - 90;            // Tilt maps to altitude

  return { azimuth, altitude };
}
```

## Implementation Approach

Since Sky Lab uses pre-built Stellarium WASM, changes will be injected via `index.html`:

1. **CSS Override** - Add styles to hide original bottom bar and restyle elements

2. **Custom UI Overlay** - Inject new minimal toolbar as separate DOM layer

3. **Compass Module** - New script block that:
   - Listens to `deviceorientation`
   - Hooks into `window.StelWebEngine` / `$stel.core`
   - Manages hybrid tracking state

4. **Object Info Intercept** - Override selection handler to show compact card

### Why This Approach

- No need to rebuild WASM/Vue bundle
- Changes isolated to `index.html`
- Can use modern CSS (vanilla or utility classes)
- Graceful fallback if injection fails

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toolbar items | 4 buttons | Most-used actions quick access, rest in settings |
| Object info | Compact card | Practical stargazing info without overwhelm |
| Compass mode | Hybrid tracking | AR feel + doesn't fight manual control |
| Implementation | HTML injection | No rebuild needed, easy maintenance |
