"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { SavedPlace } from "@/lib/types";

interface SavedPlacesWidgetProps {
  onPlaceClick?: (place: SavedPlace) => void;
  userLocation?: { lat: number; lng: number } | null;
}

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

// Get color based on cloud coverage
function getCloudColor(cloudPercent: number | undefined): string {
  if (cloudPercent === undefined) return "text-foreground/40";
  if (cloudPercent <= 20) return "text-green-400";
  if (cloudPercent <= 40) return "text-lime-400";
  if (cloudPercent <= 60) return "text-yellow-400";
  if (cloudPercent <= 80) return "text-orange-400";
  return "text-red-400";
}

export default function SavedPlacesWidget({ onPlaceClick, userLocation }: SavedPlacesWidgetProps) {
  const { savedPlaces, isLoading, getWeather, fetchWeather, updateSavedPlace } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  // Fetch weather for places with autoLoadWeather
  useEffect(() => {
    if (isLoading) return;
    savedPlaces
      .filter((p) => p.autoLoadWeather)
      .slice(0, 5)
      .forEach((place) => {
        const cached = getWeather(place.lat, place.lng);
        if (!cached) {
          fetchWeather(place.lat, place.lng);
        }
      });
  }, [savedPlaces, isLoading, getWeather, fetchWeather]);

  if (isLoading || savedPlaces.length === 0) {
    return null;
  }

  // Sort by distance if user location available, otherwise by savedAt
  const sortedPlaces = [...savedPlaces].sort((a, b) => {
    if (userLocation) {
      const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    }
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  const displayPlaces = sortedPlaces.slice(0, 3);

  const handlePlaceClick = (place: SavedPlace) => {
    onPlaceClick?.(place);
    setIsExpanded(false);
    setShowAllModal(false);
  };

  // Get current cloud coverage for a place
  const getCloudCoverage = (place: SavedPlace): number | undefined => {
    const cached = getWeather(place.lat, place.lng);
    if (!cached) return undefined;
    // Get current hour's cloud coverage
    const now = new Date();
    const currentHour = cached.forecast.hours.find((h) => {
      const hourTime = new Date(h.time);
      return hourTime >= now;
    });
    return currentHour?.cloudTotal;
  };

  return (
    <>
      {/* Floating Widget */}
      <div className="fixed bottom-20 left-4 z-[1000]">
        {isExpanded ? (
          // Expanded state
          <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden w-64">
            {/* Header */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full px-3 py-2 flex items-center justify-between border-b border-card-border hover:bg-foreground/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="text-sm font-medium">Saved Places</span>
              </div>
              <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Places list */}
            <div className="divide-y divide-card-border">
              {displayPlaces.map((place) => {
                const cloud = getCloudCoverage(place);
                const distance = userLocation
                  ? getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
                  : null;

                return (
                  <div key={place.id} className="px-3 py-2.5 hover:bg-foreground/5 transition-colors">
                    <button
                      onClick={() => handlePlaceClick(place)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-sm font-medium truncate">{place.name}</span>
                        </div>
                        {cloud !== undefined && (
                          <span className={`text-sm font-medium ${getCloudColor(cloud)}`}>
                            {cloud}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/50">
                        <span>{place.label || `Bortle ${place.bortle}`}</span>
                        {distance !== null && <span>· {distance}km</span>}
                      </div>
                    </button>
                    {/* Auto-load toggle */}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-foreground/40">Auto weather</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSavedPlace(place.id, { autoLoadWeather: !place.autoLoadWeather });
                        }}
                        className={`relative w-7 h-3.5 rounded-full transition-colors ${
                          place.autoLoadWeather ? "bg-accent" : "bg-foreground/20"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                            place.autoLoadWeather ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View all button */}
            {savedPlaces.length > 3 && (
              <button
                onClick={() => setShowAllModal(true)}
                className="w-full px-3 py-2 text-xs text-accent hover:bg-accent/10 transition-colors border-t border-card-border"
              >
                View all {savedPlaces.length} places →
              </button>
            )}
          </div>
        ) : (
          // Collapsed state
          <button
            onClick={() => setIsExpanded(true)}
            className="bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-3 py-2 shadow-lg hover:bg-foreground/5 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">{savedPlaces.length} saved</span>
          </button>
        )}
      </div>

      {/* View All Modal */}
      {showAllModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[1200]"
            onClick={() => setShowAllModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-[1201] bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
              <h2 className="font-semibold">All Saved Places</h2>
              <button
                onClick={() => setShowAllModal(false)}
                className="p-1 hover:bg-foreground/10 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-card-border">
              {sortedPlaces.map((place) => {
                const cloud = getCloudCoverage(place);
                const distance = userLocation
                  ? getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
                  : null;

                return (
                  <div
                    key={place.id}
                    className="px-4 py-3 hover:bg-foreground/5 transition-colors"
                  >
                    <button
                      onClick={() => handlePlaceClick(place)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="font-medium truncate">{place.name}</span>
                        </div>
                        {cloud !== undefined && (
                          <span className={`font-medium ${getCloudColor(cloud)}`}>
                            {cloud}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-foreground/50">
                        <span>{place.label || `Bortle ${place.bortle}`}</span>
                        {distance !== null && <span>· {distance}km</span>}
                      </div>
                    </button>
                    {/* Auto-load toggle */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-card-border/50">
                      <span className="text-xs text-foreground/50">Auto-load weather</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSavedPlace(place.id, { autoLoadWeather: !place.autoLoadWeather });
                        }}
                        className={`relative w-8 h-4 rounded-full transition-colors ${
                          place.autoLoadWeather ? "bg-accent" : "bg-foreground/20"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                            place.autoLoadWeather ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
