# Stellarium Integration & AR Sky Tracking Research

**Date:** 2026-01-02
**Status:** Research Complete

---

## Part 1: Current Stellarium Usage in Stargazer

### How We Currently Use Stellarium

The project embeds Stellarium Web via iframe at `stellarium-web.org`:

**Main integration points:**

1. **Full-page viewer** (`src/app/stellarium/page.tsx`)
   - Embeds `https://stellarium-web.org/` in an iframe
   - Passes URL parameters: `date`, `lat`, `lng`, `fov`

2. **DSO-specific views** (`src/components/SkyGuide.tsx`, `src/components/FeaturedDSOCard.tsx`)
   - Links to specific sky objects via `/skysource/{id}` URLs
   - Each DSO in `dso-december-january.json` has a `stellarium` field with:
     - `skysource_id`: The Stellarium object identifier
     - `default_fov`: Field of view for that object
     - `views`: Optional preset zoom levels (context/medium/detail)

### URL Structure

```
https://stellarium-web.org/skysource/{skysource_id}?date={ISO}&lat={lat}&lng={lng}&fov={degrees}
```

---

## Part 2: Self-Hosting Stellarium Web

### Can We Self-Host? YES

Stellarium Web is fully open-source under **AGPL-3.0** license. There are two main repositories:

#### 1. Stellarium Web Engine (Core Renderer)
**Repository:** https://github.com/Stellarium/stellarium-web-engine

- Written in C, compiled to WebAssembly
- Pure rendering engine with no UI
- **Features:**
  - 1+ billion stars (Gaia database)
  - HiPS survey rendering
  - High-res planet textures
  - Atmosphere simulation
  - Constellation overlays
  - Custom layers/shapes

**Build requirements:**
```bash
# Install emscripten and scons first
source $PATH_TO_EMSDK/emsdk_env.sh
make js
# Outputs: stellarium-web-engine.js, stellarium-web-engine.wasm
```

#### 2. Stellarium Web GUI (Full Application)
**Repository:** https://github.com/astronomersiva/stellarium-web (or rkaczorek/stellarium-web)

- Vue.js frontend wrapping the engine
- Generates static files deployable anywhere

**Self-hosting options:**

```bash
# Using Docker
make setup      # Build Docker image
make dev        # Development server
make build      # Production build
make start      # Serve at localhost:8000

# Using Yarn directly
yarn
yarn run dev    # Development
yarn run build  # Production build (static files)
```

### Benefits of Self-Hosting

| Aspect | Current (iframe) | Self-Hosted |
|--------|-----------------|-------------|
| Ads/Branding | Stellarium Labs branding | Full control |
| Performance | External load | Same-origin, faster |
| Customization | URL params only | Full source access |
| Offline | No | Yes (PWA possible) |
| API Access | Limited | Full engine API |
| Dependencies | External availability | Self-contained |
| CORS issues | Possible | None |

### License Implications (AGPL-3.0)

- **Can:** Self-host, modify, redistribute
- **Must:** Disclose source code of modifications, maintain same license
- **Note:** If we significantly modify it, we must make our changes available

### Recommended Approach

1. **Short-term:** Continue using iframe (works, low effort)
2. **Medium-term:** Self-host vanilla Stellarium Web
   - Deploy as static site alongside our app
   - Remove/rebrand ads/splash screens
   - Subdomain: `sky.stargazer.app` or route: `/sky/`
3. **Long-term:** Custom integration using just the engine
   - Embed engine directly in our React app
   - Build custom UI matching our design language

---

## Part 3: AR Sky Tracking (Point-to-Find Feature)

### Can We Implement AR Tracking? YES

Using device sensors (gyroscope, accelerometer, compass), we can build a "point your phone at the sky" feature.

### JavaScript APIs Available

```javascript
// Device Orientation API (standard)
window.addEventListener('deviceorientation', (event) => {
  const alpha = event.alpha; // Compass heading (0-360)
  const beta = event.beta;   // Front-back tilt (-180 to 180)
  const gamma = event.gamma; // Left-right tilt (-90 to 90)
});

// Must request permission on iOS 13+
if (typeof DeviceOrientationEvent.requestPermission === 'function') {
  DeviceOrientationEvent.requestPermission()
    .then(permission => {
      if (permission === 'granted') {
        // Add listener
      }
    });
}
```

