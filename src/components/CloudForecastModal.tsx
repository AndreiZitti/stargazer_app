"use client";

import { useState, useEffect } from "react";
import { CloudForecast, CloudRating } from "@/lib/types";

interface CloudForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  placeName?: string;
}

const RATING_COLORS: Record<CloudRating, string> = {
  excellent: "#22c55e",
  great: "#84cc16",
  good: "#eab308",
  poor: "#f97316",
  bad: "#ef4444",
};

const RATING_LABELS: Record<CloudRating, string> = {
  excellent: "Excellent",
  great: "Great",
  good: "Good",
  poor: "Poor",
  bad: "Bad",
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function CloudForecastModal({
  isOpen,
  onClose,
  lat,
  lng,
  placeName,
}: CloudForecastModalProps) {
  const [forecast, setForecast] = useState<CloudForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lat && lng) {
      setIsLoading(true);
      setError(null);

      fetch(`/api/cloud-forecast?lat=${lat}&lng=${lng}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => setForecast(data))
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  // Group hours by date
  const hoursByDate: Record<string, CloudForecast["hours"]> = {};
  if (forecast) {
    forecast.hours.forEach((hour) => {
      const dateKey = formatDate(hour.time);
      if (!hoursByDate[dateKey]) {
        hoursByDate[dateKey] = [];
      }
      hoursByDate[dateKey].push(hour);
    });
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">48h Cloud Forecast</h2>
            {placeName && (
              <p className="text-sm text-foreground/60">{placeName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-error">
              <p>Failed to load forecast</p>
              <p className="text-sm text-foreground/60 mt-1">{error}</p>
            </div>
          )}

          {forecast && !isLoading && (
            <>
              {/* Best Windows Summary */}
              {forecast.bestWindows.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground/70 mb-3">Best Stargazing Windows</h3>
                  <div className="flex flex-wrap gap-2">
                    {forecast.bestWindows.map((window, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg border border-card-border"
                        style={{ borderLeftColor: RATING_COLORS[window.rating], borderLeftWidth: 3 }}
                      >
                        <div className="text-sm font-medium">
                          {formatDate(window.time)} {formatTime(window.time)}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {window.cloudTotal}% clouds - {RATING_LABELS[window.rating]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Forecast */}
              {Object.entries(hoursByDate).map(([date, hours]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-sm font-medium text-foreground/70 mb-3">{date}</h3>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
                    {hours.map((hour, i) => (
                      <div
                        key={i}
                        className={`relative p-1.5 rounded text-center text-xs ${
                          hour.isNight ? "bg-indigo-950/50" : "bg-foreground/5"
                        }`}
                        title={`${formatTime(hour.time)}: ${hour.cloudTotal}% clouds, ${hour.precipitation}% precip`}
                      >
                        <div className="text-[10px] text-foreground/50">
                          {formatTime(hour.time).replace(/:00/, "")}
                        </div>
                        <div
                          className="w-4 h-4 mx-auto rounded-full mt-1"
                          style={{ backgroundColor: RATING_COLORS[hour.rating] }}
                        />
                        <div className="text-[10px] mt-1">{hour.cloudTotal}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-card-border">
                {(["excellent", "great", "good", "poor", "bad"] as CloudRating[]).map((rating) => (
                  <div key={rating} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RATING_COLORS[rating] }}
                    />
                    <span className="text-xs text-foreground/60">{RATING_LABELS[rating]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
