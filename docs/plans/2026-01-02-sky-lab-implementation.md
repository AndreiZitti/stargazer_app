# Sky Lab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Self-host Stellarium Web as a test page at `/sky-lab`, removing third-party branding.

**Architecture:** Fork the stellarium-web Vue app, strip branding/ads, build as static files, serve from our Next.js public folder.

**Tech Stack:** Vue 2 + Vuetify (existing app), served as static files alongside Next.js

---

## Task 1: Verify the Forked Repo Works

**Files:**
- Test: `/Users/zitti/Documents/GitHub/stellarium-web-fork/`

**Step 1: Install dependencies**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn install
```

Expected: Dependencies install successfully (may have warnings for old packages)

**Step 2: Start development server**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn run dev
```

Expected: Server starts at localhost:8080, sky renders in browser

**Step 3: Verify engine loads**

Open http://localhost:8080 in browser. Confirm:
- Stars render on canvas
- Can pan/zoom
- Location detection works (or manually set)

**Step 4: Stop dev server and continue**

Ctrl+C to stop

---

## Task 2: Remove Branding and Ads

**Files:**
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/src/App.vue`
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/src/components/gui.vue`
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/index.html`

**Step 1: Update page title**

In `index.html`, change:
```html
<title>Stellarium Web Online Star Map</title>
```
To:
```html
<title>Sky Lab - Stargazer</title>
```

**Step 2: Remove cookie consent snackbar**

In `src/App.vue`, find and remove the entire `<v-snackbar>` block (lines ~12-15).

**Step 3: Remove "About" menu items**

In `src/App.vue`, in the `menuItems` array, remove:
- `{title: 'About', icon: 'info', store_var_name: 'showAboutDialog'}`
- `{title: 'Data Credits', icon: 'copyright', store_var_name: 'showDataCreditsDialog'}`
- `{title: 'Privacy', icon: 'lock', store_var_name: 'showPrivacyDialog'}`

Keep the divider and settings items.

**Step 4: Verify changes**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn run dev
```

Confirm: No cookie banner, no About/Privacy menu items, title says "Sky Lab"

---

## Task 3: Remove External Service Dependencies

**Files:**
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/src/main.js`
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/src/App.vue`

**Step 1: Remove Google Maps dependency**

In `src/main.js`, comment out or remove:
```javascript
import * as VueGoogleMaps from 'vue2-google-maps'
// ...
Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBOfY-p-V3zecsV_K3pPuYyTPm5Vy-FURo',
    libraries: 'places'
  }
})
```

**Step 2: Simplify geolocation**

In `src/App.vue`, modify `autoLocation` to use browser geolocation only:
```javascript
autoLocation: function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      this.$store.commit('setAutoDetectedLocation', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        alt: 0,
        shortName: 'Current Location',
        accuracy: position.coords.accuracy
      })
    }, (error) => {
      console.log('Geolocation error:', error)
      // Default to Munich
      this.$store.commit('setAutoDetectedLocation', {
        lat: 48.1,
        lng: 11.5,
        alt: 0,
        shortName: 'Default Location'
      })
    })
  }
}
```

**Step 3: Test without Google Maps**

```bash
yarn run dev
```

Confirm: App loads without Google Maps errors, location still works

---

## Task 4: Build Static Files

**Files:**
- Output: `/Users/zitti/Documents/GitHub/stellarium-web-fork/dist/`

**Step 1: Build for production**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn run build
```

Expected: Creates `dist/` folder with static files

**Step 2: Verify build output**

```bash
ls -la /Users/zitti/Documents/GitHub/stellarium-web-fork/dist/
```

Expected: `index.html`, `static/` folder with js/css/images

**Step 3: Test built files locally**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork/dist
python3 -m http.server 8000
```

Open http://localhost:8000, confirm sky renders correctly.

---

## Task 5: Integrate with Next.js

**Files:**
- Create: `/Users/zitti/Documents/GitHub/stargazer/public/sky-lab/`
- Modify: `/Users/zitti/Documents/GitHub/stargazer/src/app/page.tsx` (add link)

