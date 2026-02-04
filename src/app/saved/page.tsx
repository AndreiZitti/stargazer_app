"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SavedPlace } from "@/lib/types";
import BottomTabBar from "@/components/BottomTabBar";

// Calculate distance between two points in km
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getWeatherIcon(cloudCover: number) {
  if (cloudCover < 20) return { icon: "☀️", label: "Clear" };
  if (cloudCover < 40) return { icon: "🌤", label: "Mostly Clear" };
  if (cloudCover < 60) return { icon: "⛅", label: "Partly Cloudy" };
  if (cloudCover < 80) return { icon: "🌥", label: "Mostly Cloudy" };
  return { icon: "☁️", label: "Cloudy" };
}

interface PlaceCardProps {
  place: SavedPlace;
  userLocation: { lat: number; lng: number } | null;
  onNavigate: () => void;
  onDelete: () => void;
  onFetchWeather: () => void;
  isLoadingWeather: boolean;
}

function PlaceCard({ place, userLocation, onNavigate, onDelete, onFetchWeather, isLoadingWeather }: PlaceCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const distance = userLocation
    ? getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : null;

  const weather = place.lastWeather?.forecast;
  const weatherAge = place.lastWeather
    ? Math.round((Date.now() - new Date(place.lastWeather.fetchedAt).getTime()) / (1000 * 60))
    : null;

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 text-left hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="font-medium truncate">{place.name}</h3>
            </div>
            {place.label && (
              <p className="text-sm text-foreground/60 mt-1">{place.label}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50">
              {place.bortle && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Bortle {place.bortle}
                </span>
              )}
              {distance !== null && (
                <span>{distance} km away</span>
              )}
            </div>
          </div>

          {/* Weather preview */}
          {weather && (
            <div className="text-right flex-shrink-0">
              <div className="text-2xl">{getWeatherIcon(weather.hours[0]?.cloudTotal ?? 100).icon}</div>
              <div className="text-xs text-foreground/50 mt-1">
                {weatherAge !== null && weatherAge < 60
                  ? `${weatherAge}m ago`
                  : weatherAge !== null
                  ? `${Math.round(weatherAge / 60)}h ago`
                  : ""}
              </div>
            </div>
          )}

          <svg
            className={`w-5 h-5 text-foreground/40 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="border-t border-card-border">
          {/* Weather section */}
          <div className="p-4 border-b border-card-border/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground/70">Weather Forecast</h4>
              <button
                onClick={onFetchWeather}
                disabled={isLoadingWeather}
                className="text-xs text-accent hover:text-accent/80 disabled:opacity-50"
              >
                {isLoadingWeather ? "Loading..." : "Refresh"}
              </button>
            </div>

            {weather ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weather.hours.slice(0, 12).map((hour, i) => {
                  const hourDate = new Date(hour.time);
                  const { icon } = getWeatherIcon(hour.cloudTotal);
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 text-center px-2 py-1 rounded bg-foreground/5"
                    >
                      <div className="text-xs text-foreground/50">
                        {hourDate.getHours()}:00
                      </div>
                      <div className="text-lg my-1">{icon}</div>
                      <div className="text-xs text-foreground/70">{hour.cloudTotal}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                onClick={onFetchWeather}
                disabled={isLoadingWeather}
                className="w-full py-3 text-sm text-foreground/60 hover:text-foreground/80 bg-foreground/5 rounded-lg"
              >
                {isLoadingWeather ? "Loading weather..." : "Load weather forecast"}
              </button>
            )}
          </div>

          {/* Notes */}
          {place.notes && (
            <div className="p-4 border-b border-card-border/50">
              <h4 className="text-sm font-medium text-foreground/70 mb-2">Notes</h4>
              <p className="text-sm text-foreground/60">{place.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={onNavigate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View on Map
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SavedPage() {
  const router = useRouter();
  const { savedPlaces, isLoading, removeSavedPlace, fetchWeather } = useUser();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "name">("recent");

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Ignore errors
        }
      );
    }
  }, []);

  // Sort places
  const sortedPlaces = [...savedPlaces].sort((a, b) => {
    if (sortBy === "distance" && userLocation) {
      const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  const handleFetchWeather = async (place: SavedPlace) => {
    setLoadingWeather((prev) => new Set(prev).add(place.id));
    await fetchWeather(place.lat, place.lng, true);
    setLoadingWeather((prev) => {
      const next = new Set(prev);
      next.delete(place.id);
      return next;
    });
  };

  const handleNavigate = (place: SavedPlace) => {
    // Navigate to map with the place centered
    router.push(`/?lat=${place.lat}&lng=${place.lng}&zoom=12`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-card-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Saved Places</h1>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm bg-card border border-card-border rounded-lg px-3 py-1.5 text-foreground"
            >
              <option value="recent">Recent</option>
              <option value="distance" disabled={!userLocation}>Distance</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-foreground/50">Loading...</div>
          </div>
        ) : savedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-16 h-16 text-foreground/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h2 className="text-lg font-medium text-foreground/70 mb-2">No saved places yet</h2>
            <p className="text-sm text-foreground/50 max-w-xs">
              Right-click or long-press on the map to save your favorite stargazing spots.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
            >
              Go to Map
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                userLocation={userLocation}
                onNavigate={() => handleNavigate(place)}
                onDelete={() => removeSavedPlace(place.id)}
                onFetchWeather={() => handleFetchWeather(place)}
                isLoadingWeather={loadingWeather.has(place.id)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  );
}
