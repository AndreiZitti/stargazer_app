"use client";

import { useState } from "react";

interface DirectionsPanelProps {
  destination: { lat: number; lng: number; name?: string };
  origin?: { lat: number; lng: number } | null;
  onClose: () => void;
  onRouteCalculated: (route: {
    distance: number;
    duration: number;
    coordinates: [number, number][];
  }) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 1) {
    return `${Math.round(meters)}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

export default function DirectionsPanel({
  destination,
  origin,
  onClose,
  onRouteCalculated,
}: DirectionsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [route, setRoute] = useState<{
    distance: number;
    duration: number;
    coordinates: [number, number][];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = async () => {
    if (!origin) {
      setError("Please set your location first using the search bar or location button.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/directions?startLat=${origin.lat}&startLng=${origin.lng}&endLat=${destination.lat}&endLng=${destination.lng}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setRoute(data);
        onRouteCalculated(data);
      }
    } catch {
      setError("Failed to calculate route. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute top-16 right-4 z-[1000] w-80">
      <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Directions
          </h3>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Origin/Destination */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="flex-1 text-sm">
                <span className="text-foreground/50">From: </span>
                <span>{origin ? "Your location" : "Not set"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="flex-1 text-sm truncate">
                <span className="text-foreground/50">To: </span>
                <span>{destination.name || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}</span>
              </div>
            </div>
          </div>

          {/* Route info */}
          {route && (
            <div className="bg-surface rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{formatDuration(route.duration)}</div>
                  <div className="text-sm text-foreground/60">{formatDistance(route.distance)} by car</div>
                </div>
                <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-error bg-error/10 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={calculateRoute}
              disabled={isLoading || !origin}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </>
              ) : route ? (
                "Recalculate Route"
              ) : (
                "Get Directions"
              )}
            </button>

            {route && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-surface hover:bg-foreground/10 text-foreground font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Open in Google Maps
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
