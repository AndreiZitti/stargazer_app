"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { CloudForecast, SavedPlace, CloudRating } from "@/lib/types";

export type LocationType = "saved" | "search" | "darksky" | "context";

export interface LocationData {
  lat: number;
  lng: number;
  name?: string;
  type: LocationType;
  savedPlaceId?: string;
  bortle?: number;
  label?: string;
  address?: string;
  // Dark Sky Place specific
  darkSkyType?: string;
  certification?: string;
}

interface LocationSheetProps {
  location: LocationData | null;
  onClose: () => void;
  onFindSpots?: (lat: number, lng: number) => void;
  onOpenForecast?: (lat: number, lng: number) => void;
  onGetDirections?: (lat: number, lng: number, name?: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

type SheetState = "closed" | "pill" | "partial" | "full";

const PILL_HEIGHT = 60;
const PARTIAL_HEIGHT_PERCENT = 0.4;
const FULL_HEIGHT_PERCENT = 0.85;

function getRatingColor(rating: CloudRating): string {
  switch (rating) {
    case "excellent":
      return "text-green-400";
    case "great":
      return "text-green-300";
    case "good":
      return "text-yellow-300";
    case "poor":
      return "text-orange-400";
    case "bad":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

function getSkyQualityColor(bortle: number): string {
  if (bortle <= 3) return "text-green-400";
  if (bortle <= 5) return "text-yellow-300";
  if (bortle <= 7) return "text-orange-400";
  return "text-red-400";
}

function getSkyQualityLabel(bortle: number): string {
  if (bortle <= 2) return "Excellent dark sky";
  if (bortle <= 3) return "Rural sky";
  if (bortle <= 4) return "Rural/suburban transition";
  if (bortle <= 5) return "Suburban sky";
  if (bortle <= 6) return "Bright suburban";
  if (bortle <= 7) return "Suburban/urban transition";
  return "Urban sky";
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationSheet({
  location,
  onClose,
  onFindSpots,
  onOpenForecast,
  onGetDirections,
  userLocation,
}: LocationSheetProps) {
  const {
    savedPlaces,
    addSavedPlace,
    removeSavedPlace,
    updateSavedPlace,
    isPlaceSaved,
    findSavedPlace,
    fetchWeather,
    getWeather,
  } = useUser();

  const [sheetState, setSheetState] = useState<SheetState>("closed");
  const [weather, setWeather] = useState<CloudForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [notesValue, setNotesValue] = useState("");

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(0);

  // Get saved place data if this location is saved
  const savedPlace = location
    ? findSavedPlace(location.lat, location.lng)
    : undefined;
  const isSaved = location ? isPlaceSaved(location.lat, location.lng) : false;

  // Open sheet when location changes
  useEffect(() => {
    if (location) {
      setSheetState("partial");
      setNameValue(savedPlace?.name || location.name || "");
      setNotesValue(savedPlace?.notes || "");
      setEditingName(false);

      // Fetch weather
      const cached = getWeather(location.lat, location.lng);
      if (cached) {
        setWeather(cached.forecast);
      } else {
        setWeatherLoading(true);
        fetchWeather(location.lat, location.lng).then((forecast) => {
          setWeather(forecast);
          setWeatherLoading(false);
        });
      }
    } else {
      setSheetState("closed");
      setWeather(null);
    }
  }, [location, savedPlace, getWeather, fetchWeather]);

  // Calculate distance from user
  const distance =
    location && userLocation
      ? haversineDistance(
          userLocation.lat,
          userLocation.lng,
          location.lat,
          location.lng
        )
      : null;

  // Get current cloud coverage
  const currentHour = weather?.hours.find((h) => h.isNight) || weather?.hours[0];
  const cloudPercent = currentHour?.cloudTotal ?? null;
  const cloudRating = currentHour?.rating;

  // Handle save/unsave
  const handleToggleSave = async () => {
    if (!location) return;

    if (isSaved && savedPlace) {
      removeSavedPlace(savedPlace.id);
    } else {
      await addSavedPlace({
        name: location.name || `Location`,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        bortle: location.bortle,
        label: location.label,
      });
    }
  };

  // Handle name save
  const handleSaveName = () => {
    if (savedPlace && nameValue.trim()) {
      updateSavedPlace(savedPlace.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  // Handle notes save
  const handleSaveNotes = () => {
    if (savedPlace) {
      updateSavedPlace(savedPlace.id, { notes: notesValue });
    }
  };

  // Drag handling
  const handleDragStart = (clientY: number) => {
    if (!sheetRef.current) return;
    dragStartY.current = clientY;
    dragStartHeight.current = sheetRef.current.offsetHeight;
  };

  const handleDragMove = (clientY: number) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const delta = dragStartY.current - clientY;
    const newHeight = dragStartHeight.current + delta;
    const viewportHeight = window.innerHeight;

    // Clamp height
    const minHeight = PILL_HEIGHT;
    const maxHeight = viewportHeight * FULL_HEIGHT_PERCENT;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    sheetRef.current.style.height = `${clampedHeight}px`;
  };

  const handleDragEnd = () => {
    if (!sheetRef.current) return;
    dragStartY.current = null;

    const height = sheetRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const pillThreshold = PILL_HEIGHT + 40;
    const partialHeight = viewportHeight * PARTIAL_HEIGHT_PERCENT;
    const fullThreshold = viewportHeight * 0.6;

    // Snap to nearest state
    if (height < pillThreshold) {
      setSheetState("pill");
    } else if (height < fullThreshold) {
      setSheetState("partial");
    } else {
      setSheetState("full");
    }

    // Reset inline height (let CSS handle it)
    sheetRef.current.style.height = "";
  };

  // Get sheet height based on state
  const getSheetHeight = (): string => {
    switch (sheetState) {
      case "closed":
        return "0";
      case "pill":
        return `${PILL_HEIGHT}px`;
      case "partial":
        return `${PARTIAL_HEIGHT_PERCENT * 100}vh`;
      case "full":
        return `${FULL_HEIGHT_PERCENT * 100}vh`;
    }
  };

  if (!location || sheetState === "closed") return null;

  const displayName =
    savedPlace?.name || location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1100] bg-black/30 transition-opacity"
        style={{ opacity: sheetState === "full" ? 0.5 : 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[1200] bg-gray-900/95 backdrop-blur-xl rounded-t-3xl transition-[height] duration-300 ease-out overflow-hidden"
        style={{
          height: getSheetHeight(),
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-5 overflow-y-auto" style={{ height: "calc(100% - 28px)" }}>
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              {editingName && savedPlace ? (
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="w-full text-xl font-semibold bg-transparent border-b border-indigo-400 text-white focus:outline-none"
                  autoFocus
                />
              ) : (
                <h2
                  className={`text-xl font-semibold text-white truncate ${
                    savedPlace ? "cursor-pointer hover:text-indigo-300" : ""
                  }`}
                  onClick={() => savedPlace && setEditingName(true)}
                >
                  {displayName}
                </h2>
              )}
              {/* Sky Quality */}
              {location.bortle && (
                <p className={`text-sm ${getSkyQualityColor(location.bortle)}`}>
                  Bortle {location.bortle} · {getSkyQualityLabel(location.bortle)}
                </p>
              )}
              {location.darkSkyType && (
                <p className="text-sm text-indigo-300">
                  {location.darkSkyType}
                  {location.certification && ` · ${location.certification}`}
                </p>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-full transition-colors ${
                isSaved
                  ? "text-yellow-400 hover:text-yellow-300"
                  : "text-gray-400 hover:text-white"
              }`}
              title={isSaved ? "Remove from saved" : "Save location"}
            >
              <svg
                className="w-6 h-6"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>

          {/* Weather Summary - Visible in partial */}
          {sheetState !== "pill" && (
            <div className="mb-4">
              {weatherLoading ? (
                <p className="text-sm text-gray-400">Loading weather...</p>
              ) : cloudPercent !== null ? (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-medium ${getRatingColor(cloudRating!)}`}>
                    ☁ {cloudPercent}% clouds
                  </span>
                  <span className="text-sm text-gray-400">
                    {cloudRating === "excellent" || cloudRating === "great"
                      ? "Clear skies tonight"
                      : cloudRating === "good"
                      ? "Some clouds expected"
                      : "Cloudy conditions"}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Weather unavailable</p>
              )}
            </div>
          )}

          {/* Actions - Visible in partial */}
          {sheetState !== "pill" && (
            <div className="flex gap-3 mb-4">
              {onOpenForecast && (
                <button
                  onClick={() => onOpenForecast(location.lat, location.lng)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                >
                  View Forecast
                </button>
              )}
              {onFindSpots && (
                <button
                  onClick={() => onFindSpots(location.lat, location.lng)}
                  className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  Find Dark Spots
                </button>
              )}
              {onGetDirections && (
                <button
                  onClick={() => onGetDirections(location.lat, location.lng, location.name)}
                  className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Directions
                </button>
              )}
            </div>
          )}

          {/* Meta Info - Visible in partial */}
          {sheetState !== "pill" && (
            <div className="text-sm text-gray-400 mb-4">
              {distance !== null && <span>{formatDistance(distance)} away</span>}
              {savedPlace && (
                <span>
                  {distance !== null && " · "}
                  Saved {new Date(savedPlace.savedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Extended Content - Only in full */}
          {sheetState === "full" && (
            <>
              {/* Notes */}
              {savedPlace && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    onBlur={handleSaveNotes}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                    rows={3}
                    placeholder="Add notes about this location..."
                  />
                </div>
              )}

              {/* Inline Forecast Preview */}
              {weather && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    24h Forecast
                  </h3>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {weather.hours.slice(0, 24).map((hour, i) => (
                      <div
                        key={i}
                        className={`flex-shrink-0 w-10 text-center py-2 rounded ${
                          hour.isNight ? "bg-gray-800" : "bg-gray-700/50"
                        }`}
                      >
                        <div className="text-xs text-gray-400">
                          {new Date(hour.time).getHours()}h
                        </div>
                        <div className={`text-sm font-medium ${getRatingColor(hour.rating)}`}>
                          {hour.cloudTotal}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Coordinates</h3>
                <p className="text-sm text-gray-400 font-mono">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              </div>

              {/* Delete Button */}
              {savedPlace && (
                <button
                  onClick={() => {
                    removeSavedPlace(savedPlace.id);
                    onClose();
                  }}
                  className="w-full py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Remove from Saved Places
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
