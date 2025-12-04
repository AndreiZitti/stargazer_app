"use client";

import { useState } from "react";

interface MapSearchBarProps {
  onSearch: (lat: number, lng: number, name?: string) => void;
  isLoading: boolean;
}

export default function MapSearchBar({ onSearch, isLoading }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (response.ok && data.lat && data.lng) {
        onSearch(data.lat, data.lng, data.displayName);
        setQuery(""); // Clear after successful search
      } else {
        setError(data.error || "Location not found");
      }
    } catch (err) {
      console.error("Geocode failed:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to reverse geocode to get location name
        try {
          const response = await fetch(
            `/api/geocode?lat=${latitude}&lng=${longitude}&reverse=true`
          );
          const data = await response.json();
          onSearch(latitude, longitude, data.displayName || "My Location");
        } catch {
          // Fallback if reverse geocode fails
          onSearch(latitude, longitude, "My Location");
        }

        setIsLocating(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("Unable to get your location");
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false, // Faster, less precise
        timeout: 30000, // 30 seconds
        maximumAge: 300000 // Accept cached position up to 5 minutes old
      }
    );
  };

  const isDisabled = isLoading || isSearching || isLocating;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-2 py-2 shadow-lg">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Search location..."
            className="flex-1 bg-transparent px-4 py-2 text-foreground placeholder:text-foreground/40 focus:outline-none min-w-[200px]"
            disabled={isDisabled}
          />
          <button
            type="submit"
            disabled={isDisabled || !query.trim()}
            className="p-2 rounded-full hover:bg-foreground/10 disabled:opacity-50 transition-colors"
            title="Search"
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
        </form>

        <div className="w-px h-6 bg-foreground/20" />

        <button
          onClick={handleUseMyLocation}
          disabled={isDisabled}
          className="p-2 rounded-full hover:bg-foreground/10 disabled:opacity-50 transition-colors"
          title="Use my location"
        >
          {isLocating ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-error/20 border border-error/50 rounded-full px-4 py-1.5 text-sm text-error">
          {error}
        </div>
      )}
    </div>
  );
}
