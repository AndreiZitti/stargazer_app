"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { LatLngExpression } from "leaflet";
import { ScoredSpot, Coordinates, AccessibilityFeature } from "@/lib/types";

interface ContextMenuSpot {
  lat: number;
  lng: number;
  loading: boolean;
  bortle?: number;
  label?: string;
  accessibilityScore?: number;
  accessibilityFeatures?: AccessibilityFeature[];
}

type BaseLayer = 'dark' | 'stadia' | 'satellite' | 'osm';
type PollutionOverlay = '2024' | '2022' | 'nasa';

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
  isLoadingSpots?: boolean;
  onRightClick?: (coords: Coordinates) => Promise<ContextMenuSpot | null>;
  onFindSpots?: (coords: Coordinates) => void;
  animatePin?: boolean;
  showDarkSkyPlaces?: boolean;
}

export default function Map({
  center,
  zoom,
  className,
  overlayOpacity,
  baseLayer = 'dark',
  activeOverlays = ['2024'],
  searchLocation,
  spots,
  onSpotClick,
  isLoadingSpots,
  onRightClick,
  onFindSpots,
  animatePin,
  showDarkSkyPlaces = true,
}: MapProps) {
  const LightPollutionMap = useMemo(
    () =>
      dynamic(() => import("./LightPollutionMap"), {
        loading: () => (
          <div
            className={`${className || "h-[500px] w-full"} bg-surface/50 rounded-lg flex items-center justify-center`}
          >
            <div className="text-foreground/60">Loading map...</div>
          </div>
        ),
        ssr: false,
      }),
    [className]
  );

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
      isLoadingSpots={isLoadingSpots}
      onRightClick={onRightClick}
      onFindSpots={onFindSpots}
      animatePin={animatePin}
      showDarkSkyPlaces={showDarkSkyPlaces}
    />
  );
}
