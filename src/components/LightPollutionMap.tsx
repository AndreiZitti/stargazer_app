"use client";

import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet";
import { LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoredSpot, Coordinates, AccessibilityFeature } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { createLocationPinIcon } from "./LocationPin";
import MapContextMenu from "./MapContextMenu";

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
  animatePin?: boolean;
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

// Component to handle right-click events - returns screen coordinates for context menu
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
  onFindSpots,
  isLoadingSpots = false,
  onRightClick,
  onSearchFromHere,
  animatePin = false,
}: LightPollutionMapProps) {
  const [contextSpot, setContextSpot] = useState<ContextMenuSpot | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    coords: Coordinates;
  } | null>(null);
  const router = useRouter();
  const { addSavedPlace, removeSavedPlace, isPlaceSaved, findSavedPlace } = useUser();

  const baseConfig = BASE_LAYERS[baseLayer];

  const handlePlanTrip = (lat: number, lng: number, name?: string) => {
    const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
    if (name) params.set("name", name);
    router.push(`/plan?${params.toString()}`);
  };

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
      <RightClickHandler
        onRightClick={(coords, screenX, screenY) => {
          setContextMenu({ x: screenX, y: screenY, coords });
          setContextSpot(null);
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
            <div className="text-sm min-w-[180px] text-foreground">
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
              <div className="text-xs text-foreground/50 text-center">
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
            popupclose: () => setContextSpot(null),
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px] text-foreground">
              {contextSpot.loading ? (
                <div className="flex items-center gap-2 text-foreground/60">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading spot info...
                </div>
              ) : (
                <>
                  <div className="font-bold mb-2">
                    {contextSpot.label ? `${contextSpot.label} Sky` : 'Spot Info'}
                    {contextSpot.bortle && (
                      <span className="font-normal text-foreground/60 ml-1">
                        (Bortle {contextSpot.bortle})
                      </span>
                    )}
                  </div>

                  {contextSpot.accessibilityScore !== undefined && (
                    <div className="mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        contextSpot.accessibilityScore >= 4 ? 'bg-success/20 text-success' :
                        contextSpot.accessibilityScore >= 2 ? 'bg-warning/20 text-warning' :
                        'bg-foreground/10 text-foreground/60'
                      }`}>
                        {contextSpot.accessibilityScore >= 4 ? 'Easy access' :
                         contextSpot.accessibilityScore >= 2 ? 'Some access' : 'Limited access'}
                      </span>
                    </div>
                  )}

                  {contextSpot.accessibilityFeatures && contextSpot.accessibilityFeatures.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-foreground/50 mb-1">Nearby:</div>
                      <ul className="text-xs space-y-1">
                        {contextSpot.accessibilityFeatures.slice(0, 3).map((feature, idx) => (
                          <li key={idx}>
                            {feature.type === 'parking' && '🅿️ '}
                            {feature.type === 'park' && '🌲 '}
                            {feature.type === 'viewpoint' && '👁️ '}
                            {feature.name || feature.type}
                            <span className="text-foreground/40 ml-1">
                              ({formatDistance(feature.distance)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-card-border mt-2">
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${contextSpot.lat},${contextSpot.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-xs"
                      >
                        Directions
                      </a>
                      <button
                        onClick={() => handlePlanTrip(contextSpot.lat, contextSpot.lng)}
                        className="text-accent hover:underline text-xs"
                      >
                        Plan trip
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleSave(
                        contextSpot.lat,
                        contextSpot.lng,
                        contextSpot.label ? `${contextSpot.label} Sky Spot` : "Saved Spot",
                        contextSpot.bortle,
                        contextSpot.label
                      )}
                      className={`p-1 rounded transition-colors ${
                        isPlaceSaved(contextSpot.lat, contextSpot.lng)
                          ? "text-warning"
                          : "text-foreground/40 hover:text-warning"
                      }`}
                      title={isPlaceSaved(contextSpot.lat, contextSpot.lng) ? "Remove from saved" : "Save place"}
                    >
                      <svg className="w-5 h-5" fill={isPlaceSaved(contextSpot.lat, contextSpot.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
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
            <div className="text-sm min-w-[200px] text-foreground">
              <div className="font-bold mb-2">
                {spot.radius}km - {spot.label} Sky
              </div>

              {spot.accessibilityFeatures && spot.accessibilityFeatures.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-foreground/50 mb-1">Nearby:</div>
                  <ul className="text-xs space-y-1">
                    {spot.accessibilityFeatures.slice(0, 3).map((feature, idx) => (
                      <li key={idx}>
                        {feature.type === 'parking' && '🅿️ '}
                        {feature.type === 'park' && '🌲 '}
                        {feature.type === 'viewpoint' && '👁️ '}
                        {feature.name || feature.type}
                        <span className="text-foreground/40 ml-1">
                          ({formatDistance(feature.distance)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-card-border mt-2">
                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-xs"
                  >
                    Directions
                  </a>
                  <button
                    onClick={() => handlePlanTrip(spot.lat, spot.lng, `${spot.radius}km - ${spot.label} Sky`)}
                    className="text-accent hover:underline text-xs"
                  >
                    Plan trip
                  </button>
                </div>
                <button
                  onClick={() => handleToggleSave(
                    spot.lat,
                    spot.lng,
                    `${spot.radius}km - ${spot.label} Sky`,
                    spot.bortle,
                    spot.label
                  )}
                  className={`p-1 rounded transition-colors ${
                    isPlaceSaved(spot.lat, spot.lng)
                      ? "text-warning"
                      : "text-foreground/40 hover:text-warning"
                  }`}
                  title={isPlaceSaved(spot.lat, spot.lng) ? "Remove from saved" : "Save place"}
                >
                  <svg className="w-5 h-5" fill={isPlaceSaved(spot.lat, spot.lng) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>

    {/* Context Menu */}
    {contextMenu && (
      <MapContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        onCheckSpot={async () => {
          if (onRightClick) {
            setContextSpot({ ...contextMenu.coords, loading: true });
            const result = await onRightClick(contextMenu.coords);
            if (result) {
              setContextSpot(result);
            } else {
              setContextSpot({ ...contextMenu.coords, loading: false });
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
    </>
  );
}