### Open-Source Reference: AstroHopper

**Repository:** https://github.com/artyom-beilis/skyhopper
**License:** GPL-3.0

AstroHopper is a pure web app that does exactly what we want:
- Tracks phone orientation via gyroscope
- Shows direction to celestial objects
- Works offline as PWA
- Single HTML page with embedded JS

**Key insights from their implementation:**
- Phone attaches to telescope, screen parallel to viewing direction
- Gyroscopes measure pointing angle changes
- Gravity sensors provide altitude reference
- Compass provides azimuth (when available)
- **Limitation:** Gyro accuracy degrades over time, needs periodic realignment

### Feature Concept: "Sky Compass"

A new feature in Stargazer to help users locate objects:

```
User Flow:
1. User selects a DSO from our guide (e.g., Orion Nebula)
2. Taps "Find in Sky" button
3. App shows AR overlay with arrow pointing toward object
4. Real-time distance indicator: "Turn 45 left, tilt up 30"
5. Haptic feedback when phone points at target
```

#### Technical Requirements

| Requirement | Details |
|-------------|---------|
| Device APIs | DeviceOrientation, Geolocation |
| Permissions | Motion sensors (iOS), Location |
| Calculations | Convert RA/Dec to Alt/Az for current time/location |
| Libraries | astronomy.js or stellarium-web-engine |
| Camera | Optional (for true AR overlay) |
| Offline | Store object catalog locally |

### Implementation Approaches

#### Option A: Pure Compass Mode (Simpler)
- No camera, just directional arrows
- "Turn left 45, point up 30"
- Works on all devices
- ~1-2 weeks implementation

#### Option B: Camera AR Overlay (Advanced)
- Live camera with object labels
- Full augmented reality experience
- Requires camera permissions
- More battery intensive
- ~4-6 weeks implementation

#### Option C: Integrate Stellarium Engine (Most Powerful)
- Use stellarium-web-engine directly
- Full sky rendering + device orientation
- Most accurate, most complex
- ~2-3 months implementation

### Coordinate Conversion

To point at an object, we need to convert its RA/Dec (fixed celestial coordinates) to Alt/Az (local horizon coordinates):

```javascript
// Simplified conversion
function raDecToAltAz(ra, dec, lat, lng, date) {
  // 1. Calculate Local Sidereal Time (LST)
  const lst = calculateLST(lng, date);

  // 2. Hour Angle = LST - RA
  const ha = lst - ra;

  // 3. Convert to Alt/Az using spherical trig
  const alt = Math.asin(
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(ha)
  );

  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(ha),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha)
  );

  return { altitude: alt, azimuth: az };
}
```

Libraries like `astronomy.js` handle this accurately with proper precession/nutation corrections.

---

## Part 4: Recommendations

### Short-Term (Now - 1 Month)

1. **Keep current iframe integration** - it works
2. **Prototype Sky Compass** (Option A)
   - Add device orientation tracking
   - Simple "point here" arrows
   - Test on real devices

### Medium-Term (1-3 Months)

3. **Self-host Stellarium Web**
   - Fork astronomersiva/stellarium-web
   - Remove ads/branding
   - Deploy to our infrastructure
   - Update all iframe URLs

4. **Enhance Sky Compass**
   - Add camera AR overlay (Option B)
   - Integrate with our DSO database
   - Offline support

### Long-Term (3-6 Months)

5. **Deep Stellarium Integration**
   - Embed engine in React app
   - Custom UI matching our design
   - Full offline capability

6. **Advanced AR Features**
   - Real-time constellation overlay
   - Planet tracking
   - ISS/satellite passes

---

## Resources

- Stellarium Web Engine: https://github.com/Stellarium/stellarium-web-engine
- Stellarium Web GUI: https://github.com/astronomersiva/stellarium-web
- AstroHopper (AR reference): https://github.com/artyom-beilis/skyhopper
- Device Orientation API: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent
- astronomy.js: https://github.com/cosinekitty/astronomy
