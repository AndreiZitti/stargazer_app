# Sky Lab: Self-Hosted Stellarium Engine

**Date:** 2026-01-02
**Status:** Design Approved

## Overview

A standalone test page (`/sky-lab`) to integrate the Stellarium Web Engine directly into our app, replacing the external iframe with a self-hosted solution. This provides full control over the sky rendering without third-party branding/ads.

## Goals

- Self-host Stellarium engine (WASM) within our app
- Build custom React UI (no Stellarium Vue frontend)
- Create isolated test environment before wider integration
- Prepare foundation for future compass/AR features

## Non-Goals (for now)

- Compass/AR tracking features
- DSO search/navigation
- Constellation toggles or advanced controls
- Replacing existing `/stellarium` route
- Offline caching

## Project Structure

```
src/
├── app/
│   └── sky-lab/
│       └── page.tsx              # Test page route
│
├── components/
│   └── StellariumEngine/
│       ├── StellariumEngine.tsx  # Core wrapper component
│       ├── useStellariumEngine.ts # Hook for engine lifecycle
│       └── types.ts              # TypeScript types for engine API
│
public/
└── stellarium/
    ├── stellarium-web-engine.js   # Engine loader
    ├── stellarium-web-engine.wasm # Compiled engine (~15-20MB)
    └── data/                      # Star catalogs (if needed)
```

## Technical Architecture

### Engine Integration

1. **Loading:** Script tag or dynamic import loads JS, which fetches WASM
2. **Initialization:** Engine attaches to canvas element
3. **Configuration:** Set observer location (lat/lng) and time
4. **Rendering:** Engine uses requestAnimationFrame internally
5. **Input:** Pan/zoom events forwarded to engine API

### React Lifecycle

```tsx
// Pseudocode
function StellariumEngine({ lat, lng, time }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StellariumCore>(null);

  useEffect(() => {
    // Load and initialize engine
    const engine = await loadStellariumEngine(canvasRef.current);
    engine.observer.setLocation(lat, lng, 0);
    engine.observer.setTime(time);
    engineRef.current = engine;

    return () => engine.destroy(); // Cleanup
  }, []);

  useEffect(() => {
    // Update location/time when props change
    engineRef.current?.observer.setLocation(lat, lng, 0);
    engineRef.current?.observer.setTime(time);
  }, [lat, lng, time]);

  return <canvas ref={canvasRef} />;
}
```

### Location Handling

- Primary: Browser Geolocation API
- Fallback: Saved location from UserContext
- Override: Manual lat/lng input

## UI Design

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Map          Sky Lab (Test)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              [  CANVAS - Sky View  ]                │
│                Full remaining height                │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Location: [48.1, 11.5] 📍   Time: [2026-01-02 22:00]│
│  FOV: 60°  [-] [+]           [Now] [Tonight 10PM]   │
└─────────────────────────────────────────────────────┘
```

### Controls

| Control | Function |
|---------|----------|
| Location | Auto-detect or manual lat/lng |
| Time | Date/time picker + quick buttons |
| FOV | Zoom in/out + current value display |
| Canvas | Drag to pan, scroll/pinch to zoom |

### Styling

- Match existing dark theme
- Bottom control bar (mobile-friendly)
- Canvas fills available space
- Loading state while WASM loads

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WASM loading fails | Loading state + error boundary with retry |
| Engine API undocumented | Reference stellarium-web source code |
| Mobile performance | Early device testing, reduce star count if needed |
| Large bundle (~20MB) | Lazy load page, show progress indicator |
| Touch event conflicts | preventDefault on canvas, test gestures |

## Implementation Steps

1. Download pre-built WASM artifacts to `/public/stellarium/`
2. Create basic canvas component that loads engine
3. Get engine rendering stars
4. Add location/time configuration
5. Add pan/zoom controls
6. Build control bar UI
7. Test on mobile browser

## Future Expansion

Once stable, this foundation enables:
- Compass mode ("point here" arrows)
- Camera AR overlay
- DSO quick-jump from our guides
- Replace existing `/stellarium` iframe
- Offline PWA support
