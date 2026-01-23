"use client";

import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { ScoredSpot, Coordinates, AccessibilityFeature, DarkSkyPlace, DarkSkyPlaceType, SpotSearchResult } from "@/lib/types";
import { LocationData } from "./LocationSheet";
import { useUser } from "@/contexts/UserContext";
import { createLocationPinIcon } from "./LocationPin";
import CloudForecastModal from "./CloudForecastModal";
import RoutePolyline from "./RoutePolyline";
import darkSkyPlacesData from "@/data/dark-sky-places.json";

interface ContextMenuSpot {
  lat: number;
  lng: number;
  loading: boolean;
  bortle?: number;
  label?: string;
  score?: number;
  hasRoadAccess?: boolean;
  nearestFeature?: {
    type: string;
    name?: string;
    distance: number;
  };
  accessibilityScore?: number;
  accessibilityFeatures?: AccessibilityFeature[];
}

type BaseLayer = 'dark' | 'stadia' | 'satellite' | 'osm';
type PollutionOverlay = '2024' | '2022' | 'nasa';

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
  isLoadingSpots?: boolean;
  onRightClick?: (coords: Coordinates) => Promise<ContextMenuSpot | null>;
  onFindSpots?: (coords: Coordinates) => void;
  animatePin?: boolean;
  showDarkSkyPlaces?: boolean;
  searchResults?: SpotSearchResult[];
  searchOrigin?: Coordinates | null;
  isSearching?: boolean;
  searchRadius?: number; // in km
  onLocationSelect?: (location: LocationData) => void;
  routeCoordinates?: [number, number][];
}

// Icon cache for memoization - prevents creating new DivIcon instances on every render
const iconCache = new Map<string, DivIcon>();

function getCachedIcon(key: string, createFn: () => DivIcon): DivIcon {
  if (!iconCache.has(key)) {
    iconCache.set(key, createFn());
  }
  return iconCache.get(key)!;
}

// Dark Sky Places icons by type
const DARK_SKY_PLACE_STYLES: Record<DarkSkyPlaceType, { color: string; icon: string; label: string }> = {
  park: { color: '#22c55e', icon: '🌲', label: 'Dark Sky Park' },
  reserve: { color: '#3b82f6', icon: '🏔️', label: 'Dark Sky Reserve' },
  community: { color: '#a855f7', icon: '🏘️', label: 'Dark Sky Community' },
  tourism: { color: '#f59e0b', icon: '🔭', label: 'Starlight Destination' },
  stellar_park: { color: '#ec4899', icon: '⭐', label: 'Stellar Park' },
  urban: { color: '#6b7280', icon: '🌃', label: 'Urban Night Sky' },
};

