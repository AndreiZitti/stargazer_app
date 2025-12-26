"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile, SavedPlace } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";

const PROFILE_STORAGE_KEY = "stargazer_profile";

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
