"use client";

import { useState, useEffect } from "react";
import MapComponent from "@/components/Map";
import MapSearchBar from "@/components/MapSearchBar";
import OnboardingModal from "@/components/OnboardingModal";
import SaveToast from "@/components/SaveToast";
import TutorialOverlay, { TutorialStep } from "@/components/TutorialOverlay";
import TutorialPrompt from "@/components/TutorialPrompt";
import HelpButton from "@/components/HelpButton";
import SpotSearchModal from "@/components/SpotSearchModal";
import BottomTabBar from "@/components/BottomTabBar";

import CloudForecastModal from "@/components/CloudForecastModal";
import { LocationSheet, LocationData } from "@/components/LocationSheet";
import DirectionsPanel from "@/components/DirectionsPanel";
import { ScoredSpot, Coordinates, SpotSearchResult } from "@/lib/types";

// Tutorial steps configuration
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: "search",
    title: "Search",
    description: "Find any location on the map.",
  },
  {
    target: "find-spots",
    title: "Find Dark Skies",
    description: "Discover stargazing spots nearby.",
  },
  {
    target: "bottom-tabs",
    title: "Navigation",
    description: "Switch between Map, Sky Viewer, Guide, and Saved Places.",
  },
];

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
    name: string;
    distance: number;
  };
}

type BaseLayer = 'dark' | 'stadia' | 'satellite' | 'osm';
type PollutionOverlay = '2024' | '2022' | 'nasa';

