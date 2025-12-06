# Location Interaction Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve first-time user experience with onboarding modal, redesigned animated pin, right-click context menu, and save-to-plan engagement flow.

**Architecture:** New `OnboardingModal` component handles first-visit flow, `LocationPin` component encapsulates pin SVG and animations, context menu replaces current right-click popup behavior, toast component shows after saving spots.

**Tech Stack:** React, Leaflet DivIcon, CSS keyframes for animations, localStorage for onboarding state

---

## Task 1: Create LocationPin Component with Animations

**Files:**
- Create: `src/components/LocationPin.tsx`
- Create: `src/app/globals.css` (add animations)

**Step 1: Add CSS keyframes for pin animations**

Add to `src/app/globals.css`:

```css
/* Location Pin Animations */
@keyframes pin-drop {
  0% {
    transform: translateY(-50px);
    opacity: 0;
  }
  60% {
    transform: translateY(5px);
  }
  80% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pin-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(99, 102, 241, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
  }
}

.location-pin-drop {
  animation: pin-drop 0.4s ease-out forwards;
}

.location-pin-pulse {
  animation: pin-pulse 1s ease-out 3;
}

.location-pin:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
}
```

**Step 2: Create LocationPin component**

Create `src/components/LocationPin.tsx`:

```tsx
"use client";

import { DivIcon } from "leaflet";

interface LocationPinOptions {
  animate?: boolean;
  size?: "default" | "large";
}

export function createLocationPinIcon({ animate = false, size = "default" }: LocationPinOptions = {}): DivIcon {
  const dimensions = size === "large" ? { width: 44, height: 56 } : { width: 32, height: 42 };
  const animationClass = animate ? "location-pin-drop location-pin-pulse" : "";

  const svgPin = `
    <div class="location-pin ${animationClass}" style="
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      transition: transform 0.2s ease, filter 0.2s ease;
      cursor: pointer;
    ">
      <svg viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <!-- Teardrop shape -->
        <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 26 16 26s16-17.163 16-26C32 7.163 24.837 0 16 0z" fill="#6366f1"/>
        <path d="M16 1C7.716 1 1 7.716 1 16c0 7.837 14.5 24 15 24.5.5-.5 15-16.663 15-24.5C31 7.716 24.284 1 16 1z" fill="#6366f1" stroke="white" stroke-width="2"/>
        <!-- Star icon -->
        <path d="M16 8l2.47 5.01 5.53.8-4 3.9.94 5.49L16 20.77l-4.94 2.43.94-5.49-4-3.9 5.53-.8L16 8z" fill="white"/>
      </svg>
    </div>
  `;

  return new DivIcon({
    className: "location-pin-container",
    html: svgPin,
    iconSize: [dimensions.width, dimensions.height],
    iconAnchor: [dimensions.width / 2, dimensions.height],
    popupAnchor: [0, -dimensions.height],
  });
}

// Pre-created icons for common use cases
export const locationPinIcon = createLocationPinIcon();
export const locationPinAnimatedIcon = createLocationPinIcon({ animate: true });
```

**Step 3: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/components/LocationPin.tsx src/app/globals.css
git commit -m "feat: add LocationPin component with drop and pulse animations"
```

---

## Task 2: Create MapContextMenu Component

**Files:**
- Create: `src/components/MapContextMenu.tsx`

**Step 1: Create context menu component**

Create `src/components/MapContextMenu.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onCheckSpot: () => void;
  onSearchFromHere: () => void;
  onClose: () => void;
}

