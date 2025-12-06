"use client";

import { useState, useEffect } from "react";
import { Coordinates, TonightForecast, WeatherForecast } from "@/lib/types";
import HourlyForecast from "./HourlyForecast";

interface TripPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    lat: number;
    lng: number;
    name?: string;
    bortle?: number;
    label?: string;
  };
  startingLocation?: Coordinates & { name?: string };
  tonight?: TonightForecast | null;
}

type Tab = "tonight" | "pickDay";

export default function TripPlanModal({
  isOpen,
  onClose,
  destination,
  startingLocation,
  tonight,
}: TripPlanModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tonight");
  const [weekForecast, setWeekForecast] = useState<WeatherForecast[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch 7-day forecast when switching to pickDay tab
  useEffect(() => {
    if (activeTab === "pickDay" && weekForecast.length === 0) {
      setLoadingWeek(true);
      fetch(`/api/weather?lat=${destination.lat}&lng=${destination.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.forecasts) setWeekForecast(data.forecasts);
        })
        .finally(() => setLoadingWeek(false));
    }
  }, [activeTab, destination.lat, destination.lng, weekForecast.length]);

  if (!isOpen) return null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}${
    startingLocation ? `&origin=${startingLocation.lat},${startingLocation.lng}` : ""
  }`;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">Plan Your Trip</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setActiveTab("tonight")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "tonight"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Tonight
          </button>
          <button
            onClick={() => setActiveTab("pickDay")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "pickDay"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Pick Another Day
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Destination info - shown in both tabs */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">
                  {destination.name || `${destination.label || "Dark"} Sky Spot`}
                </div>
                <div className="text-sm text-foreground/60">
                  {destination.bortle && `Bortle ${destination.bortle} • `}
                  {destination.lat.toFixed(4)}°, {destination.lng.toFixed(4)}°
                </div>
              </div>
            </div>
          </div>

          {activeTab === "tonight" && (
            <>
              {/* Tonight's conditions */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌙</span>
                  <span className="font-medium">Tonight&apos;s Conditions</span>
                </div>

                {tonight ? (
                  <>
                    <HourlyForecast hours={tonight.hours} className="mb-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/60">{tonight.summary}</span>
                      <span className={`font-medium ${
                        tonight.overallScore >= 70 ? "text-success" :
                        tonight.overallScore >= 40 ? "text-warning" : "text-foreground/60"
                      }`}>
                        {tonight.overallScore}% clear overall
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-foreground/50 text-sm">Loading forecast...</div>
                )}
              </div>

              {/* Starting location */}
              {startingLocation && (
                <div className="mb-6 p-4 bg-foreground/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>🚗</span>
                      <span className="text-sm">
                        From: <span className="font-medium">{startingLocation.name || "Your location"}</span>
                      </span>
                    </div>
                    <button className="text-xs text-accent hover:underline">Change</button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "pickDay" && (
            <div>
              {loadingWeek ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 animate-spin text-foreground/40" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {weekForecast.slice(0, 7).map((day, idx) => {
                    const date = new Date(day.date);
                    const isSelected = selectedDay === day.date;
                    const isBest = weekForecast.slice(0, 7).every(d => d.stargazingScore <= day.stargazingScore);

                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day.date)}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-card-border hover:border-foreground/20"
                        }`}
                      >
                        <div className="text-xs text-foreground/60">
                          {idx === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" })}
                        </div>
                        <div className="text-2xl my-1">
                          {day.stargazingScore >= 70 ? "☀️" : day.stargazingScore >= 40 ? "⛅" : "☁️"}
                        </div>
                        <div className={`text-sm font-medium ${
                          day.stargazingScore >= 70 ? "text-success" :
                          day.stargazingScore >= 40 ? "text-warning" : "text-foreground/60"
                        }`}>
                          {day.stargazingScore}%
                        </div>
                        {isBest && (
                          <div className="text-xs text-success mt-1">Best</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-card-border">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white text-center font-medium rounded-lg transition-colors"
          >
            Open in Google Maps
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-card-border rounded-lg text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
