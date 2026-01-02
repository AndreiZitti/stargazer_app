"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";
import { SavedPlace } from "@/lib/types";
import CloudForecastModal from "./CloudForecastModal";

interface UserSidebarProps {
  onPlaceClick?: (place: SavedPlace) => void;
}

export default function UserSidebar({ onPlaceClick }: UserSidebarProps) {
  const { user, isAuthenticated, signOut, profile, savedPlaces, isLoading, updateProfile, removeSavedPlace } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState<"places" | "profile">("places");
  const [cloudForecast, setCloudForecast] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  if (isLoading) {
    return null;
  }

  const handleEditName = () => {
    setEditName(profile.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      updateProfile({ name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleDeletePlace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Remove this saved place?")) {
      removeSavedPlace(id);
    }
  };

  return (
    <>
      {/* Toggle button - fixed position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-tutorial="sidebar-toggle"
        className="fixed top-4 left-4 z-[1001] bg-card/95 backdrop-blur-sm border border-card-border rounded-lg p-2.5 shadow-lg hover:bg-foreground/5 transition-colors"
        title={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-card/98 backdrop-blur-md border-r border-card-border shadow-xl z-[1000] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col pt-16">
          {/* Header with user info */}
          <div className="px-4 pb-4 border-b border-card-border">
            <div className="flex items-center gap-3">
              {isAuthenticated && user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent font-medium">
                    {isAuthenticated && user?.email
                      ? user.email.charAt(0).toUpperCase()
                      : profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="flex-1 bg-surface border border-card-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-success hover:text-success/80"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[140px]">
                      {isAuthenticated && user?.user_metadata?.full_name
                        ? user.user_metadata.full_name
                        : isAuthenticated && user?.email
                        ? user.email.split("@")[0]
                        : profile.name}
                    </span>
                    {!isAuthenticated && (
                      <button
                        onClick={handleEditName}
                        className="text-foreground/40 hover:text-foreground/60"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-foreground/50">
                  {savedPlaces.length} saved place{savedPlaces.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-card-border">
            <button
              onClick={() => setActiveTab("places")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "places"
                  ? "text-accent border-b-2 border-accent"
                  : "text-foreground/60 hover:text-foreground/80"
              }`}
            >
              Saved Places
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-accent border-b-2 border-accent"
                  : "text-foreground/60 hover:text-foreground/80"
              }`}
            >
              Profile
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "places" && (
              <div className="p-4">
                {savedPlaces.length === 0 ? (
                  <div className="text-center py-8 text-foreground/50">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">No saved places yet</p>
                    <p className="text-xs mt-1">Click the star on any spot to save it</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedPlaces.map((place) => (
                      <div
                        key={place.id}
                        className="w-full text-left p-3 rounded-lg border border-card-border hover:bg-foreground/5 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <button
                            onClick={() => onPlaceClick?.(place)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="font-medium text-sm truncate">{place.name}</div>
                            <div className="text-xs text-foreground/50 mt-0.5">
                              {place.label && <span className="mr-2">{place.label} Sky</span>}
                              {place.bortle && <span>Bortle {place.bortle}</span>}
                            </div>
                            <div className="text-xs text-foreground/40 mt-1">
                              Saved {new Date(place.savedAt).toLocaleDateString()}
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            {/* Cloud forecast button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCloudForecast({
                                  lat: place.lat,
                                  lng: place.lng,
                                  name: place.name,
                                });
                              }}
                              className="p-1.5 text-foreground/30 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Cloud forecast"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="p-4 space-y-4">
                <div className="bg-surface rounded-lg p-4">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-2">Display Name</div>
                  <div className="flex items-center justify-between">
                    <span>{profile.name}</span>
                    <button
                      onClick={handleEditName}
                      className="text-xs text-accent hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="bg-surface rounded-lg p-4">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-2">Statistics</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Saved Places</span>
                      <span>{savedPlaces.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Member Since</span>
                      <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-lg p-4">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-2">Account</div>
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="text-sm text-foreground/70">
                        Signed in as {user?.email}
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="w-full py-2 px-4 text-sm bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground/70">
                        Sign in to sync your saved places across devices.
                      </p>
                      <Link
                        href="/login"
                        className="block w-full py-2 px-4 text-sm text-center bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                      >
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="border-t border-card-border p-4 space-y-2">
            <Link
              href="/stellarium"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                <path strokeLinecap="round" strokeWidth={1.5} d="M2 12h20" />
              </svg>
              <span className="text-sm">Sky Viewer</span>
            </Link>
            <Link
              href="/december"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-sm">December Guide</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[999]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Cloud Forecast Modal */}
      {cloudForecast && (
        <CloudForecastModal
          isOpen={!!cloudForecast}
          onClose={() => setCloudForecast(null)}
          lat={cloudForecast.lat}
          lng={cloudForecast.lng}
          placeName={cloudForecast.name}
        />
      )}
    </>
  );
}
