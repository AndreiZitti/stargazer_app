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
