"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MapComponent from "@/components/Map";
import MapSearchBar from "@/components/MapSearchBar";
import UserSidebar from "@/components/UserSidebar";
import OnboardingModal from "@/components/OnboardingModal";
import SaveToast from "@/components/SaveToast";
import TutorialOverlay, { TutorialStep } from "@/components/TutorialOverlay";
import TutorialPrompt from "@/components/TutorialPrompt";
import HelpButton from "@/components/HelpButton";
import SpotSearchModal from "@/components/SpotSearchModal";
import { ScoredSpot, Coordinates, AccessibilityFeature, SavedPlace, SpotSearchResult } from "@/lib/types";

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
    target: "sidebar-toggle",
    title: "Saved Places",
    description: "View and manage your saved spots.",
  },
  {
    target: "sky-viewer",
    title: "Sky Viewer",
    description: "Interactive star map for tonight.",
  },
  {
    target: "sky-guide",
    title: "Sky Guide",
    description: "Monthly celestial events.",
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

  const handleSavedPlaceClick = (place: SavedPlace) => {
    // Center map on the saved place
    setMapCenter([place.lat, place.lng]);
    setMapZoom(12);
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
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {/* User Sidebar */}
      <UserSidebar onPlaceClick={handleSavedPlaceClick} />

      {/* Top Right Links */}
      <div className="fixed top-4 right-4 z-[1001] flex gap-2">
        <HelpButton onClick={handleStartTutorial} />
        <Link
          href="/stellarium"
          data-tutorial="sky-viewer"
          className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-3 py-2.5 shadow-lg hover:bg-foreground/5 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            <path strokeLinecap="round" strokeWidth={1.5} d="M2 12h20" />
          </svg>
          <span className="text-sm font-medium">Sky Viewer</span>
        </Link>
        <Link
          href="/december"
          data-tutorial="sky-guide"
          className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-3 py-2.5 shadow-lg hover:bg-foreground/5 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-sm font-medium">December Guide</span>
        </Link>
      </div>

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
      {(isSearching || searchResults.length > 0) && (
        <div className="absolute top-16 right-4 z-[1000] w-80">
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <h3 className="font-medium text-sm">Best Stargazing Spots</h3>
              {!isSearching && (
                <button
                  onClick={() => setSearchResults([])}
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
              <div className="p-6 text-center text-foreground/60 text-sm">
                No spots found in this area
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

      {/* Floating Search Bar - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <MapSearchBar onSearch={handleSearch} isLoading={false} />
          {searchLocation && !showSpots && (
            <button
              data-tutorial="find-spots"
              onClick={() => handleFindSpots(searchLocation)}
              disabled={isLoadingSpots}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium rounded-full px-4 py-3 shadow-lg transition-colors flex items-center gap-2"
            >
              {isLoadingSpots ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Searching...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-sm">Find Dark Skies</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Layer Controls - hover to reveal */}
        <div className="group relative">
          {/* Collapsed state - layers icon */}
          <div className="flex items-center justify-center py-1.5 px-3 cursor-pointer opacity-50 group-hover:opacity-0 transition-opacity duration-200">
            <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          {/* Expanded state - full controls */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg p-3 min-w-[280px]">

              {/* Base Map Selection */}
              <div className="mb-3">
                <div className="text-xs text-foreground/50 mb-1.5 uppercase tracking-wide">Base Map</div>
                <div className="flex gap-1">
                  {[
                    { id: 'dark', label: 'Dark' },
                    { id: 'stadia', label: 'Stadia' },
                    { id: 'satellite', label: 'Satellite' },
                    { id: 'osm', label: 'OSM' },
                  ].map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => setBaseLayer(layer.id as BaseLayer)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        baseLayer === layer.id
                          ? 'bg-accent text-white'
                          : 'bg-foreground/10 hover:bg-foreground/20 text-foreground/70'
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Light Pollution Overlays */}
              <div className="mb-3">
                <div className="text-xs text-foreground/50 mb-1.5 uppercase tracking-wide">Light Pollution</div>
                <div className="flex gap-1">
                  {[
                    { id: '2024', label: '2024' },
                    { id: '2022', label: '2022' },
                    { id: 'nasa', label: 'NASA' },
                  ].map((overlay) => (
                    <button
                      key={overlay.id}
                      onClick={() => toggleOverlay(overlay.id as PollutionOverlay)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        activeOverlays.includes(overlay.id as PollutionOverlay)
                          ? 'bg-purple-500 text-white'
                          : 'bg-foreground/10 hover:bg-foreground/20 text-foreground/70'
                      }`}
                    >
                      {overlay.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="text-xs text-foreground/50 mb-1.5 uppercase tracking-wide">Overlay Opacity</div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-xs text-foreground/60 w-8">{Math.round(overlayOpacity * 100)}%</span>
                </div>
              </div>

            </div>
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
    </main>
  );
}