function getDarkSkyPlaceIcon(type: DarkSkyPlaceType): DivIcon {
  return getCachedIcon(`darksky-${type}`, () => {
    const style = DARK_SKY_PLACE_STYLES[type] || DARK_SKY_PLACE_STYLES.park;
    return new DivIcon({
      className: 'dark-sky-place-marker',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background: ${style.color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">${style.icon}</div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  });
}

// Base layer URLs
const BASE_LAYERS: Record<BaseLayer, { url: string; attribution: string; maxZoom?: number }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  stadia: {
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    maxZoom: 20,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

// Pollution overlay URLs
const POLLUTION_OVERLAYS: Record<PollutionOverlay, { url: string; attribution: string }> = {
  '2024': {
    url: "https://djlorenz.github.io/astronomy/image_tiles/tiles2024/tile_{z}_{x}_{y}.png",
    attribution: '<a href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html">D. Lorenz</a>',
  },
  '2022': {
    url: "https://djlorenz.github.io/astronomy/image_tiles/tiles2022/tile_{z}_{x}_{y}.png",
    attribution: '<a href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html">D. Lorenz</a>',
  },
  nasa: {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
    attribution: 'NASA VIIRS Black Marble',
  },
};

// Component to handle map center and zoom updates
function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

// Component to handle map click events
function MapClickHandler({
  onRightClick,
  onMapClick,
}: {
  onRightClick: (coords: Coordinates) => void;
  onMapClick: () => void;
}) {
  useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      onRightClick(coords);
    },
    click: () => {
      // Close popup on map click (but keep the pin)
      onMapClick();
    },
  });

  return null;
}

// Custom icon for search location
const searchLocationIcon = new DivIcon({
  className: 'search-location-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom icon for context menu spot
const contextSpotIcon = new DivIcon({
  className: 'context-spot-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #8b5cf6;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom icons for spots by radius
function getSpotIcon(radius: number): DivIcon {
  return getCachedIcon(`spot-${radius}`, () => {
    const colors: Record<number, string> = {
      10: '#22c55e',  // green - closest
      50: '#eab308',  // yellow - medium
      150: '#f97316', // orange - furthest
    };
    const color = colors[radius] || '#6b7280';

    return new DivIcon({
      className: 'spot-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
        ">${radius}</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  });
}

// Custom icons for search result markers (numbered)
function getSearchResultIcon(number: number): DivIcon {
  return getCachedIcon(`searchresult-${number}`, () => {
    return new DivIcon({
      className: 'search-result-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #6366f1;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">${number}</div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  });
}

// Custom icon for saved places
function getSavedPlaceIcon(label?: string): DivIcon {
  const cacheKey = `saved-${label || 'default'}`;
  return getCachedIcon(cacheKey, () => {
    // Color based on sky quality
    const colors: Record<string, string> = {
      'Excellent': '#22c55e',
      'Great': '#84cc16',
      'Good': '#eab308',
      'Moderate': '#f97316',
      'Poor': '#ef4444',
    };
    const color = (label && colors[label]) || '#eab308';

    return new DivIcon({
      className: 'saved-place-marker',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  });
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function LightPollutionMap({
  center = [48.1351, 11.582],
  zoom = 6,
  className = "h-[500px] w-full rounded-lg",
  overlayOpacity = 0.4,
  baseLayer = 'dark',
  activeOverlays = ['2024'],
  searchLocation,
  spots = [],
  onSpotClick,
  isLoadingSpots = false,
  onRightClick,
  onFindSpots,
  animatePin = false,
  showDarkSkyPlaces = true,
  searchResults = [],
  searchOrigin,
  isSearching = false,
  searchRadius = 40,
  onLocationSelect,
  routeCoordinates = [],
}: LightPollutionMapProps) {
  const [contextSpot, setContextSpot] = useState<ContextMenuSpot | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { savedPlaces, addSavedPlace, removeSavedPlace, isPlaceSaved, findSavedPlace } = useUser();
  const [cloudForecast, setCloudForecast] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);

  const baseConfig = BASE_LAYERS[baseLayer];

  const handleToggleSave = (lat: number, lng: number, name: string, bortle?: number, label?: string) => {
    if (isPlaceSaved(lat, lng)) {
      const saved = findSavedPlace(lat, lng);
      if (saved) {
        removeSavedPlace(saved.id);
      }
    } else {
      addSavedPlace({ name, lat, lng, bortle, label });
    }
  };

  return (
    <>
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
      maxZoom={18}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <MapUpdater center={center} zoom={zoom} />
      <MapClickHandler
        onRightClick={async (coords) => {
          // Immediately drop pin and start loading spot info
          setContextSpot({ ...coords, loading: true });
          setIsPopupOpen(true);

          // Fetch spot info in background
          if (onRightClick) {
            const result = await onRightClick(coords);
            if (result) {
              setContextSpot(result);
            } else {
              setContextSpot({ ...coords, loading: false });
            }
          }
        }}
        onMapClick={() => {
          // Close popup but keep the pin
          setIsPopupOpen(false);
        }}
      />

      {/* Base layer */}
      <TileLayer
        key={baseLayer}
        attribution={baseConfig.attribution}
        url={baseConfig.url}
        maxZoom={baseConfig.maxZoom}
        className={baseLayer === 'dark' ? 'base-map-enhanced' : undefined}
      />

      {/* Light pollution overlays */}
      {activeOverlays.map((overlayId) => {
        const overlay = POLLUTION_OVERLAYS[overlayId];
        const isLorenz = overlayId === '2024' || overlayId === '2022';

        return (
          <TileLayer
            key={overlayId}
            url={overlay.url}
            opacity={overlayOpacity}
            attribution={overlay.attribution}
            tileSize={isLorenz ? 1024 : 256}
            zoomOffset={isLorenz ? -2 : 0}
            maxNativeZoom={8}
            maxZoom={18}
          />
        );
      })}

      {/* Search location marker */}
      {searchLocation && (
        <Marker
          position={[searchLocation.lat, searchLocation.lng]}
          icon={createLocationPinIcon({ animate: animatePin })}
        >
          <Popup>
            <div style={{ fontSize: '14px', minWidth: '180px', color: '#e5e5e5' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Your location</div>
              {onFindSpots && (
                <button
                  onClick={() => onFindSpots(searchLocation)}
                  disabled={isLoadingSpots}
                  style={{
                    width: '100%',
                    background: '#6366f1',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
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
                      <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Find Dark Skies
                    </>
                  )}
                </button>
              )}
              <div style={{ fontSize: '12px', color: 'rgba(229, 229, 229, 0.5)', textAlign: 'center' }}>
                Right-click map for more options
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Context menu spot marker (from right-click) */}
      {contextSpot && (
        <Marker
          position={[contextSpot.lat, contextSpot.lng]}
          icon={contextSpotIcon}
          eventHandlers={{
            add: (e) => {
              // Open popup immediately when marker is added (shows loading state)
              if (isPopupOpen) {
                e.target.openPopup();
              }
            },
            click: (e) => {
              // Re-open popup when clicking on the pin
              setIsPopupOpen(true);
              e.target.openPopup();
            },
            popupclose: () => {
              setIsPopupOpen(false);
            },
          }}
        >
          <Popup>
            <div style={{ fontSize: '14px', minWidth: '200px', color: '#e5e5e5' }}>
              {contextSpot.loading ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(229,229,229,0.6)', marginBottom: '12px' }}>
                    <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading spot info...
                  </div>
                  {/* Find dark spots button - available while loading */}
                  <button
                    onClick={() => onFindSpots?.({ lat: contextSpot.lat, lng: contextSpot.lng })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find dark spots nearby
                  </button>
                </div>
              ) : (
                <>
                  {/* Score display */}
                  {contextSpot.score !== undefined && (
                    <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: '1', marginBottom: '4px' }}>
                        {contextSpot.score.toFixed(1)}<span style={{ fontSize: '16px', color: 'rgba(229,229,229,0.5)' }}> / 10</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(229,229,229,0.7)' }}>
                        {contextSpot.label}
                      </div>
                    </div>
                  )}

                  {/* Coordinates */}
                  <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '12px', textAlign: 'center' }}>
                    {contextSpot.lat.toFixed(4)}°, {contextSpot.lng.toFixed(4)}°
                  </div>

                  {/* Road access indicator */}
                  {contextSpot.hasRoadAccess !== undefined && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: contextSpot.hasRoadAccess ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                        color: contextSpot.hasRoadAccess ? '#22c55e' : '#eab308',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{contextSpot.hasRoadAccess ? '✓' : '⚠️'}</span>
                        <span>
                          {contextSpot.hasRoadAccess ? 'Road access nearby' : 'Remote - no road access'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Nearest feature info */}
                  {contextSpot.nearestFeature && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '4px' }}>Nearest:</div>
                      <div style={{ fontSize: '12px' }}>
                        {contextSpot.nearestFeature.type === 'parking' && '🅿️ '}
                        {contextSpot.nearestFeature.type === 'road' && '🛣️ '}
                        {contextSpot.nearestFeature.type === 'park' && '🌲 '}
                        {contextSpot.nearestFeature.name || contextSpot.nearestFeature.type}
                        <span style={{ color: 'rgba(229,229,229,0.4)', marginLeft: '4px' }}>
                          ({formatDistance(contextSpot.nearestFeature.distance)})
                        </span>
                      </div>
                    </div>
                  )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2a2a3a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${contextSpot.lat},${contextSpot.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          🧭 Directions
                        </a>
                        <button
                          onClick={() => setCloudForecast({
                            lat: contextSpot.lat,
                            lng: contextSpot.lng,
                            name: contextSpot.label ? `${contextSpot.label} Sky Spot` : undefined,
                          })}
                          style={{
                            color: '#6366f1',
                            fontSize: '12px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                          Forecast
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const spotName = contextSpot.score
                            ? `${contextSpot.label} (${contextSpot.score.toFixed(1)}/10)`
                            : (contextSpot.label ? `${contextSpot.label} Sky Spot` : "Saved Spot");
                          handleToggleSave(
                            contextSpot.lat,
                            contextSpot.lng,
                            spotName,
                            contextSpot.bortle,
                            contextSpot.label
                          );
                        }}
                        style={{
                          padding: '4px',
                          borderRadius: '4px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isPlaceSaved(contextSpot.lat, contextSpot.lng) ? '#eab308' : 'rgba(229,229,229,0.4)'
                        }}
                        title={isPlaceSaved(contextSpot.lat, contextSpot.lng) ? "Remove from saved" : "Save place"}
                      >
                        <svg style={{ width: '20px', height: '20px' }} fill={isPlaceSaved(contextSpot.lat, contextSpot.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>

                    {/* Find dark spots nearby button */}
                    <button
                      onClick={() => onFindSpots?.({ lat: contextSpot.lat, lng: contextSpot.lng })}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find dark spots nearby
                    </button>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

      {/* Spot markers */}
      {spots.map((spot) => (
        <Marker
          key={spot.radius}
          position={[spot.lat, spot.lng]}
          icon={getSpotIcon(spot.radius)}
          eventHandlers={{
            click: () => onSpotClick?.(spot),
          }}
        >
          <Popup>
            <div style={{ fontSize: '14px', minWidth: '200px', color: '#e5e5e5' }}>
              {/* Header */}
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {spot.radius}km - {spot.label} Sky
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '12px' }}>
                Bortle {spot.bortle} • {spot.lat.toFixed(4)}°, {spot.lng.toFixed(4)}°
              </div>

              {/* Nearby amenities */}
                {spot.accessibilityFeatures && spot.accessibilityFeatures.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '4px' }}>Nearby:</div>
                    <ul style={{ fontSize: '12px', margin: 0, padding: 0, listStyle: 'none' }}>
                      {spot.accessibilityFeatures.slice(0, 3).map((feature, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {feature.type === 'parking' && '🅿️ '}
                          {feature.type === 'park' && '🌲 '}
                          {feature.type === 'viewpoint' && '👁️ '}
                          {feature.name || feature.type}
                          <span style={{ color: 'rgba(229,229,229,0.4)', marginLeft: '4px' }}>
                            ({formatDistance(feature.distance)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2a2a3a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      🧭 Directions
                    </a>
                    <a
                      href="/december"
                      style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      🔭 Sky Guide
                    </a>
                  </div>
                  <button
                    onClick={() => handleToggleSave(
                      spot.lat,
                      spot.lng,
                      `${spot.radius}km - ${spot.label} Sky`,
                      spot.bortle,
                      spot.label
                    )}
                    style={{
                      padding: '4px',
                      borderRadius: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isPlaceSaved(spot.lat, spot.lng) ? '#eab308' : 'rgba(229,229,229,0.4)'
                    }}
                    title={isPlaceSaved(spot.lat, spot.lng) ? "Remove from saved" : "Save place"}
                  >
                    <svg style={{ width: '20px', height: '20px' }} fill={isPlaceSaved(spot.lat, spot.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Dark Sky Places markers - clustered for performance */}
      {showDarkSkyPlaces && (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={(cluster: L.MarkerCluster) => {
            const count = cluster.getChildCount();
            const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
            const sizeMap = { small: 30, medium: 40, large: 50 };
            return L.divIcon({
              html: `<div style="
                width: ${sizeMap[size]}px;
                height: ${sizeMap[size]}px;
                background: rgba(34, 197, 94, 0.9);
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${size === 'small' ? 12 : size === 'medium' ? 14 : 16}px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">${count}</div>`,
              className: 'dark-sky-cluster',
              iconSize: L.point(sizeMap[size], sizeMap[size]),
            });
          }}
        >
          {darkSkyPlacesData.places.map((place) => {
        const placeType = place.type as DarkSkyPlaceType;
        const style = DARK_SKY_PLACE_STYLES[placeType] || DARK_SKY_PLACE_STYLES.park;

        return (
          <Marker
            key={`${place.name}-${place.lat}-${place.lng}`}
            position={[place.lat, place.lng]}
            icon={getDarkSkyPlaceIcon(placeType)}
          >
            <Popup>
              <div style={{ fontSize: '14px', minWidth: '220px', color: '#e5e5e5' }}>
                {/* Header with icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    background: style.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    flexShrink: 0,
                  }}>{style.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.6)' }}>{place.country}</div>
                  </div>
                </div>

                {/* Certification badge */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    background: `${style.color}33`,
                    color: style.color,
                    fontWeight: 500,
                  }}>
                    {place.certification}
                  </span>
                </div>

                {/* Coordinates */}
                <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '12px' }}>
                  {place.lat.toFixed(4)}°, {place.lng.toFixed(4)}°
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2a2a3a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Directions
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' ' + place.certification)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Learn more
                    </a>
                  </div>
                  <button
                    onClick={() => handleToggleSave(
                      place.lat,
                      place.lng,
                      `${place.name} (${place.country})`,
                      undefined,
                      place.certification
                    )}
                    style={{
                      padding: '4px',
                      borderRadius: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isPlaceSaved(place.lat, place.lng) ? '#eab308' : 'rgba(229,229,229,0.4)'
                    }}
                    title={isPlaceSaved(place.lat, place.lng) ? "Remove from saved" : "Save place"}
                  >
                    <svg style={{ width: '20px', height: '20px' }} fill={isPlaceSaved(place.lat, place.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
        </MarkerClusterGroup>
      )}

      {/* Search origin radar (shows only during active search) */}
      {searchOrigin && isSearching && (
        <>
          {/* Animated pulse circles */}
          <Circle
            center={[searchOrigin.lat, searchOrigin.lng]}
            radius={searchRadius * 1000} // convert km to meters
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.1,
              weight: 2,
              opacity: 0.6,
            }}
            className="radar-circle"
          />
          <Circle
            center={[searchOrigin.lat, searchOrigin.lng]}
            radius={searchRadius * 1000 * 0.66}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.15,
              weight: 1,
              opacity: 0.4,
              dashArray: '5, 5',
            }}
          />
          <Circle
            center={[searchOrigin.lat, searchOrigin.lng]}
            radius={searchRadius * 1000 * 0.33}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.2,
              weight: 1,
              opacity: 0.3,
              dashArray: '3, 3',
            }}
          />
          {/* Center marker */}
          <Marker
            position={[searchOrigin.lat, searchOrigin.lng]}
            icon={new DivIcon({
              className: 'search-origin-center',
              html: `
                <div style="
                  width: 20px;
                  height: 20px;
                  background: #6366f1;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                  animation: pulse-center 1.5s ease-in-out infinite;
                "></div>
                <style>
                  @keyframes pulse-center {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                  }
                </style>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        </>
      )}

      {/* Saved Places markers */}
      {savedPlaces.map((place) => (
        <Marker
          key={`saved-${place.id}`}
          position={[place.lat, place.lng]}
          icon={getSavedPlaceIcon(place.label)}
        >
          <Popup>
            <div style={{ fontSize: '14px', minWidth: '200px', color: '#e5e5e5' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg style={{ width: '20px', height: '20px', color: '#eab308', flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{place.name}</div>
              </div>

              {/* Info */}
              <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.6)', marginBottom: '8px' }}>
                {place.label && <span>{place.label} Sky</span>}
                {place.bortle && <span> · Bortle {place.bortle}</span>}
              </div>

              {/* Coordinates */}
              <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '12px' }}>
                {place.lat.toFixed(4)}°, {place.lng.toFixed(4)}°
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2a2a3a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none' }}
                  >
                    🧭 Directions
                  </a>
                  <button
                    onClick={() => setCloudForecast({
                      lat: place.lat,
                      lng: place.lng,
                      name: place.name,
                    })}
                    style={{
                      color: '#6366f1',
                      fontSize: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ☁️ Forecast
                  </button>
                </div>
                <button
                  onClick={() => removeSavedPlace(place.id)}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: '12px',
                  }}
                  title="Remove from saved"
                >
                  Remove
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Search Result markers (numbered pins) */}
      {searchResults.map((result, index) => (
        <Marker
          key={`search-result-${index}-${result.lat}-${result.lng}`}
          position={[result.lat, result.lng]}
          icon={getSearchResultIcon(index + 1)}
        >
          <Popup>
            <div style={{ fontSize: '14px', minWidth: '200px', color: '#e5e5e5' }}>
              {/* Ranking */}
              <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '8px', textAlign: 'center' }}>
                Result #{index + 1}
              </div>

              {/* Score display */}
              <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: '1', marginBottom: '4px' }}>
                  {result.score.toFixed(1)}<span style={{ fontSize: '16px', color: 'rgba(229,229,229,0.5)' }}> / 10</span>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(229,229,229,0.7)' }}>
                  {result.label}
                </div>
              </div>

              {/* Distance */}
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(99,102,241,0.2)',
                  color: '#6366f1'
                }}>
                  {result.distanceKm}km away
                </span>
              </div>

              {/* Road access */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: result.hasRoadAccess ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                  color: result.hasRoadAccess ? '#22c55e' : '#eab308',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{result.hasRoadAccess ? '✓' : '⚠️'}</span>
                  <span>
                    {result.hasRoadAccess ? 'Road access nearby' : 'Remote - no road access'}
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div style={{ fontSize: '12px', color: 'rgba(229,229,229,0.5)', marginBottom: '12px', textAlign: 'center' }}>
                {result.lat.toFixed(4)}°, {result.lng.toFixed(4)}°
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #2a2a3a' }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  🧭 Directions
                </a>
                <button
                  onClick={() => setCloudForecast({
                    lat: result.lat,
                    lng: result.lng,
                    name: `${result.label} (${result.score.toFixed(1)}/10)`,
                  })}
                  style={{
                    color: '#6366f1',
                    fontSize: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  Forecast
                </button>
                <button
                  onClick={() => handleToggleSave(
                    result.lat,
                    result.lng,
                    `${result.label} (${result.score.toFixed(1)}/10)`,
                    undefined,
                    result.label
                  )}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isPlaceSaved(result.lat, result.lng) ? '#eab308' : 'rgba(229,229,229,0.4)'
                  }}
                  title={isPlaceSaved(result.lat, result.lng) ? "Remove from saved" : "Save place"}
                >
                  <svg style={{ width: '20px', height: '20px' }} fill={isPlaceSaved(result.lat, result.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route Polyline */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <RoutePolyline coordinates={routeCoordinates} />
      )}
    </MapContainer>

    {/* Cloud Forecast Modal */}
    {cloudForecast && (
      <CloudForecastModal
        isOpen={!!cloudForecast}
        onClose={() => setCloudForecast(null)}
        lat={cloudForecast.lat}
        lng={cloudForecast.lng}
        placeName={cloudForecast.name}
      />
    )}
    </>
  );
}
