"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  lat: number;
  lng: number;
}

interface RecentSearch {
  name: string;
  lat: number;
  lng: number;
}

interface MapSearchBarProps {
  onSearch: (lat: number, lng: number, name?: string) => void;
  isLoading: boolean;
}

const RECENT_SEARCHES_KEY = "stargazer_recent_searches";
const MAX_RECENT_SEARCHES = 5;

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

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Generate session token on mount (kept for potential future use)
  useEffect(() => {
    setSessionToken(crypto.randomUUID());
  }, []);

  // Parse Nominatim response into readable format
  const parseNominatimResult = (result: {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
      state?: string;
      country?: string;
      name?: string;
    };
  }): PlacePrediction => {
    const address = result.address || {};
    const mainText = address.city || address.town || address.village ||
                     address.municipality || address.name ||
                     result.display_name.split(',')[0];

    const parts = result.display_name.split(',').slice(1).map(s => s.trim());
    const secondaryText = parts.slice(0, 2).join(', ');

    return {
      placeId: String(result.place_id),
      mainText,
      secondaryText,
      fullText: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
  };

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, []);

  // Reset selectedIndex when dropdown content changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [predictions, recentSearches, query]);

  // Save recent search
  const saveRecentSearch = (name: string, lat: number, lng: number) => {
    const newSearch = { name, lat, lng };
    const updated = [
      newSearch,
      ...recentSearches.filter(r => r.name !== name)
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Storage full or unavailable
    }
  };

  // Fetch autocomplete predictions using Nominatim (free, no API key required)
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoadingPredictions(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Stargazer/1.0 (https://stargazer.app)'
          }
        }
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setPredictions(data.map(parseNominatimResult));
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error("Autocomplete failed:", err);
      setPredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);
    setShowDropdown(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 2) {
      setIsLoadingPredictions(true);
      // Debounce 200ms
      debounceRef.current = setTimeout(() => {
        fetchPredictions(value);
      }, 200);
    } else {
      setPredictions([]);
      setIsLoadingPredictions(false);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    setError(null);
    inputRef.current?.focus();
  };

  // Handle prediction selection - coordinates are already in the prediction
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setShowDropdown(false);
    setQuery("");
    setError(null);

    // Nominatim results include lat/lng directly
    onSearch(prediction.lat, prediction.lng, prediction.fullText);
    saveRecentSearch(prediction.fullText, prediction.lat, prediction.lng);
  };

  // Handle recent search selection
  const handleSelectRecent = (recent: RecentSearch) => {
    setShowDropdown(false);
    onSearch(recent.lat, recent.lng, recent.name);
    setQuery("");
  };

  // Fallback to Nominatim search
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || isSearching) return;

    // If there's a selected prediction, use it
    if (selectedIndex >= 0) {
      const recentCount = query.length < 2 ? recentSearches.length : 0;
      if (selectedIndex < recentCount) {
        handleSelectRecent(recentSearches[selectedIndex]);
      } else if (predictions[selectedIndex - recentCount]) {
        handleSelectPrediction(predictions[selectedIndex - recentCount]);
      }
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
        saveRecentSearch(data.displayName || query, data.lat, data.lng);
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

  // Calculate total items for keyboard navigation
  const recentCount = query.length < 2 ? recentSearches.length : 0;
  const totalItems = recentCount + predictions.length;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDropdown(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (totalItems > 0) {
          setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (totalItems > 0) {
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case "Enter":
        if (selectedIndex >= 0 && selectedIndex < totalItems) {
          e.preventDefault();
          if (selectedIndex < recentCount) {
            handleSelectRecent(recentSearches[selectedIndex]);
          } else {
            handleSelectPrediction(predictions[selectedIndex - recentCount]);
          }
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
            setError("Location access denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location unavailable");
            break;
          case error.TIMEOUT:
            setError("Location request timed out");
            break;
          default:
            setError("Unable to get location");
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

  // Determine what to show in dropdown
  const showRecent = query.length < 2 && recentSearches.length > 0;
  const showPredictions = predictions.length > 0;
  const showLoading = isLoadingPredictions && query.length >= 2;
  const showNoResults = query.length >= 2 && !isLoadingPredictions && predictions.length === 0;
  const showEmptyPrompt = query.length < 2 && recentSearches.length === 0;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-lg px-4" ref={dropdownRef} data-tutorial="search">
      <div className="relative w-full">
        {/* Dropdown - Opens UPWARD since search is at bottom */}
        {showDropdown && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-card/98 backdrop-blur-md border border-card-border rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
            {/* Empty state prompt */}
            {showEmptyPrompt && (
              <div className="px-4 py-6 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-foreground/50">Search for a city or place</p>
                <p className="text-xs text-foreground/30 mt-1">Or use the location button</p>
              </div>
            )}

            {/* Loading state */}
            {showLoading && (
              <div className="px-4 py-4 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-foreground/50">Searching...</span>
              </div>
            )}

            {/* No results */}
            {showNoResults && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-foreground/50">No results for "{query}"</p>
                <p className="text-xs text-foreground/30 mt-1">Try a different search term</p>
              </div>
            )}

            {/* Recent searches */}
            {showRecent && (
              <>
                <div className="px-4 py-2 text-xs text-foreground/50 uppercase tracking-wide border-b border-card-border/50 bg-surface/50">
                  Recent
                </div>
                {recentSearches.map((recent, index) => (
                  <button
                    key={`recent-${index}`}
                    onClick={() => handleSelectRecent(recent)}
                    className={`w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors flex items-center gap-3 ${
                      index === selectedIndex ? "bg-foreground/10" : ""
                    }`}
                  >
                    <svg className="w-4 h-4 text-foreground/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-foreground truncate">{recent.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Predictions */}
            {showPredictions && (
              <>
                {predictions.map((prediction, index) => {
                  const itemIndex = recentCount + index;
                  return (
                    <button
                      key={prediction.placeId}
                      onClick={() => handleSelectPrediction(prediction)}
                      className={`w-full px-4 py-3 text-left hover:bg-foreground/10 transition-colors flex items-center gap-3 ${
                        itemIndex === selectedIndex ? "bg-foreground/10" : ""
                      }`}
                    >
                      <svg className="w-4 h-4 text-foreground/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground block truncate">
                          {prediction.mainText}
                        </span>
                        {prediction.secondaryText && (
                          <span className="text-xs text-foreground/50 block truncate">
                            {prediction.secondaryText}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <div className="px-4 py-1.5 text-xs text-foreground/30 border-t border-card-border/50 bg-surface/30">
                  Powered by OpenStreetMap
                </div>
              </>
            )}
          </div>
        )}

        {/* Search container */}
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-card-border rounded-xl px-3 py-2.5 shadow-xl">
          {/* Search icon */}
          <svg className="w-5 h-5 text-foreground/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              data-search-input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search location..."
              className="flex-1 bg-transparent py-1 text-foreground placeholder:text-foreground/40 focus:outline-none text-base"
              disabled={isDisabled}
              autoComplete="off"
            />

            {/* Loading indicator */}
            {(isSearching || isLocating) && (
              <svg className="w-5 h-5 animate-spin text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}

            {/* Clear button */}
            {query && !isSearching && !isLocating && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-foreground/40 hover:text-foreground/70 transition-colors"
                title="Clear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          <div className="w-px h-6 bg-foreground/20" />

          {/* Location button */}
          <button
            onClick={handleUseMyLocation}
            disabled={isDisabled}
            className="p-2 rounded-lg hover:bg-foreground/10 disabled:opacity-50 transition-colors"
            title="Use my location"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-error/20 border border-error/50 rounded-lg px-4 py-2 text-sm text-error">
          {error}
        </div>
      )}
    </div>
  );
}
