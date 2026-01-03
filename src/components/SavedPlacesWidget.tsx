"use client";

import { useState, useEffect, useRef } from "react";
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
  const { savedPlaces, isLoading, getWeather, fetchWeather, updateSavedPlace, removeSavedPlace } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingPlaceId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPlaceId]);

  const startEditing = (place: SavedPlace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlaceId(place.id);
    setEditName(place.name);
  };

  const saveEdit = (placeId: string) => {
    if (editName.trim()) {
      updateSavedPlace(placeId, { name: editName.trim() });
    }
    setEditingPlaceId(null);
  };

  const cancelEdit = () => {
    setEditingPlaceId(null);
    setEditName("");
  };

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
                const isEditing = editingPlaceId === place.id;

                return (
                  <div key={place.id} className="px-3 py-2.5 hover:bg-foreground/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => saveEdit(place.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(place.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="text-sm font-medium bg-foreground/10 border border-accent/50 rounded px-1.5 py-0.5 w-full outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            onClick={() => handlePlaceClick(place)}
                            className="text-sm font-medium truncate text-left hover:text-accent transition-colors"
                          >
                            {place.name}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isEditing && (
                          <button
                            onClick={(e) => startEditing(place, e)}
                            className="p-1 text-foreground/30 hover:text-foreground/60 transition-colors"
                            title="Edit name"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        {cloud !== undefined && (
                          <span className={`text-sm font-medium ${getCloudColor(cloud)}`}>
                            {cloud}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlaceClick(place)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/50 ml-5">
                        <span className="truncate">{place.address || place.label || `Bortle ${place.bortle}`}</span>
                        {distance !== null && <span className="flex-shrink-0">· {distance}km</span>}
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
                const isEditing = editingPlaceId === place.id;

                return (
                  <div
                    key={place.id}
                    className="px-4 py-3 hover:bg-foreground/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => saveEdit(place.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(place.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="font-medium bg-foreground/10 border border-accent/50 rounded px-2 py-1 w-full outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            onClick={() => handlePlaceClick(place)}
                            className="font-medium truncate text-left hover:text-accent transition-colors"
                          >
                            {place.name}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isEditing && (
                          <button
                            onClick={(e) => startEditing(place, e)}
                            className="p-1.5 text-foreground/30 hover:text-foreground/60 transition-colors"
                            title="Edit name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Remove this saved place?")) {
                              removeSavedPlace(place.id);
                            }
                          }}
                          className="p-1.5 text-foreground/30 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        {cloud !== undefined && (
                          <span className={`font-medium ${getCloudColor(cloud)}`}>
                            {cloud}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlaceClick(place)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mt-1 text-sm text-foreground/50 ml-6">
                        <span className="truncate">{place.address || place.label || `Bortle ${place.bortle}`}</span>
                        {distance !== null && <span className="flex-shrink-0">· {distance}km</span>}
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
