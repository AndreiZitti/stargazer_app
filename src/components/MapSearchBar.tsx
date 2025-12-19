"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

interface MapSearchBarProps {
  onSearch: (lat: number, lng: number, name?: string) => void;
  isLoading: boolean;
}

export default function MapSearchBar({ onSearch, isLoading }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Generate session token on mount
  useEffect(() => {
    setSessionToken(crypto.randomUUID());
  }, []);

  // Fetch autocomplete predictions
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoadingPredictions(true);

    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionToken}`
      );
      const data = await response.json();

      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions.slice(0, 5));
        setShowDropdown(true);
        setSelectedIndex(-1);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("Autocomplete failed:", err);
      setPredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [sessionToken]);

  // Debounced input handler
  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setShowDropdown(false);
    setQuery(prediction.mainText);
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/places/details?placeId=${prediction.placeId}&sessionToken=${sessionToken}`
      );
      const data = await response.json();

      if (data.lat && data.lng) {
        onSearch(data.lat, data.lng, prediction.fullText);
        setQuery("");
        // Generate new session token after successful selection
        setSessionToken(crypto.randomUUID());
      } else {
        setError("Could not get location details");
      }
    } catch (err) {
      console.error("Place details failed:", err);
      setError("Failed to get location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback to Nominatim search
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || isSearching) return;

    // If there's a selected prediction, use it
    if (selectedIndex >= 0 && predictions[selectedIndex]) {
      handleSelectPrediction(predictions[selectedIndex]);
      return;
    }

    setShowDropdown(false);
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (response.ok && data.lat && data.lng) {
        onSearch(data.lat, data.lng, data.displayName);
        setQuery("");
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelectPrediction(predictions[selectedIndex]);
        }
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);
    setShowDropdown(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `/api/geocode?lat=${latitude}&lng=${longitude}&reverse=true`
          );
          const data = await response.json();
          onSearch(latitude, longitude, data.displayName || "My Location");
        } catch {
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
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 300000
      }
    );
  };

  const isDisabled = isLoading || isSearching || isLocating;

  return (
    <div className="flex flex-col items-center gap-2" ref={dropdownRef} data-tutorial="search">
      <div className="relative">
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-2 py-2 shadow-lg">
          <form onSubmit={handleSubmit} className="flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (predictions.length > 0 && query.length >= 2) {
                  setShowDropdown(true);
                }
              }}
              placeholder="Search location..."
              className="flex-1 bg-transparent px-4 py-2 text-foreground placeholder:text-foreground/40 focus:outline-none min-w-[200px]"
              disabled={isDisabled}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isDisabled || !query.trim()}
              className="p-2 rounded-full hover:bg-foreground/10 disabled:opacity-50 transition-colors"
              title="Search"
            >
              {isSearching || isLoadingPredictions ? (
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

        {/* Autocomplete dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card/98 backdrop-blur-sm border border-card-border rounded-lg shadow-xl overflow-hidden z-50">
            {predictions.map((prediction, index) => (
              <button
                key={prediction.placeId}
                onClick={() => handleSelectPrediction(prediction)}
                className={`w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors flex flex-col ${
                  index === selectedIndex ? "bg-foreground/10" : ""
                }`}
              >
                <span className="text-sm font-medium text-foreground">
                  {prediction.mainText}
                </span>
                {prediction.secondaryText && (
                  <span className="text-xs text-foreground/50 mt-0.5">
                    {prediction.secondaryText}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
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
