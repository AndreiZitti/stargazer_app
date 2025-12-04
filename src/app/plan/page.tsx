"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { WeatherForecast } from "@/lib/types";

// Dynamic import for the map to avoid SSR issues
const StartingLocationMap = dynamic(() => import("./StartingLocationMap"), {
  loading: () => (
    <div className="h-64 bg-surface/50 rounded-lg flex items-center justify-center">
      <div className="text-foreground/60">Loading map...</div>
    </div>
  ),
  ssr: false,
});

interface LocationState {
  lat: number;
  lng: number;
  name?: string;
}

function PlanContent() {
  const searchParams = useSearchParams();
  const destLat = searchParams.get("lat");
  const destLng = searchParams.get("lng");
  const destName = searchParams.get("name");

  // Multi-step flow state
  const [step, setStep] = useState(1);

  // Step 1: Starting location state
  const [startLocation, setStartLocation] = useState<LocationState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Step 2: Weather state
  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok && data.lat && data.lng) {
        setStartLocation({
          lat: data.lat,
          lng: data.lng,
          name: data.displayName,
        });
      } else {
        setSearchError(data.error || "Location not found");
      }
    } catch (err) {
      console.error("Geocode failed:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}&reverse=true`);
          const data = await response.json();
          setStartLocation({
            lat: latitude,
            lng: longitude,
            name: data.displayName || "My Location",
          });
        } catch {
          setStartLocation({
            lat: latitude,
            lng: longitude,
            name: "My Location",
          });
        }

        setIsLocating(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setSearchError("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            setSearchError("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setSearchError("Location request timed out. Please try again.");
            break;
          default:
            setSearchError("Unable to get your location");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    setStartLocation((prev) => (prev ? { ...prev, lat, lng, name: "Custom Location" } : null));
  };

  const handleNext = async () => {
    if (startLocation && destLat && destLng) {
      setStep(2);
      setIsLoadingWeather(true);

      try {
        const response = await fetch(`/api/weather?lat=${destLat}&lng=${destLng}`);
        const data = await response.json();
        if (data.forecasts) {
          setWeather(data.forecasts);
          // Auto-select the best day
          const bestDay = data.forecasts.reduce((best: WeatherForecast, current: WeatherForecast) =>
            current.stargazingScore > best.stargazingScore ? current : best
          , data.forecasts[0]);
          if (bestDay) {
            setSelectedDate(bestDay.date);
          }
        }
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setIsLoadingWeather(false);
      }
    }
  };

  const isDisabled = isSearching || isLocating;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to map
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Plan Your Stargazing Trip</h1>
          {destName && (
            <p className="text-foreground/60">
              Destination: {destName}
            </p>
          )}
          {destLat && destLng && !destName && (
            <p className="text-foreground/60">
              Destination: {parseFloat(destLat).toFixed(4)}, {parseFloat(destLng).toFixed(4)}
            </p>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? "bg-accent text-white"
                    : s < step
                    ? "bg-success text-white"
                    : "bg-foreground/10 text-foreground/40"
                }`}
              >
                {s < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 mx-2 ${s < step ? "bg-success" : "bg-foreground/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Starting Location */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Where are you starting from?
              </h2>

              {/* Search input */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError(null);
                  }}
                  placeholder="Enter your starting location..."
                  className="flex-1 bg-surface border border-card-border rounded-lg px-4 py-2 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent"
                  disabled={isDisabled}
                />
                <button
                  type="submit"
                  disabled={isDisabled || !searchQuery.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSearching ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  Search
                </button>
              </form>

              {/* Use my location button */}
              <button
                onClick={handleUseMyLocation}
                disabled={isDisabled}
                className="w-full py-2 border border-card-border rounded-lg text-foreground/70 hover:bg-foreground/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isLocating ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                Use my current location
              </button>

              {/* Error message */}
              {searchError && (
                <div className="mt-4 bg-error/20 border border-error/50 rounded-lg px-4 py-2 text-sm text-error">
                  {searchError}
                </div>
              )}
            </div>

            {/* Map with draggable pin (only shows after location is selected) */}
            {startLocation && (
              <div className="bg-card border border-card-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{startLocation.name || "Selected Location"}</h3>
                    <p className="text-xs text-foreground/50">
                      {startLocation.lat.toFixed(4)}, {startLocation.lng.toFixed(4)}
                    </p>
                  </div>
                  <span className="text-xs text-foreground/50">Drag pin to adjust</span>
                </div>

                <StartingLocationMap
                  center={[startLocation.lat, startLocation.lng]}
                  onMarkerDrag={handleMarkerDrag}
                />
              </div>
            )}

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!startLocation}
              className="w-full py-3 bg-accent hover:bg-accent/90 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 2: Weather Forecast */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                When should you go?
              </h2>

              {isLoadingWeather ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 animate-spin text-foreground/40" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-3 text-foreground/60">Loading forecast...</span>
                </div>
              ) : weather.length === 0 ? (
                <p className="text-foreground/50 text-sm">Unable to load weather data</p>
              ) : (
                <div className="space-y-3">
                  {weather.map((day) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const isSelected = selectedDate === day.date;
                    const isBestDay = weather.every((d) => d.stargazingScore <= day.stargazingScore);

                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={`w-full p-4 rounded-lg border transition-all text-left ${
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-card-border hover:border-foreground/20 hover:bg-foreground/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-medium">{dayName}</div>
                              <div className="text-xs text-foreground/50">{dateStr}</div>
                            </div>

                            {/* Stargazing score bar */}
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-foreground/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    day.stargazingScore >= 70 ? "bg-success" :
                                    day.stargazingScore >= 40 ? "bg-warning" : "bg-error"
                                  }`}
                                  style={{ width: `${day.stargazingScore}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium min-w-[32px] ${
                                day.stargazingScore >= 70 ? "text-success" :
                                day.stargazingScore >= 40 ? "text-warning" : "text-error"
                              }`}>
                                {day.stargazingScore}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Weather indicators */}
                            <div className="flex items-center gap-2 text-xs text-foreground/50">
                              <span title="Cloud cover">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                                {day.cloudCover}%
                              </span>
                              {day.precipitation > 0 && (
                                <span className="text-blue-400" title="Precipitation">
                                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  </svg>
                                  {day.precipitation}mm
                                </span>
                              )}
                            </div>

                            {isBestDay && (
                              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                                Best
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expanded details when selected */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-card-border">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-foreground/50 text-xs mb-1">Cloud Layers</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Low</span>
                                    <span>{day.cloudCoverLow}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Mid</span>
                                    <span>{day.cloudCoverMid}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">High</span>
                                    <span>{day.cloudCoverHigh}%</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="text-foreground/50 text-xs mb-1">Sun Times</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Sunset</span>
                                    <span>{new Date(day.sunset).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Sunrise</span>
                                    <span>{new Date(day.sunrise).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-card-border rounded-lg text-foreground/70 hover:bg-foreground/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate}
                className="flex-1 py-3 bg-accent hover:bg-accent/90 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Placeholder */}
        {step === 3 && (
          <div className="bg-card border border-card-border rounded-lg p-6">
            <h2 className="font-medium mb-3">Step 3: What to See</h2>
            <p className="text-foreground/50 text-sm mb-4">
              Coming soon: Celestial events and objects visible on your selected night
            </p>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-card-border rounded-lg text-foreground/70 hover:bg-foreground/5 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background p-8 flex items-center justify-center">
          <div className="text-foreground/60">Loading...</div>
        </main>
      }
    >
      <PlanContent />
    </Suspense>
  );
}
