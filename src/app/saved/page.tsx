"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";
import { useTrips } from "@/hooks/useTrips";
import { SavedPlace, Trip, TripTarget } from "@/lib/types";
import BottomTabBar from "@/components/BottomTabBar";

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

function getWeatherIcon(cloudCover: number) {
  if (cloudCover < 20) return { icon: "☀️", label: "Clear" };
  if (cloudCover < 40) return { icon: "🌤", label: "Mostly Clear" };
  if (cloudCover < 60) return { icon: "⛅", label: "Partly Cloudy" };
  if (cloudCover < 80) return { icon: "🌥", label: "Mostly Cloudy" };
  return { icon: "☁️", label: "Cloudy" };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ============ Place Card ============
interface PlaceCardProps {
  place: SavedPlace;
  userLocation: { lat: number; lng: number } | null;
  onNavigate: () => void;
  onDelete: () => void;
  onFetchWeather: () => void;
  isLoadingWeather: boolean;
}

function PlaceCard({ place, userLocation, onNavigate, onDelete, onFetchWeather, isLoadingWeather }: PlaceCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const distance = userLocation
    ? getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : null;

  const weather = place.lastWeather?.forecast;
  const weatherAge = place.lastWeather
    ? Math.round((Date.now() - new Date(place.lastWeather.fetchedAt).getTime()) / (1000 * 60))
    : null;

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 text-left hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="font-medium truncate">{place.name}</h3>
            </div>
            {place.label && (
              <p className="text-sm text-foreground/60 mt-1">{place.label}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50">
              {place.bortle && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Bortle {place.bortle}
                </span>
              )}
              {distance !== null && <span>{distance} km away</span>}
            </div>
          </div>
          {weather && (
            <div className="text-right flex-shrink-0">
              <div className="text-2xl">{getWeatherIcon(weather.hours[0]?.cloudTotal ?? 100).icon}</div>
              <div className="text-xs text-foreground/50 mt-1">
                {weatherAge !== null && weatherAge < 60
                  ? `${weatherAge}m ago`
                  : weatherAge !== null
                  ? `${Math.round(weatherAge / 60)}h ago`
                  : ""}
              </div>
            </div>
          )}
          <svg
            className={`w-5 h-5 text-foreground/40 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showDetails && (
        <div className="border-t border-card-border">
          <div className="p-4 border-b border-card-border/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground/70">Weather Forecast</h4>
              <button
                onClick={onFetchWeather}
                disabled={isLoadingWeather}
                className="text-xs text-accent hover:text-accent/80 disabled:opacity-50"
              >
                {isLoadingWeather ? "Loading..." : "Refresh"}
              </button>
            </div>
            {weather ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weather.hours.slice(0, 12).map((hour, i) => {
                  const hourDate = new Date(hour.time);
                  const { icon } = getWeatherIcon(hour.cloudTotal);
                  return (
                    <div key={i} className="flex-shrink-0 text-center px-2 py-1 rounded bg-foreground/5">
                      <div className="text-xs text-foreground/50">{hourDate.getHours()}:00</div>
                      <div className="text-lg my-1">{icon}</div>
                      <div className="text-xs text-foreground/70">{hour.cloudTotal}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                onClick={onFetchWeather}
                disabled={isLoadingWeather}
                className="w-full py-3 text-sm text-foreground/60 hover:text-foreground/80 bg-foreground/5 rounded-lg"
              >
                {isLoadingWeather ? "Loading weather..." : "Load weather forecast"}
              </button>
            )}
          </div>
          {place.notes && (
            <div className="p-4 border-b border-card-border/50">
              <h4 className="text-sm font-medium text-foreground/70 mb-2">Notes</h4>
              <p className="text-sm text-foreground/60">{place.notes}</p>
            </div>
          )}
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={onNavigate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View on Map
            </button>
            <button onClick={onDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Trip Card ============
interface TripCardProps {
  trip: Trip;
  readOnly?: boolean;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
  onAddTarget?: (target: Omit<TripTarget, "id">) => void;
  onRemoveTarget?: (targetId: string) => void;
  onUpdateTarget?: (targetId: string, updates: Partial<TripTarget>) => void;
  onToggleLive?: () => void;
}

function TripCard({ trip, readOnly, onUpdate, onDelete, onAddTarget, onRemoveTarget, onUpdateTarget, onToggleLive }: TripCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(trip.date);
  const [editNotes, setEditNotes] = useState(trip.notes || "");
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTarget, setNewTarget] = useState({ name: "", collectionTime: "", notes: "" });
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState({ name: "", collectionTime: "", notes: "" });

  const isPast = new Date(trip.date) < new Date(new Date().toDateString());
  const totalTime = trip.targets.reduce((sum, t) => sum + (t.collectionTime || 0), 0);

  const handleSaveEdit = () => {
    onUpdate?.({
      date: editDate,
      notes: editNotes.trim() || undefined,
    });
    setEditing(false);
  };

  const handleStartEdit = () => {
    setEditDate(trip.date);
    setEditNotes(trip.notes || "");
    setEditing(true);
  };

  const handleAddTarget = () => {
    if (!newTarget.name.trim()) return;
    onAddTarget?.({
      name: newTarget.name.trim(),
      collectionTime: newTarget.collectionTime ? parseInt(newTarget.collectionTime) : undefined,
      notes: newTarget.notes.trim() || undefined,
    });
    setNewTarget({ name: "", collectionTime: "", notes: "" });
    setShowAddTarget(false);
  };

  const handleStartEditTarget = (target: TripTarget) => {
    setEditingTargetId(target.id);
    setEditTarget({
      name: target.name,
      collectionTime: target.collectionTime?.toString() || "",
      notes: target.notes || "",
    });
  };

  const handleSaveTarget = (targetId: string) => {
    onUpdateTarget?.(targetId, {
      name: editTarget.name.trim(),
      collectionTime: editTarget.collectionTime ? parseInt(editTarget.collectionTime) : undefined,
      notes: editTarget.notes.trim() || undefined,
    });
    setEditingTargetId(null);
  };

  return (
    <div className={`bg-card border rounded-lg overflow-hidden ${trip.live ? "border-green-500/50" : "border-card-border"} ${isPast ? "opacity-60" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{trip.live ? "📡" : "🗓️"}</span>
              <h3 className="font-medium truncate">{trip.location.name}</h3>
              {trip.live && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">LIVE</span>
              )}
            </div>
            <p className="text-sm text-foreground/60 mt-1">{formatDate(trip.date)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50">
              <span>{trip.targets.length} target{trip.targets.length !== 1 ? "s" : ""}</span>
              {totalTime > 0 && <span>{totalTime} min total</span>}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-card-border">
          {/* Trip details - view or edit */}
          <div className="p-4 border-b border-card-border/50">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-1.5 text-xs bg-foreground/10 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-1.5 text-xs bg-accent text-white rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  {trip.notes && <p className="text-sm text-foreground/60">{trip.notes}</p>}
                  {!trip.notes && <p className="text-sm text-foreground/40 italic">No notes</p>}
                </div>
                {!readOnly && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Targets */}
          <div className="p-4 border-b border-card-border/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground/70">Targets</h4>
              {!readOnly && (
                <button
                  onClick={() => setShowAddTarget(!showAddTarget)}
                  className="text-xs text-accent hover:text-accent/80"
                >
                  {showAddTarget ? "Cancel" : "+ Add"}
                </button>
              )}
            </div>

            {showAddTarget && (
              <div className="mb-3 p-3 bg-foreground/5 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="Target name (e.g., M42, Orion Nebula)"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Minutes"
                    value={newTarget.collectionTime}
                    onChange={(e) => setNewTarget({ ...newTarget, collectionTime: e.target.value })}
                    className="w-24 px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={newTarget.notes}
                    onChange={(e) => setNewTarget({ ...newTarget, notes: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleAddTarget}
                  disabled={!newTarget.name.trim()}
                  className="w-full py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
                >
                  Add Target
                </button>
              </div>
            )}

            {trip.targets.length === 0 ? (
              <p className="text-sm text-foreground/40 text-center py-4">No targets yet</p>
            ) : (
              <div className="space-y-2">
                {trip.targets.map((target) => (
                  editingTargetId === target.id ? (
                    <div key={target.id} className="p-2 bg-foreground/5 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={editTarget.name}
                        onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-background border border-card-border rounded"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={editTarget.collectionTime}
                          onChange={(e) => setEditTarget({ ...editTarget, collectionTime: e.target.value })}
                          className="w-20 px-2 py-1.5 text-sm bg-background border border-card-border rounded"
                        />
                        <input
                          type="text"
                          placeholder="Notes"
                          value={editTarget.notes}
                          onChange={(e) => setEditTarget({ ...editTarget, notes: e.target.value })}
                          className="flex-1 px-2 py-1.5 text-sm bg-background border border-card-border rounded"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTargetId(null)} className="flex-1 py-1 text-xs bg-foreground/10 rounded">Cancel</button>
                        <button onClick={() => handleSaveTarget(target.id)} className="flex-1 py-1 text-xs bg-accent text-white rounded">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div key={target.id} className="flex items-center gap-3 p-2 bg-foreground/5 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{target.name}</p>
                        <div className="flex items-center gap-2 text-xs text-foreground/50">
                          {target.collectionTime && <span>{target.collectionTime} min</span>}
                          {target.notes && <span className="truncate">- {target.notes}</span>}
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => handleStartEditTarget(target)}
                          className="p-1.5 text-foreground/40 hover:text-foreground/70 rounded"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => onRemoveTarget?.(target.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 flex items-center gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${trip.location.lat},${trip.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Directions
            </a>
            {!readOnly && onToggleLive && (
              <button
                onClick={onToggleLive}
                className={`p-2 rounded-lg transition-colors ${
                  trip.live ? "text-green-400 bg-green-500/10" : "text-foreground/40 hover:bg-foreground/10"
                }`}
                title={trip.live ? "Disable live sharing" : "Share trip publicly"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
                </svg>
              </button>
            )}
            {!readOnly && (
              <button onClick={onDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Add Trip Form ============
interface AddTripFormProps {
  savedPlaces: SavedPlace[];
  onAdd: (trip: { location: { name: string; lat: number; lng: number; savedPlaceId?: string }; date: string; notes?: string }) => void;
  onCancel: () => void;
}

function AddTripForm({ savedPlaces, onAdd, onCancel }: AddTripFormProps) {
  const [locationType, setLocationType] = useState<"saved" | "custom">("saved");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [customLocation, setCustomLocation] = useState({ name: "", lat: "", lng: "" });
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    let location;
    if (locationType === "saved" && selectedPlaceId) {
      const place = savedPlaces.find((p) => p.id === selectedPlaceId);
      if (!place) return;
      location = { name: place.name, lat: place.lat, lng: place.lng, savedPlaceId: place.id };
    } else if (locationType === "custom" && customLocation.name && customLocation.lat && customLocation.lng) {
      location = {
        name: customLocation.name,
        lat: parseFloat(customLocation.lat),
        lng: parseFloat(customLocation.lng),
      };
    } else {
      return;
    }

    if (!date) return;
    onAdd({ location, date, notes: notes.trim() || undefined });
  };

  const isValid =
    date &&
    ((locationType === "saved" && selectedPlaceId) ||
      (locationType === "custom" && customLocation.name && customLocation.lat && customLocation.lng));

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 space-y-4">
      <h3 className="font-medium">New Trip</h3>

      {/* Location Type */}
      <div className="flex gap-2">
        <button
          onClick={() => setLocationType("saved")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            locationType === "saved" ? "bg-accent text-white" : "bg-foreground/10 text-foreground/70"
          }`}
        >
          Saved Place
        </button>
        <button
          onClick={() => setLocationType("custom")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            locationType === "custom" ? "bg-accent text-white" : "bg-foreground/10 text-foreground/70"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Location Input */}
      {locationType === "saved" ? (
        <select
          value={selectedPlaceId}
          onChange={(e) => setSelectedPlaceId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
        >
          <option value="">Select a saved place...</option>
          {savedPlaces.map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Location name"
            value={customLocation.name}
            onChange={(e) => setCustomLocation({ ...customLocation, name: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={customLocation.lat}
              onChange={(e) => setCustomLocation({ ...customLocation, lat: e.target.value })}
              className="flex-1 px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={customLocation.lng}
              onChange={(e) => setCustomLocation({ ...customLocation, lng: e.target.value })}
              className="flex-1 px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
      />

      {/* Notes */}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 text-sm bg-background border border-card-border rounded-lg resize-none"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm bg-foreground/10 rounded-lg hover:bg-foreground/20">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          Create Trip
        </button>
      </div>
    </div>
  );
}

// ============ Main Page ============
export default function SavedPage() {
  const router = useRouter();
  const { savedPlaces, isLoading: placesLoading, removeSavedPlace, fetchWeather, user } = useUser();
  const { trips, upcomingTrips, pastTrips, publicTrips, isLoading: tripsLoading, addTrip, removeTrip, updateTrip, addTarget, removeTarget, updateTarget, toggleLive } = useTrips(user);

  const [activeTab, setActiveTab] = useState<"places" | "trips">("places");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "name">("recent");
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { signOut, isAuthenticated } = useUser();

  const isLoading = placesLoading || tripsLoading;

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Sort places
  const sortedPlaces = [...savedPlaces].sort((a, b) => {
    if (sortBy === "distance" && userLocation) {
      return getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
             getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
    }
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  const handleFetchWeather = async (place: SavedPlace) => {
    setLoadingWeather((prev) => new Set(prev).add(place.id));
    await fetchWeather(place.lat, place.lng, true);
    setLoadingWeather((prev) => {
      const next = new Set(prev);
      next.delete(place.id);
      return next;
    });
  };

  const handleAddTrip = (tripData: { location: { name: string; lat: number; lng: number; savedPlaceId?: string }; date: string; notes?: string }) => {
    addTrip(tripData);
    setShowAddTrip(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-card-border">
        {/* Top Bar with User */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-card-border/50">
          <h1 className="text-lg font-semibold">Saved</h1>

          {/* User Button */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-medium"
              >
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-10 z-20 bg-card border border-card-border rounded-lg shadow-lg py-1 min-w-[160px]">
                    <div className="px-3 py-2 text-xs text-foreground/50 border-b border-card-border">
                      {user?.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-foreground/5"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-accent hover:text-accent/80 font-medium"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setActiveTab("places")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "places"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/50 hover:text-foreground/70"
            }`}
          >
            Places
          </button>
          <button
            onClick={() => setActiveTab("trips")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "trips"
                ? "text-accent border-b-2 border-accent"
                : "text-foreground/50 hover:text-foreground/70"
            }`}
          >
            Trips
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-4 py-2">
          {activeTab === "places" ? (
            <>
              <span className="text-sm text-foreground/50">{savedPlaces.length} places</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm bg-card border border-card-border rounded-lg px-3 py-1.5 text-foreground"
              >
                <option value="recent">Recent</option>
                <option value="distance" disabled={!userLocation}>Distance</option>
                <option value="name">Name</option>
              </select>
            </>
          ) : (
            <>
              <span className="text-sm text-foreground/50">
                {isAuthenticated ? `${trips.length} trips` : `${publicTrips.length} community trips`}
              </span>
              {isAuthenticated && (
                <button
                  onClick={() => setShowAddTrip(true)}
                  className="text-sm text-accent hover:text-accent/80 font-medium"
                >
                  + New Trip
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-foreground/50">Loading...</div>
          </div>
        ) : activeTab === "places" ? (
          // Places Tab
          savedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-16 h-16 text-foreground/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h2 className="text-lg font-medium text-foreground/70 mb-2">No saved places yet</h2>
              <p className="text-sm text-foreground/50 max-w-xs">
                Right-click or long-press on the map to save your favorite stargazing spots.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
              >
                Go to Map
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  userLocation={userLocation}
                  onNavigate={() => router.push(`/?lat=${place.lat}&lng=${place.lng}&zoom=12`)}
                  onDelete={() => removeSavedPlace(place.id)}
                  onFetchWeather={() => handleFetchWeather(place)}
                  isLoadingWeather={loadingWeather.has(place.id)}
                />
              ))}
            </div>
          )
        ) : (
          // Trips Tab
          <div className="space-y-4">
            {showAddTrip && (
              <AddTripForm
                savedPlaces={savedPlaces}
                onAdd={handleAddTrip}
                onCancel={() => setShowAddTrip(false)}
              />
            )}

            {/* Public / Community trips for non-authenticated users */}
            {!isAuthenticated && publicTrips.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground/50 mb-2">Community Trips</h3>
                <div className="space-y-3">
                  {publicTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      readOnly
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground/50 mt-4 text-center">
                  Thinking about joining? Drop me a message on{" "}
                  <a href="https://t.me/Zitti123" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80">Telegram @Zitti123</a>
                </p>
              </div>
            )}

            {!isAuthenticated && publicTrips.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-5xl mb-4">🗓️</span>
                <h2 className="text-lg font-medium text-foreground/70 mb-2">No community trips</h2>
                <p className="text-sm text-foreground/50 max-w-xs">
                  Sign in to plan your own stargazing sessions.
                </p>
                <Link
                  href="/login"
                  className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Authenticated user trips */}
            {isAuthenticated && trips.length === 0 && !showAddTrip ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-5xl mb-4">🗓️</span>
                <h2 className="text-lg font-medium text-foreground/70 mb-2">No trips planned</h2>
                <p className="text-sm text-foreground/50 max-w-xs">
                  Plan your stargazing sessions with locations, dates, and targets.
                </p>
                <button
                  onClick={() => setShowAddTrip(true)}
                  className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
                >
                  Plan a Trip
                </button>
              </div>
            ) : isAuthenticated && (
              <>
                {upcomingTrips.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground/50 mb-2">Upcoming</h3>
                    <div className="space-y-3">
                      {upcomingTrips.map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          onUpdate={(updates) => updateTrip(trip.id, updates)}
                          onDelete={() => removeTrip(trip.id)}
                          onAddTarget={(target) => addTarget(trip.id, target)}
                          onRemoveTarget={(targetId) => removeTarget(trip.id, targetId)}
                          onUpdateTarget={(targetId, updates) => updateTarget(trip.id, targetId, updates)}
                          onToggleLive={() => toggleLive(trip.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pastTrips.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground/50 mb-2">Past</h3>
                    <div className="space-y-3">
                      {pastTrips.map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          onUpdate={(updates) => updateTrip(trip.id, updates)}
                          onDelete={() => removeTrip(trip.id)}
                          onAddTarget={(target) => addTarget(trip.id, target)}
                          onRemoveTarget={(targetId) => removeTarget(trip.id, targetId)}
                          onUpdateTarget={(targetId, updates) => updateTarget(trip.id, targetId, updates)}
                          onToggleLive={() => toggleLive(trip.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  );
}
