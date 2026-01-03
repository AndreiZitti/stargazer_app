# Sky Lab Minimal UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement minimal 4-button toolbar, settings panel, compact object cards, and compass/AR mode for Sky Lab.

**Architecture:** Inject custom CSS and JavaScript into `index.html` to overlay a new minimal UI on top of the existing Stellarium Vue app. Hide original UI elements with CSS, intercept selection events for compact cards.

**Tech Stack:** Vanilla JavaScript, CSS (injected into index.html), Device Orientation API

---

## Task 1: Add CSS to Hide Original Bottom Bar

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add style block to hide original UI**

Add this `<style>` block in the `<head>` section, after the existing CSS link:

```html
<style>
/* Hide original cluttered bottom bar */
.bottom-button, .tbtcontainer, .tmenubt { display: none !important; }

/* Hide the original selection panel (we'll replace with compact card) */
.v-navigation-drawer--right { display: none !important; }

/* Ensure sky canvas is full height */
#stel-canvas { height: 100vh !important; }
</style>
```

**Step 2: Verify in browser**

Run: Open `http://localhost:3000/sky-lab/` in browser
Expected: Original bottom bar buttons are hidden, sky view fills screen

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "style: hide original Sky Lab bottom bar UI"
```

---

## Task 2: Add Minimal Toolbar HTML Structure

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add toolbar HTML after the app div**

Add this HTML right after `<div id=app></div>`:

```html
<div id="skylab-toolbar">
  <button id="btn-search" class="toolbar-btn" title="Search">
    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
  </button>
  <button id="btn-constellations" class="toolbar-btn" title="Constellations">
    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
  </button>
  <button id="btn-compass" class="toolbar-btn" title="Compass Mode">
    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>
  </button>
  <button id="btn-settings" class="toolbar-btn" title="Settings">
    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
  </button>
</div>
```

**Step 2: Verify in browser**

Run: Refresh browser
Expected: Four buttons appear (unstyled) at bottom of page

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add minimal toolbar HTML structure"
```

---

## Task 3: Style the Minimal Toolbar

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add toolbar CSS to the style block**

Append to the existing `<style>` block:

```css
/* Minimal Toolbar */
#skylab-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  z-index: 9999;
}

.toolbar-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.toolbar-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}

.toolbar-btn.active {
  background: rgba(100,149,237,0.6);
  box-shadow: 0 0 12px rgba(100,149,237,0.5);
}

.toolbar-btn svg {
  width: 24px;
  height: 24px;
}
```

**Step 2: Verify in browser**

Run: Refresh browser
Expected: Four circular glass-morphism buttons centered at bottom, hover effects work

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "style: add glass-morphism toolbar styling"
```

---

## Task 4: Add Settings Panel HTML and CSS

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add settings panel HTML after toolbar**

```html
<div id="skylab-settings" class="panel-hidden">
  <div class="panel-header">
    <span>Settings</span>
    <button id="btn-close-settings" class="close-btn">&times;</button>
  </div>
  <div class="panel-content">
    <div class="setting-group">
      <div class="group-title">VIEW</div>
      <label class="toggle-row">
        <span>Atmosphere</span>
        <input type="checkbox" id="toggle-atmosphere" checked>
      </label>
      <label class="toggle-row">
        <span>Landscape</span>
        <input type="checkbox" id="toggle-landscape" checked>
      </label>
      <label class="toggle-row">
        <span>Deep Sky Objects</span>
        <input type="checkbox" id="toggle-dsos">
      </label>
    </div>
    <div class="setting-group">
      <div class="group-title">GRIDS</div>
      <label class="toggle-row">
        <span>Azimuthal</span>
        <input type="checkbox" id="toggle-azimuthal">
      </label>
      <label class="toggle-row">
        <span>Equatorial</span>
        <input type="checkbox" id="toggle-equatorial">
      </label>
    </div>
    <div class="setting-group">
      <div class="group-title">TIME &amp; LOCATION</div>
      <div class="info-row" id="location-display">Loading location...</div>
      <div class="info-row">
        <input type="date" id="input-date">
        <input type="time" id="input-time">
      </div>
    </div>
  </div>
</div>
```

**Step 2: Add settings panel CSS**

Append to the `<style>` block:

```css
/* Settings Panel */
#skylab-settings {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 50vh;
  background: rgba(20,20,30,0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px 16px 0 0;
  z-index: 10000;
  transform: translateY(0);
  transition: transform 0.3s ease;
  overflow-y: auto;
}

#skylab-settings.panel-hidden {
  transform: translateY(100%);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  opacity: 0.7;
}

.close-btn:hover { opacity: 1; }

.panel-content {
  padding: 16px 20px;
}