**Step 1: Copy built files to Next.js public folder**

```bash
cp -r /Users/zitti/Documents/GitHub/stellarium-web-fork/dist/* /Users/zitti/Documents/GitHub/stargazer/public/sky-lab/
```

**Step 2: Fix asset paths in index.html**

The built `index.html` has absolute paths like `/static/js/...`. We need to make them relative or update to `/sky-lab/static/...`.

Edit `/Users/zitti/Documents/GitHub/stargazer/public/sky-lab/index.html`:
- Change `src="/static/` to `src="/sky-lab/static/`
- Change `href="/static/` to `href="/sky-lab/static/`

**Step 3: Fix WASM path in JS bundle**

The engine loader references `/static/js/stellarium-web-engine.wasm`. We need to find and update this in the bundled JS, or configure the build to use a different base path.

Alternative: Configure webpack to use `/sky-lab/` as publicPath before building.

In `/Users/zitti/Documents/GitHub/stellarium-web-fork/config/index.js`, find `assetsPublicPath` and change:
```javascript
assetsPublicPath: '/sky-lab/'
```

Then rebuild:
```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn run build
cp -r dist/* /Users/zitti/Documents/GitHub/stargazer/public/sky-lab/
```

**Step 4: Add link to Sky Lab from main app**

In `src/app/page.tsx`, add a link to `/sky-lab/` (or update existing Stellarium link).

**Step 5: Test integration**

```bash
cd /Users/zitti/Documents/GitHub/stargazer
npm run dev
```

Open http://localhost:3000/sky-lab/ and confirm:
- Sky renders
- No console errors
- Can navigate back to main app

---

## Task 6: Add Navigation Back to Main App

**Files:**
- Modify: `/Users/zitti/Documents/GitHub/stellarium-web-fork/src/App.vue`

**Step 1: Add back button to header**

In `src/App.vue`, add a floating back button:
```html
<v-btn
  fab
  small
  color="primary"
  style="position: fixed; top: 16px; left: 16px; z-index: 100;"
  href="/"
>
  <v-icon>arrow_back</v-icon>
</v-btn>
```

**Step 2: Rebuild and copy**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
yarn run build
cp -r dist/* /Users/zitti/Documents/GitHub/stargazer/public/sky-lab/
```

---

## Task 7: Commit Changes

**Step 1: Commit stellarium-web-fork changes**

```bash
cd /Users/zitti/Documents/GitHub/stellarium-web-fork
git add -A
git commit -m "feat: strip branding, configure for stargazer integration"
```

**Step 2: Commit stargazer changes**

```bash
cd /Users/zitti/Documents/GitHub/stargazer
git add public/sky-lab/
git commit -m "feat: add self-hosted Sky Lab (stellarium engine)

- Self-hosted Stellarium Web at /sky-lab
- Removed third-party branding and ads
- Added navigation back to main app

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks:

- [ ] http://localhost:3000/sky-lab/ loads sky view
- [ ] No cookie consent popups
- [ ] No "About Stellarium" branding
- [ ] Location detection works
- [ ] Can pan/zoom the sky
- [ ] Back button returns to main app
- [ ] No console errors about missing assets
- [ ] WASM loads correctly (stars visible)

---

## Future: Adding Compass Feature

Once the base is working, the compass feature can be added by:

1. Creating a new Vue component `src/components/compass-overlay.vue`
2. Using Device Orientation API:
```javascript
window.addEventListener('deviceorientation', (e) => {
  this.phoneHeading = e.alpha
  this.phoneTilt = e.beta
})
```
3. Getting target position from engine:
```javascript
const target = this.$stel.getObj('M42')
target.update()
const targetAlt = target.alt  // altitude in radians
const targetAz = target.az    // azimuth in radians
```
4. Calculating direction arrow:
```javascript
const deltaAz = targetAz - (this.phoneHeading * Math.PI / 180)
const deltaAlt = targetAlt - (this.phoneTilt * Math.PI / 180)
// Render arrow pointing in (deltaAz, deltaAlt) direction
```

This is Phase 2 work after the base integration is verified.