export default function Home() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.1351, 11.582]);
  const [mapZoom, setMapZoom] = useState(6);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);

  // Layer controls
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('dark');
  const [activeOverlays, setActiveOverlays] = useState<PollutionOverlay[]>(['2024']);

  const toggleOverlay = (overlay: PollutionOverlay) => {
    setActiveOverlays(prev =>
      prev.includes(overlay)
        ? prev.filter(o => o !== overlay)
        : [...prev, overlay]
    );
  };

  // Search location for pin
  const [searchLocation, setSearchLocation] = useState<Coordinates | null>(null);

  // Stargazing spots state
  const [spots, setSpots] = useState<ScoredSpot[]>([]);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [showSpots, setShowSpots] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [animatePin, setAnimatePin] = useState(false);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  // Save toast state
  const [saveToast, setSaveToast] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);



  // Spot search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState<Coordinates | null>(null);
  const [searchResults, setSearchResults] = useState<SpotSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRadius, setSearchRadius] = useState<number>(40); // km
  const [hasSearched, setHasSearched] = useState(false); // Track if a search was performed

  // LocationSheet state
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // CloudForecastModal state
  const [forecastLocation, setForecastLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Directions state
  const [showDirections, setShowDirections] = useState(false);
  const [directionsDestination, setDirectionsDestination] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Check if user has completed onboarding
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("stargazer_onboarded");
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }
  }, []);

  // Show tutorial prompt after onboarding closes (if not already prompted)
  useEffect(() => {
    if (!showOnboarding) {
      const hasBeenPrompted = localStorage.getItem("stargazer_tutorial_prompted");
      if (!hasBeenPrompted) {
        // Show prompt after a short delay
        const timer = setTimeout(() => {
          setShowTutorialPrompt(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [showOnboarding]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }
      // "/" to focus search (when not already in an input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartTutorial = () => {
    setShowTutorialPrompt(false);
    setShowTutorial(true);
    localStorage.setItem("stargazer_tutorial_prompted", "true");
  };

  const handleDismissTutorialPrompt = () => {
    setShowTutorialPrompt(false);
    localStorage.setItem("stargazer_tutorial_prompted", "true");
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
  };

  const handleSearch = (lat: number, lng: number, name?: string) => {
    setMapCenter([lat, lng]);
    setMapZoom(10);
    setLocationName(name || null);
    setSearchLocation({ lat, lng });
    setShowSpots(false);
    setSpots([]);
  };

  const handleFindSpots = (coords: Coordinates) => {
    setSearchOrigin(coords);
    setShowSearchModal(true);
  };

  const handleSpotClick = (spot: ScoredSpot) => {
    setMapCenter([spot.lat, spot.lng]);
    setMapZoom(12);
  };

  const handleRightClick = async (coords: Coordinates): Promise<ContextMenuSpot | null> => {
    try {
      const response = await fetch(`/api/spot-info?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await response.json();

      return {
        lat: coords.lat,
        lng: coords.lng,
        loading: false,
        bortle: data.bortle,
        label: data.label,
        score: data.score,
        hasRoadAccess: data.hasRoadAccess,
        nearestFeature: data.nearestFeature,
      };
    } catch (err) {
      console.error("Failed to fetch spot info:", err);
      return {
        lat: coords.lat,
        lng: coords.lng,
        loading: false,
      };
    }
  };

  // Handler for map marker clicks - opens LocationSheet
  const handleMarkerClick = (location: LocationData) => {
    setSelectedLocation(location);
  };

  // Handler for opening forecast from LocationSheet
  const handleOpenForecast = (lat: number, lng: number) => {
    setForecastLocation({ lat, lng });
  };

  // Handler for find spots from LocationSheet
  const handleFindSpotsFromSheet = (lat: number, lng: number) => {
    setSearchOrigin({ lat, lng });
    setShowSearchModal(true);
  };

  // Handler for get directions from LocationSheet
  const handleGetDirections = (lat: number, lng: number, name?: string) => {
    setDirectionsDestination({ lat, lng, name });
    setShowDirections(true);
  };

  // Handler for route calculated
  const handleRouteCalculated = (route: { coordinates: [number, number][]; distance: number; duration: number }) => {
    setRouteCoordinates(route.coordinates);
  };

  // Handler to close directions
  const handleCloseDirections = () => {
    setShowDirections(false);
    setRouteCoordinates([]);
  };

  const handleOnboardingComplete = (lat: number, lng: number, name?: string) => {
    localStorage.setItem("stargazer_onboarded", "true");
    setShowOnboarding(false);
    setMapCenter([lat, lng]);
    setMapZoom(10);
    setLocationName(name || null);
    setSearchLocation({ lat, lng });
    setAnimatePin(true);

    // Reset animation flag after animation completes
    setTimeout(() => setAnimatePin(false), 4000);
  };

  const handleSpotSearch = async (maxDistanceKm: number, hasCar: boolean) => {
    if (!searchOrigin) return;

    setSearchRadius(maxDistanceKm);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/find-spots?lat=${searchOrigin.lat}&lng=${searchOrigin.lng}&maxDistance=${maxDistanceKm}&hasCar=${hasCar}`
      );
      const data = await response.json();
      setSearchResults(data.spots || []);

      // Center map on search origin
      setMapCenter([searchOrigin.lat, searchOrigin.lng]);
      setMapZoom(9);
    } catch (err) {
      console.error("Failed to search for spots:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="h-screen w-screen relative overflow-hidden pb-14">
      
      {/* Fullscreen Map */}
      <MapComponent
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        overlayOpacity={overlayOpacity}
        baseLayer={baseLayer}
        activeOverlays={activeOverlays}
        searchLocation={searchLocation}
        spots={spots}
        onSpotClick={handleSpotClick}
        isLoadingSpots={isLoadingSpots}
        onRightClick={handleRightClick}
        onFindSpots={handleFindSpots}
        animatePin={animatePin}
        searchResults={searchResults}
        searchOrigin={searchOrigin}
        isSearching={isSearching}
        searchRadius={searchRadius}
        onLocationSelect={handleMarkerClick}
        routeCoordinates={routeCoordinates}
      />


      {/* Spots Results Panel */}
      {showSpots && (
        <div className="absolute top-16 right-4 z-[1000] w-72">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <h3 className="font-medium text-sm">Dark Sky Spots</h3>
              <button
                onClick={() => setShowSpots(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoadingSpots ? (
                <div className="p-4 text-center text-foreground/60 text-sm">
                  Searching for dark skies...
                </div>
              ) : spots.length === 0 ? (
                <div className="p-4 text-center text-foreground/60 text-sm">
                  No spots found nearby
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {spots.map((spot) => (
                    <div
                      key={spot.radius}
                      onClick={() => handleSpotClick(spot)}
                      className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Within {spot.radius}km</span>
                        <span className="text-xs text-foreground/60">{spot.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-foreground/60">
                          {spot.accessibilityFeatures?.[0]?.name || `Bortle ${spot.bortle}`}
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-accent hover:underline"
                        >
                          Directions
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Panel */}
      {(isSearching || (hasSearched && searchResults.length >= 0)) && (
        <div className="absolute top-16 right-4 z-[1000] w-80">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <h3 className="font-medium text-sm">Best Stargazing Spots</h3>
              {!isSearching && (
                <button
                  onClick={() => {
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {isSearching ? (
              <div className="p-6 flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-foreground/60">Searching for dark skies...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-foreground/40 mb-2">
                  <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm font-medium text-foreground/70 mb-1">No accessible spots found</div>
                <div className="text-xs text-foreground/50">Try increasing the search distance or exploring a different area</div>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.lat}-${result.lng}`}
                    onClick={() => {
                      setMapCenter([result.lat, result.lng]);
                      setMapZoom(12);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg font-bold">{result.score.toFixed(1)}<span className="text-xs text-foreground/50 font-normal"> / 10</span></span>
                          <span className="text-xs text-foreground/60">{result.distanceKm} km away</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/60">{result.label}</span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-accent hover:underline"
                          >
                            Directions
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location indicator - Top Center */}
      {locationName && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground/80">{locationName}</span>
          </div>
        </div>
      )}

      {/* Floating Search Bar - Bottom Center (above tab bar) */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000]">
        <MapSearchBar onSearch={handleSearch} isLoading={false} />
      </div>

      {/* Map Layer Controls - Top Right */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Base Map Selector */}
        <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg p-1.5 flex gap-1">
          {[
            { id: 'dark', label: 'Dark', icon: '🌙' },
            { id: 'satellite', label: 'Sat', icon: '🛰️' },
            { id: 'osm', label: 'Map', icon: '🗺️' },
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setBaseLayer(layer.id as BaseLayer)}
              className={`px-2 py-1.5 text-xs rounded transition-all flex items-center gap-1 ${
                baseLayer === layer.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'hover:bg-foreground/10 text-foreground/70'
              }`}
              title={layer.label}
            >
              <span>{layer.icon}</span>
              <span className="hidden sm:inline">{layer.label}</span>
            </button>
          ))}
        </div>

        {/* Light Pollution Toggle & Opacity */}
        <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg p-2">
          {/* Overlay toggles */}
          <div className="flex gap-1 mb-2">
            {[
              { id: '2024', label: "'24" },
              { id: '2022', label: "'22" },
              { id: 'nasa', label: 'NASA' },
            ].map((overlay) => (
              <button
                key={overlay.id}
                onClick={() => toggleOverlay(overlay.id as PollutionOverlay)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  activeOverlays.includes(overlay.id as PollutionOverlay)
                    ? 'bg-purple-500 text-white'
                    : 'bg-foreground/10 hover:bg-foreground/20 text-foreground/60'
                }`}
              >
                {overlay.label}
              </button>
            ))}
          </div>

          {/* Opacity slider */}
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-foreground/40" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-20 accent-purple-500"
            />
            <span className="text-xs text-foreground/50 w-7">{Math.round(overlayOpacity * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onLocationSelect={handleOnboardingComplete}
          onClose={() => {
            localStorage.setItem("stargazer_onboarded", "true");
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Save Toast */}
      {saveToast && (
        <SaveToast
          placeName={saveToast.name}
          lat={saveToast.lat}
          lng={saveToast.lng}
          onPlanTrip={() => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${saveToast.lat},${saveToast.lng}`, '_blank');
          }}
          onDismiss={() => setSaveToast(null)}
        />
      )}

      {/* Tutorial Prompt */}
      {showTutorialPrompt && (
        <TutorialPrompt
          onStartTour={handleStartTutorial}
          onDismiss={handleDismissTutorialPrompt}
        />
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        steps={TUTORIAL_STEPS}
        isActive={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />

      {/* Spot Search Modal */}
      <SpotSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSpotSearch}
      />

      {/* Bottom Tab Bar */}
      <div data-tutorial="bottom-tabs">
        <BottomTabBar />
      </div>

      {/* Location Sheet */}
      <LocationSheet
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
        onFindSpots={handleFindSpotsFromSheet}
        onOpenForecast={handleOpenForecast}
        onGetDirections={handleGetDirections}
        userLocation={searchLocation}
      />

      {/* Directions Panel */}
      {showDirections && directionsDestination && (
        <DirectionsPanel
          destination={directionsDestination}
          origin={searchLocation}
          onClose={handleCloseDirections}
          onRouteCalculated={handleRouteCalculated}
        />
      )}

      {/* Cloud Forecast Modal */}
      <CloudForecastModal
        isOpen={forecastLocation !== null}
        lat={forecastLocation?.lat ?? 0}
        lng={forecastLocation?.lng ?? 0}
        onClose={() => setForecastLocation(null)}
      />
    </main>
  );
}
