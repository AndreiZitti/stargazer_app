"use client";

import { useState } from "react";
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

export default function SavedPlacesWidget({ onPlaceClick, userLocation }: SavedPlacesWidgetProps) {
  const { savedPlaces, isLoading } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Show up to 5 places when expanded
  const displayPlaces = isExpanded ? sortedPlaces.slice(0, 5) : sortedPlaces.slice(0, 3);
  const hasMore = sortedPlaces.length > displayPlaces.length;

  const handlePlaceClick = (place: SavedPlace) => {
    onPlaceClick?.(place);
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-20 left-4 z-[1000]">
      {isExpanded ? (
        <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden w-56">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full px-3 py-2 flex items-center justify-between border-b border-card-border hover:bg-foreground/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-medium">Saved Places</span>
            </div>
            <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Places list */}
          <div className="divide-y divide-card-border/50">
            {displayPlaces.map((place) => {
              const distance = userLocation
                ? getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
                : null;

              return (
                <button
                  key={place.id}
                  onClick={() => handlePlaceClick(place)}
                  className="w-full px-3 py-2 hover:bg-foreground/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-sm font-medium truncate flex-1">{place.name}</span>
                    {distance !== null && (
                      <span className="text-xs text-foreground/40 flex-shrink-0">{distance}km</span>
                    )}
                  </div>
                  {place.label && (
                    <div className="text-xs text-foreground/50 ml-5 mt-0.5">{place.label} sky</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show more */}
          {hasMore && (
            <div className="px-3 py-1.5 text-xs text-foreground/40 text-center border-t border-card-border/50">
              +{sortedPlaces.length - displayPlaces.length} more saved
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-3 py-2 shadow-lg hover:bg-foreground/5 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-sm font-medium">{savedPlaces.length} saved</span>
        </button>
      )}
    </div>
  );
}