.setting-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  color: #fff;
  cursor: pointer;
}

.toggle-row input[type="checkbox"] {
  width: 44px;
  height: 24px;
  appearance: none;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-row input[type="checkbox"]:checked {
  background: rgba(100,149,237,0.8);
}

.toggle-row input[type="checkbox"]::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-row input[type="checkbox"]:checked::after {
  transform: translateX(20px);
}

.info-row {
  padding: 10px 0;
  color: rgba(255,255,255,0.8);
  display: flex;
  gap: 8px;
}

.info-row input {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
}
```

**Step 3: Verify in browser**

Run: Refresh browser
Expected: Settings panel is hidden (translateY 100%)

**Step 4: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add settings panel HTML and CSS"
```

---

## Task 5: Add Compact Object Info Card

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add info card HTML after settings panel**

```html
<div id="skylab-info-card" class="card-hidden">
  <div class="card-name" id="card-name">Object Name</div>
  <div class="card-type" id="card-type">Type</div>
  <div class="card-details">
    <span id="card-mag">Mag: --</span>
    <span id="card-pos">Alt: --° Az: --°</span>
  </div>
</div>
```

**Step 2: Add info card CSS**

Append to the `<style>` block:

```css
/* Compact Info Card */
#skylab-info-card {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(20,20,30,0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 12px 16px;
  z-index: 9998;
  max-width: 200px;
  transition: opacity 0.2s, transform 0.2s;
}

#skylab-info-card.card-hidden {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.card-type {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 8px;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  font-family: monospace;
}
```

**Step 3: Verify in browser**

Run: Refresh browser
Expected: Info card is hidden (opacity 0)

**Step 4: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add compact object info card HTML and CSS"
```

---

## Task 6: Add JavaScript for Toolbar Interactions

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add interaction script before closing body tag**

Add this `<script>` block right before `</body>`:

```html
<script>
(function() {
  'use strict';

  // Wait for Stellarium to initialize
  function waitForStel(callback) {
    var checkInterval = setInterval(function() {
      if (window.$stel && window.$stel.core) {
        clearInterval(checkInterval);
        callback();
      }
    }, 100);
  }

  waitForStel(function() {
    var stel = window.$stel;

    // DOM elements
    var btnSearch = document.getElementById('btn-search');
    var btnConstellations = document.getElementById('btn-constellations');
    var btnCompass = document.getElementById('btn-compass');
    var btnSettings = document.getElementById('btn-settings');
    var settingsPanel = document.getElementById('skylab-settings');
    var btnCloseSettings = document.getElementById('btn-close-settings');

    // Toggles
    var toggleAtmosphere = document.getElementById('toggle-atmosphere');
    var toggleLandscape = document.getElementById('toggle-landscape');
    var toggleDsos = document.getElementById('toggle-dsos');
    var toggleAzimuthal = document.getElementById('toggle-azimuthal');
    var toggleEquatorial = document.getElementById('toggle-equatorial');

    // Date/Time inputs
    var inputDate = document.getElementById('input-date');
    var inputTime = document.getElementById('input-time');

    // Sync initial toggle states from Stellarium
    function syncToggles() {
      toggleAtmosphere.checked = stel.core.atmosphere.visible;
      toggleLandscape.checked = stel.core.landscape.visible;
      toggleDsos.checked = stel.core.dsos.visible;
      toggleAzimuthal.checked = stel.core.lines.azimuthal.visible;
      toggleEquatorial.checked = stel.core.lines.equatorial.visible;
      btnConstellations.classList.toggle('active', stel.core.constellations.lines.visible);
    }
    syncToggles();

    // Sync date/time
    function syncDateTime() {
      var d = new Date();
      d.setMJD(stel.core.observer.utc);
      inputDate.value = d.toISOString().split('T')[0];
      inputTime.value = d.toTimeString().slice(0,5);
    }
    syncDateTime();

    // Settings panel toggle
    btnSettings.addEventListener('click', function() {
      settingsPanel.classList.toggle('panel-hidden');
      syncToggles();
      syncDateTime();
    });

    btnCloseSettings.addEventListener('click', function() {
      settingsPanel.classList.add('panel-hidden');
    });

    // Constellations toggle
    btnConstellations.addEventListener('click', function() {
      var newState = !stel.core.constellations.lines.visible;
      stel.core.constellations.lines.visible = newState;
      btnConstellations.classList.toggle('active', newState);
    });

    // Settings toggles
    toggleAtmosphere.addEventListener('change', function() {
      stel.core.atmosphere.visible = this.checked;
    });
    toggleLandscape.addEventListener('change', function() {
      stel.core.landscape.visible = this.checked;
    });
    toggleDsos.addEventListener('change', function() {
      stel.core.dsos.visible = this.checked;
    });
    toggleAzimuthal.addEventListener('change', function() {
      stel.core.lines.azimuthal.visible = this.checked;
    });
    toggleEquatorial.addEventListener('change', function() {
      stel.core.lines.equatorial.visible = this.checked;
    });

    // Date/Time changes
    inputDate.addEventListener('change', function() {
      var d = new Date(this.value + 'T' + inputTime.value);
      stel.core.observer.utc = d.getMJD();
    });
    inputTime.addEventListener('change', function() {
      var d = new Date(inputDate.value + 'T' + this.value);
      stel.core.observer.utc = d.getMJD();
    });

    // Search button - trigger original search
    btnSearch.addEventListener('click', function() {
      // Find and click the original search input to open it
      var searchInput = document.querySelector('.tsearch input, [placeholder*="Search"]');
      if (searchInput) searchInput.focus();
    });

    console.log('[Sky Lab] Minimal UI initialized');
  });
})();
</script>
```

**Step 2: Verify in browser**

Run: Refresh browser
Expected:
- Clicking Settings opens/closes the panel
- Toggles in settings control Stellarium view
- Constellations button toggles with active state

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add toolbar and settings interaction JavaScript"
```

---

## Task 7: Add Compass/AR Mode JavaScript

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add compass module to the interaction script**

Add this inside the `waitForStel` callback, after the existing code:

```javascript
    // ========== COMPASS MODULE ==========
    var compassActive = false;
    var compassPaused = false;
    var lastOrientation = null;

    function requestOrientationPermission() {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires permission
        return DeviceOrientationEvent.requestPermission();
      }
      return Promise.resolve('granted');
    }

    function orientationToView(alpha, beta, gamma) {
      // alpha: compass direction (0 = North, 90 = East, etc)
      // beta: front-back tilt (-180 to 180, 0 = flat, 90 = upright)
      // gamma: left-right tilt (-90 to 90)

      // Convert to azimuth (horizontal angle from North)
      var azimuth = alpha ? (360 - alpha) * (Math.PI / 180) : 0;

      // Convert to altitude (vertical angle, 0 = horizon, 90 = zenith)
      // When phone is upright (beta=90), looking at horizon
      // When phone points up (beta=0), looking at zenith
      var altitude = beta ? (90 - Math.abs(beta)) * (Math.PI / 180) : 0;
      if (beta < 0) altitude = -altitude;

      return { azimuth: azimuth, altitude: altitude };
    }

    function updateViewFromOrientation(event) {
      if (!compassActive || compassPaused) return;

      var alpha = event.alpha; // compass
      var beta = event.beta;   // front-back
      var gamma = event.gamma; // left-right

      if (alpha === null) return;

      lastOrientation = { alpha: alpha, beta: beta, gamma: gamma };

      var view = orientationToView(alpha, beta, gamma);

      // Convert spherical to cartesian for lookat
      var x = Math.cos(view.altitude) * Math.sin(view.azimuth);
      var y = Math.cos(view.altitude) * Math.cos(view.azimuth);
      var z = Math.sin(view.altitude);

      // Update Stellarium view (azalt coordinates)
      stel.core.lookat([x, -y, z], 0);
    }

    function startCompass() {
      requestOrientationPermission().then(function(permission) {
        if (permission === 'granted') {
          compassActive = true;
          compassPaused = false;
          btnCompass.classList.add('active');
          window.addEventListener('deviceorientation', updateViewFromOrientation);
          console.log('[Sky Lab] Compass mode started');
        } else {
          alert('Motion sensor permission denied. Enable in Settings.');
        }
      }).catch(function(err) {
        console.error('[Sky Lab] Compass permission error:', err);
        alert('Could not access motion sensors.');
      });
    }

    function stopCompass() {
      compassActive = false;
      compassPaused = false;
      btnCompass.classList.remove('active');
      window.removeEventListener('deviceorientation', updateViewFromOrientation);
      console.log('[Sky Lab] Compass mode stopped');
    }

    function pauseCompass() {
      if (compassActive && !compassPaused) {
        compassPaused = true;
        btnCompass.style.opacity = '0.5';
        console.log('[Sky Lab] Compass paused');
      }
    }

    function resumeCompass() {
      if (compassActive && compassPaused) {
        compassPaused = false;
        btnCompass.style.opacity = '1';
        console.log('[Sky Lab] Compass resumed');
      }
    }

    // Compass button handler
    btnCompass.addEventListener('click', function() {
      if (!compassActive) {
        startCompass();
      } else if (compassPaused) {
        resumeCompass();
      } else {
        stopCompass();
      }
    });

    // Pause compass on user interaction with canvas
    var canvas = document.getElementById('stel-canvas') || document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', pauseCompass);
      canvas.addEventListener('touchstart', pauseCompass);
    }
```

**Step 2: Verify on mobile device**

Run: Open on phone (or use Chrome DevTools mobile emulation with sensors)
Expected:
- Tap compass button requests permission (iOS)
- When active, moving phone changes view direction
- Touch sky pauses compass (button dims)
- Tap compass again to resume or stop

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add compass/AR mode with hybrid tracking"
```

---

## Task 8: Add Object Selection Handler for Compact Card

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add selection observer to the interaction script**

Add this inside the `waitForStel` callback:

```javascript
    // ========== OBJECT INFO CARD ==========
    var infoCard = document.getElementById('skylab-info-card');
    var cardName = document.getElementById('card-name');
    var cardType = document.getElementById('card-type');
    var cardMag = document.getElementById('card-mag');
    var cardPos = document.getElementById('card-pos');

    function updateInfoCard() {
      var selection = stel.core.selection;
      if (!selection || !selection.nsid) {
        infoCard.classList.add('card-hidden');
        return;
      }

      selection.update();

      // Get name
      var name = selection.designations ? selection.designations[0] : 'Unknown';
      cardName.textContent = name;

      // Get type
      var type = selection.type_name || selection.types?.[0] || 'Object';
      cardType.textContent = type;

      // Get magnitude
      var mag = selection.vmag;
      cardMag.textContent = mag && !isNaN(mag) ? 'Mag: ' + mag.toFixed(2) : 'Mag: --';

      // Get position (Az/Alt)
      var azalt = selection.azalt;
      if (azalt) {
        var az = (azalt[0] * 180 / Math.PI + 360) % 360;
        var alt = azalt[1] * 180 / Math.PI;
        cardPos.textContent = 'Alt: ' + alt.toFixed(0) + '° Az: ' + az.toFixed(0) + '°';
      } else {
        cardPos.textContent = 'Alt: --° Az: --°';
      }

      infoCard.classList.remove('card-hidden');
    }

    // Poll for selection changes (Vue reactivity doesn't expose events easily)
    var lastSelectionId = null;
    setInterval(function() {
      var sel = stel.core.selection;
      var selId = sel ? sel.nsid : null;
      if (selId !== lastSelectionId) {
        lastSelectionId = selId;
        updateInfoCard();
      }
      // Also update position continuously for selected object
      if (selId) updateInfoCard();
    }, 500);

    // Click on card to deselect
    infoCard.addEventListener('click', function() {
      stel.core.selection = null;
      infoCard.classList.add('card-hidden');
    });
```

**Step 2: Verify in browser**

Run: Refresh browser, click on a star/planet
Expected:
- Compact card appears in top-left with name, type, magnitude, position
- Position updates as time passes
- Click card to dismiss

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: add compact object info card with selection handling"
```

---

## Task 9: Final Polish and Testing

**Files:**
- Modify: `public/sky-lab/index.html`

**Step 1: Add location display update**

Add this to the interaction script:

```javascript
    // ========== LOCATION DISPLAY ==========
    var locationDisplay = document.getElementById('location-display');

    function updateLocationDisplay() {
      var loc = stel.core.observer;
      if (loc) {
        var lat = (loc.latitude * 180 / Math.PI).toFixed(2);
        var lon = (loc.longitude * 180 / Math.PI).toFixed(2);
        locationDisplay.textContent = lat + '°, ' + lon + '°';
      }
    }
    updateLocationDisplay();

    // Update location periodically
    setInterval(updateLocationDisplay, 5000);
```

**Step 2: Test all features**

Run through this checklist:
- [ ] Bottom toolbar shows 4 buttons (search, constellations, compass, settings)
- [ ] Original cluttered bar is hidden
- [ ] Constellations toggle works and shows active state
- [ ] Settings panel slides up/down
- [ ] All settings toggles control Stellarium
- [ ] Date/time inputs work
- [ ] Compass mode works on mobile (or with DevTools sensors)
- [ ] Compass pauses on touch interaction
- [ ] Clicking objects shows compact info card
- [ ] Clicking card dismisses it

**Step 3: Commit**

```bash
git add public/sky-lab/index.html
git commit -m "feat: complete Sky Lab minimal UI implementation"
```

---

## Summary

After completing all tasks, Sky Lab will have:
- **Minimal 4-button toolbar** - Search, Constellations, Compass, Settings
- **Slide-up settings panel** - All view toggles, grids, date/time
- **Compact object info card** - Name, type, magnitude, position
- **Compass/AR mode** - Hybrid tracking that pauses on touch
