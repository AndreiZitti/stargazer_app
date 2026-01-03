"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";
import { SavedPlace } from "@/lib/types";
import NightHoursGrid from "./NightHoursGrid";

interface SavedPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceClick?: (place: SavedPlace) => void;
}

export default function SavedPanel({ isOpen, onClose, onPlaceClick }: SavedPanelProps) {
  const {
    user,
    isAuthenticated,
    signOut,
    profile,
    savedPlaces,
    isLoading,
    removeSavedPlace,
    updateSavedPlace,
    getWeather,
    fetchWeather,
  } = useUser();

  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleDeletePlace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Remove this saved place?")) {
      removeSavedPlace(id);
    }
  };

  const handleToggleAutoLoad = (e: React.MouseEvent, place: SavedPlace) => {
    e.stopPropagation();
    updateSavedPlace(place.id, { autoLoadWeather: !place.autoLoadWeather });
  };

  const handleExpandPlace = async (place: SavedPlace) => {
    if (expandedPlaceId === place.id) {
      setExpandedPlaceId(null);
      return;
    }

    setExpandedPlaceId(place.id);

    // Fetch weather if not cached
    const cached = getWeather(place.lat, place.lng);
    if (!cached) {
      setLoadingWeather((prev) => new Set(prev).add(place.id));
      await fetchWeather(place.lat, place.lng);
      setLoadingWeather((prev) => {
        const next = new Set(prev);
        next.delete(place.id);
        return next;
      });
    }
  };

  const handlePlaceClick = (place: SavedPlace) => {
    onPlaceClick?.(place);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[1100] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 z-[1101] bg-card border-t border-card-border rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAuthenticated && user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-sm font-medium">
                  {isAuthenticated && user?.email
                    ? user.email.charAt(0).toUpperCase()
                    : profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="font-medium text-sm">
                {isAuthenticated && user?.user_metadata?.full_name
                  ? user.user_metadata.full_name
                  : isAuthenticated && user?.email
                  ? user.email.split("@")[0]
                  : profile.name}
              </div>
              <div className="text-xs text-foreground/50">
                {savedPlaces.length} saved place{savedPlaces.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => signOut()}
                className="text-xs text-foreground/50 hover:text-foreground"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs text-accent hover:text-accent/80"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 100px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-6 h-6 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : savedPlaces.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="w-12 h-12 mx-auto mb-3 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-sm text-foreground/50">No saved places yet</p>
              <p className="text-xs text-foreground/40 mt-1">
                Right-click on the map to save a spot
              </p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {savedPlaces.map((place) => {
                const isExpanded = expandedPlaceId === place.id;
                const cached = getWeather(place.lat, place.lng);
                const isLoadingThis = loadingWeather.has(place.id);

                return (
                  <div key={place.id} className="group">
                    {/* Place header */}
                    <div
                      onClick={() => handleExpandPlace(place)}
                      className="w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{place.name}</div>
                          <div className="text-xs text-foreground/50 mt-0.5">
                            {place.label && <span className="mr-2">{place.label} Sky</span>}
                            {place.bortle && <span>Bortle {place.bortle}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Auto-load toggle */}
                          <button
                            onClick={(e) => handleToggleAutoLoad(e, place)}
                            className={`relative w-8 h-4 rounded-full transition-colors ${
                              place.autoLoadWeather ? "bg-accent" : "bg-foreground/20"
                            }`}
                            title={place.autoLoadWeather ? "Disable auto-load weather" : "Enable auto-load weather"}
                          >
                            <div
                              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                place.autoLoadWeather ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDeletePlace(e, place.id)}
                            className="p-1 text-foreground/30 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {/* Expand indicator */}
                          <svg
                            className={`w-4 h-4 text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-3 bg-foreground/[0.02]">
                        {isLoadingThis ? (
                          <div className="flex items-center justify-center py-4">
                            <svg className="w-5 h-5 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : cached ? (
                          <NightHoursGrid forecast={cached.forecast} />
                        ) : (
                          <div className="text-xs text-foreground/50 text-center py-2">
                            Tap to load weather
                          </div>
                        )}
                        {/* Go to location button */}
                        <button
                          onClick={() => handlePlaceClick(place)}
                          className="w-full mt-3 py-2 text-xs text-accent hover:bg-accent/10 rounded transition-colors"
                        >
                          Go to location
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