export default function MapContextMenu({
  x,
  y,
  onCheckSpot,
  onSearchFromHere,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedStyle = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 100),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[2000] bg-card border border-card-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
      style={adjustedStyle}
    >
      <button
        onClick={() => {
          onCheckSpot();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Check this spot
      </button>
      <div className="border-t border-card-border" />
      <button
        onClick={() => {
          onSearchFromHere();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Search from here
      </button>
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/MapContextMenu.tsx
git commit -m "feat: add MapContextMenu component with check spot and search actions"
```

---

## Task 3: Create OnboardingModal Component

**Files:**
- Create: `src/components/OnboardingModal.tsx`

**Step 1: Create onboarding modal component**

Create `src/components/OnboardingModal.tsx`:

```tsx
"use client";

import { useState } from "react";

interface OnboardingModalProps {
  onLocationSelect: (lat: number, lng: number, name?: string) => void;
  onClose: () => void;
}

export default function OnboardingModal({ onLocationSelect, onClose }: OnboardingModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to get location name via reverse geocoding
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}&reverse=true`);
          const data = await response.json();
          onLocationSelect(latitude, longitude, data.displayName || "My Location");
        } catch {
          onLocationSelect(latitude, longitude, "My Location");
        }

        onClose();
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Please enter a city instead."
            : "Could not get your location. Please enter a city."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok && data.lat && data.lng) {
        onLocationSelect(data.lat, data.lng, data.displayName);
        onClose();
      } else {
        setError(data.error || "Location not found. Try another search.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const isDisabled = isSearching || isLocating;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Star decoration */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Where are you stargazing from?</h2>
          <p className="text-foreground/60 mb-6">We'll find the darkest skies near you</p>
        </div>

        {/* Location button */}
        <button
          onClick={handleGeolocation}
          disabled={isDisabled}
          className="w-full py-3 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          {isLocating ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Finding your location...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use my location
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-card-border" />
          <span className="text-foreground/40 text-sm">or</span>
          <div className="flex-1 h-px bg-card-border" />
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(null);
              }}
              placeholder="Enter a city..."
              disabled={isDisabled}
              className="w-full py-3 px-4 pr-12 bg-surface border border-card-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isDisabled || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-foreground/40 hover:text-accent disabled:opacity-50 transition-colors"
            >
              {isSearching ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/OnboardingModal.tsx
git commit -m "feat: add OnboardingModal component for first-visit experience"
```

---

## Task 4: Create SaveToast Component

**Files:**
- Create: `src/components/SaveToast.tsx`

**Step 1: Create save toast component**

Create `src/components/SaveToast.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface SaveToastProps {
  placeName: string;
  lat: number;
  lng: number;
  onPlanTrip: () => void;
  onDismiss: () => void;
}

export default function SaveToast({
  placeName,
  lat,
  lng,
  onPlanTrip,
  onDismiss,
}: SaveToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handlePlanTrip = () => {
    setIsVisible(false);
    setTimeout(() => {
      onPlanTrip();
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="bg-card border border-card-border rounded-lg shadow-xl p-4 flex items-center gap-4 min-w-[280px]">
        <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{placeName} saved!</div>
          <button
            onClick={handlePlanTrip}
            className="text-accent hover:underline text-sm"
          >
            Plan a trip here?
          </button>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-foreground/40 hover:text-foreground/60 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/SaveToast.tsx
git commit -m "feat: add SaveToast component for save-to-plan engagement"
```

---

## Task 5: Update LightPollutionMap with New Pin and Context Menu

**Files:**
- Modify: `src/components/LightPollutionMap.tsx`

**Step 1: Update imports and add context menu state**

In `src/components/LightPollutionMap.tsx`, update the imports at the top:

```tsx
"use client";

import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScoredSpot, Coordinates, AccessibilityFeature } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { createLocationPinIcon } from "./LocationPin";
import MapContextMenu from "./MapContextMenu";
```

**Step 2: Update RightClickHandler to use context menu**

Replace the `RightClickHandler` component:

```tsx
// Component to handle right-click events - now returns screen coordinates
function RightClickHandler({
  onRightClick,
}: {
  onRightClick: (coords: Coordinates, screenX: number, screenY: number) => void;
}) {
  useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      onRightClick(coords, e.originalEvent.clientX, e.originalEvent.clientY);
    },
  });

  return null;
}
```

**Step 3: Update the main component props and state**

Update the interface and add new state:

```tsx
interface LightPollutionMapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  overlayOpacity?: number;
  baseLayer?: BaseLayer;
  activeOverlays?: PollutionOverlay[];
  searchLocation?: Coordinates | null;
  spots?: ScoredSpot[];
  onSpotClick?: (spot: ScoredSpot) => void;
  onFindSpots?: () => void;
  isLoadingSpots?: boolean;
  onRightClick?: (coords: Coordinates) => Promise<ContextMenuSpot | null>;
  onSearchFromHere?: (coords: Coordinates) => void;
  onSavePlace?: (name: string, lat: number, lng: number, bortle?: number, label?: string) => void;
  animatePin?: boolean;
}
```

Inside the component, add context menu state:

```tsx
const [contextMenu, setContextMenu] = useState<{
  x: number;
  y: number;
  coords: Coordinates;
} | null>(null);
const [contextSpot, setContextSpot] = useState<ContextMenuSpot | null>(null);
```

**Step 4: Update the search location marker to use new pin**

Replace the search location marker section:

```tsx
{/* Search location marker */}
{searchLocation && (
  <Marker
    position={[searchLocation.lat, searchLocation.lng]}
    icon={createLocationPinIcon({ animate: animatePin })}
  >
    <Popup>
      <div className="text-sm min-w-[180px]">
        <div className="font-bold mb-2">Your location</div>
        {onFindSpots && (
          <button
            onClick={onFindSpots}
            disabled={isLoadingSpots}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white text-xs font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 mb-2"
          >
            {isLoadingSpots ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Find Dark Skies
              </>
            )}
          </button>
        )}
      </div>
    </Popup>
  </Marker>
)}
```

**Step 5: Add context menu handling and rendering**

Add the right-click handler update and context menu render:

```tsx
<RightClickHandler
  onRightClick={(coords, screenX, screenY) => {
    setContextMenu({ x: screenX, y: screenY, coords });
    setContextSpot(null);
  }}
/>

{/* Render context menu outside MapContainer via portal would be ideal,
    but for simplicity render after MapContainer closes */}
```

After the `</MapContainer>` closing tag, add:

```tsx
{contextMenu && (
  <MapContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onCheckSpot={async () => {
      if (onRightClick) {
        const result = await onRightClick(contextMenu.coords);
        if (result) {
          setContextSpot(result);
        }
      }
      setContextMenu(null);
    }}
    onSearchFromHere={() => {
      onSearchFromHere?.(contextMenu.coords);
      setContextMenu(null);
    }}
    onClose={() => setContextMenu(null)}
  />
)}
```

**Step 6: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add src/components/LightPollutionMap.tsx
git commit -m "feat: integrate new LocationPin and MapContextMenu into map"
```

---

## Task 6: Update Main Page with Onboarding and Save Toast

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add imports and onboarding state**

Add to imports at top of `src/app/page.tsx`:

```tsx
import { useState, useEffect } from "react";
import OnboardingModal from "@/components/OnboardingModal";
import SaveToast from "@/components/SaveToast";
```

**Step 2: Add onboarding and toast state inside Home component**

Add after the existing state declarations:

```tsx
// Onboarding state
const [showOnboarding, setShowOnboarding] = useState(false);
const [animatePin, setAnimatePin] = useState(false);

// Save toast state
const [saveToast, setSaveToast] = useState<{
  name: string;
  lat: number;
  lng: number;
} | null>(null);

// Check if user has completed onboarding
useEffect(() => {
  const hasOnboarded = localStorage.getItem("stargazer_onboarded");
  if (!hasOnboarded) {
    setShowOnboarding(true);
  }
}, []);
```

**Step 3: Add onboarding completion handler**

Add handler function:

```tsx
const handleOnboardingComplete = (lat: number, lng: number, name?: string) => {
  localStorage.setItem("stargazer_onboarded", "true");
  setShowOnboarding(false);
  setMapCenter([lat, lng]);
  setMapZoom(10);
  setLocationName(name || null);
  setSearchLocation({ lat, lng });
  setAnimatePin(true);

  // Reset animation flag after animation completes
  setTimeout(() => setAnimatePin(false), 4000);
};
```

**Step 4: Add search from here handler**

Add handler function:

```tsx
const handleSearchFromHere = (coords: Coordinates) => {
  setSearchLocation(coords);
  setMapCenter([coords.lat, coords.lng]);
  setMapZoom(10);
  setLocationName(null);
  setAnimatePin(true);
  setSpots([]);
  setShowSpots(false);

  setTimeout(() => setAnimatePin(false), 4000);
};
```

**Step 5: Add save handler that shows toast**

Update or add save handler:

```tsx
const handleSaveWithToast = (name: string, lat: number, lng: number, bortle?: number, label?: string) => {
  // The actual save is handled by LightPollutionMap's internal useUser hook
  // We just show the toast
  setSaveToast({ name, lat, lng });
};
```

**Step 6: Update Map component props**

Update the Map component to pass new props:

```tsx
<Map
  center={mapCenter}
  zoom={mapZoom}
  className="h-full w-full"
  overlayOpacity={overlayOpacity}
  baseLayer={baseLayer}
  activeOverlays={activeOverlays}
  searchLocation={searchLocation}
  spots={spots}
  onSpotClick={handleSpotClick}
  onFindSpots={handleFindSpots}
  isLoadingSpots={isLoadingSpots}
  onRightClick={handleRightClick}
  onSearchFromHere={handleSearchFromHere}
  animatePin={animatePin}
/>
```

**Step 7: Add OnboardingModal and SaveToast to render**

Add before the closing `</main>` tag:

```tsx
{/* Onboarding Modal */}
{showOnboarding && (
  <OnboardingModal
    onLocationSelect={handleOnboardingComplete}
    onClose={() => {
      localStorage.setItem("stargazer_onboarded", "true");
      setShowOnboarding(false);
    }}
  />
)}

{/* Save Toast */}
{saveToast && (
  <SaveToast
    placeName={saveToast.name}
    lat={saveToast.lat}
    lng={saveToast.lng}
    onPlanTrip={() => {
      const params = new URLSearchParams({
        lat: saveToast.lat.toString(),
        lng: saveToast.lng.toString(),
        name: saveToast.name,
      });
      window.location.href = `/plan?${params.toString()}`;
    }}
    onDismiss={() => setSaveToast(null)}
  />
)}
```

**Step 8: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate onboarding modal and save toast into main page"
```

---

## Task 7: Update Map.tsx Wrapper to Pass New Props

**Files:**
- Modify: `src/components/Map.tsx`

**Step 1: Update MapProps interface**

Update the interface in `src/components/Map.tsx`:

```tsx
interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  overlayOpacity?: number;
  baseLayer?: BaseLayer;
  activeOverlays?: PollutionOverlay[];
  searchLocation?: Coordinates | null;
  spots?: ScoredSpot[];
  onSpotClick?: (spot: ScoredSpot) => void;
  onFindSpots?: () => void;
  isLoadingSpots?: boolean;
  onRightClick?: (coords: Coordinates) => Promise<ContextMenuSpot | null>;
  onSearchFromHere?: (coords: Coordinates) => void;
  animatePin?: boolean;
}
```

**Step 2: Pass new props to LightPollutionMap**

Update the return statement:

```tsx
return (
  <LightPollutionMap
    center={center}
    zoom={zoom}
    className={className}
    overlayOpacity={overlayOpacity}
    baseLayer={baseLayer}
    activeOverlays={activeOverlays}
    searchLocation={searchLocation}
    spots={spots}
    onSpotClick={onSpotClick}
    onFindSpots={onFindSpots}
    isLoadingSpots={isLoadingSpots}
    onRightClick={onRightClick}
    onSearchFromHere={onSearchFromHere}
    animatePin={animatePin}
  />
);
```

**Step 3: Verify build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/components/Map.tsx
git commit -m "feat: pass new props through Map wrapper component"
```

---

## Task 8: Final Integration Test

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Test onboarding flow**

1. Open http://localhost:3000 in incognito/private window
2. Verify onboarding modal appears
3. Test "Use my location" button
4. Verify pin drops with animation
5. Test search functionality

**Step 3: Test context menu**

1. Right-click anywhere on map
2. Verify context menu appears with two options
3. Test "Check this spot" shows info
4. Test "Search from here" drops new pin

**Step 4: Test save-to-plan flow**

1. Right-click and check a spot
2. Click save button
3. Verify toast appears with "Plan a trip here?"
4. Click link and verify navigation to /plan

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete location interaction redesign

- Add first-visit onboarding modal
- Redesign location pin with teardrop shape and star icon
- Add drop and pulse animations for pin
- Implement right-click context menu with check/search options
- Add save-to-plan toast engagement flow"
```

---

## Summary

**Total Tasks:** 8

**Components Created:**
- `LocationPin.tsx` - Teardrop pin with star icon and animations
- `MapContextMenu.tsx` - Right-click menu with two actions
- `OnboardingModal.tsx` - First-visit location selection
- `SaveToast.tsx` - Post-save engagement prompt

**Files Modified:**
- `globals.css` - Pin animations
- `LightPollutionMap.tsx` - New pin, context menu integration
- `Map.tsx` - Prop passthrough
- `page.tsx` - Onboarding and toast integration
