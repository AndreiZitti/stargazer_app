"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile, SavedPlace, CloudForecast } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";

const PROFILE_STORAGE_KEY = "stargazer_profile";

interface WeatherCacheEntry {
  forecast: CloudForecast;
  fetchedAt: number;
}

interface UserContextType {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  // Profile (localStorage only)
  profile: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  // Saved places (localStorage + Supabase sync)
  savedPlaces: SavedPlace[];
  isLoading: boolean;
  addSavedPlace: (place: Omit<SavedPlace, "id" | "savedAt">) => void;
  removeSavedPlace: (id: string) => void;
  updateSavedPlace: (id: string, updates: Partial<SavedPlace>) => void;
  isPlaceSaved: (lat: number, lng: number) => boolean;
  findSavedPlace: (lat: number, lng: number) => SavedPlace | undefined;
  // Weather cache (in-memory only)
  getWeather: (lat: number, lng: number) => WeatherCacheEntry | undefined;
  fetchWeather: (lat: number, lng: number) => Promise<CloudForecast | null>;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Stargazer",
  createdAt: new Date().toISOString(),
  lastVisit: new Date().toISOString(),
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [authLoading, setAuthLoading] = useState(true);

  const supabase = createClient();

  // Use the saved places hook with Supabase sync
  const {
    places: savedPlaces,
    isLoading: placesLoading,
    addPlace,
    removePlace,
    updatePlace,
    isPlaceSaved,
    findPlace,
  } = useSavedPlaces(user);

  // Weather cache (in-memory only, 30 min TTL)
  const [weatherCache, setWeatherCache] = useState<Map<string, WeatherCacheEntry>>(new Map());
  const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  const getCacheKey = useCallback((lat: number, lng: number) =>
    `${lat.toFixed(4)},${lng.toFixed(4)}`, []);

  const getWeather = useCallback((lat: number, lng: number): WeatherCacheEntry | undefined => {
    const key = getCacheKey(lat, lng);
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
      return cached;
    }
    return undefined;
  }, [weatherCache, getCacheKey]);

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<CloudForecast | null> => {
    const key = getCacheKey(lat, lng);
    try {
      const res = await fetch(`/api/cloud-forecast?lat=${lat}&lng=${lng}`);
      if (!res.ok) return null;
      const forecast: CloudForecast = await res.json();
      setWeatherCache(prev => {
        const next = new Map(prev);
        next.set(key, { forecast, fetchedAt: Date.now() });
        return next;
      });
      return forecast;
    } catch {
      return null;
    }
  }, [getCacheKey]);

  // Load auth state and profile on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Load profile from localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const loadedProfile = JSON.parse(stored) as UserProfile;
          loadedProfile.lastVisit = new Date().toISOString();
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(loadedProfile));
          setProfile(loadedProfile);
        } else {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE));
        }
      } catch {
        // Ignore errors
      }
    }

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Background fetch weather for auto-load places
  useEffect(() => {
    if (placesLoading || authLoading) return;

    // Get places with autoLoadWeather enabled, sorted by most recent
    const autoLoadPlaces = savedPlaces
      .filter(p => p.autoLoadWeather)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, 5);

    if (autoLoadPlaces.length === 0) return;

    // Defer to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      Promise.all(
        autoLoadPlaces.map(place => fetchWeather(place.lat, place.lng))
      );
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [savedPlaces, placesLoading, authLoading, fetchWeather]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <UserContext.Provider
      value={{
        // Auth
        user,
        isAuthenticated: !!user,
        signOut: handleSignOut,
        // Profile
        profile,
        updateProfile: handleUpdateProfile,
        // Saved places
        savedPlaces,
        isLoading: authLoading || placesLoading,
        addSavedPlace: addPlace,
        removeSavedPlace: removePlace,
        updateSavedPlace: updatePlace,
        isPlaceSaved,
        findSavedPlace: findPlace,
        // Weather cache
        getWeather,
        fetchWeather,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
