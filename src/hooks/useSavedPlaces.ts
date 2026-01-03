"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { SavedPlace } from "@/lib/types";

const STORAGE_KEY = "stargazer_saved_places";
const SYNC_DEBOUNCE_MS = 3000;

export function useSavedPlaces(user: User | null) {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Track pending changes for debounced sync
  const pendingSync = useRef<SavedPlace[] | null>(null);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): SavedPlace[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save to localStorage (immediate)
  const saveToLocalStorage = useCallback((data: SavedPlace[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  }, []);

  // Sync to Supabase (called after debounce)
  const syncToSupabase = useCallback(async (data: SavedPlace[], userId: string) => {
    try {
      const { error } = await supabase
        .schema("astro")
        .from("saved_places")
        .upsert(
          { user_id: userId, places: data },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Failed to sync to Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase sync error:", err);
    }
  }, [supabase]);

  // Schedule debounced sync to Supabase
  const scheduleDebouncedSync = useCallback((data: SavedPlace[]) => {
    if (!user) return;

    pendingSync.current = data;

    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }

    const userId = user.id;
    syncTimeout.current = setTimeout(() => {
      if (pendingSync.current) {
        syncToSupabase(pendingSync.current, userId);
        pendingSync.current = null;
      }
    }, SYNC_DEBOUNCE_MS);
  }, [user, syncToSupabase]);

  // Flush pending sync (on unmount or before navigation)
  const flushSync = useCallback(() => {
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
      syncTimeout.current = null;
    }
    if (pendingSync.current && user) {
      syncToSupabase(pendingSync.current, user.id);
      pendingSync.current = null;
    }
  }, [user, syncToSupabase]);

  // Load data on mount / user change
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      if (user) {
        // Try Supabase first, fallback to localStorage
        try {
          const { data, error } = await supabase
            .schema("astro")
            .from("saved_places")
            .select("places")
            .eq("user_id", user.id)
            .single();

          if (!error && data?.places) {
            const supabasePlaces = data.places as SavedPlace[];
            setPlaces(supabasePlaces);
            saveToLocalStorage(supabasePlaces); // Update local cache
          } else {
            // No Supabase data, use localStorage and sync it up
            const localPlaces = loadFromLocalStorage();
            setPlaces(localPlaces);
            if (localPlaces.length > 0) {
              syncToSupabase(localPlaces, user.id);
            }
          }
        } catch {
          // Fallback to localStorage on error
          const localPlaces = loadFromLocalStorage();
          setPlaces(localPlaces);
        }
      } else {
        // Not logged in, use localStorage only
        const localPlaces = loadFromLocalStorage();
        setPlaces(localPlaces);
      }

      setIsLoading(false);
    };

    loadData();
  }, [user, supabase, loadFromLocalStorage, saveToLocalStorage, syncToSupabase]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushSync();
    };
  }, [flushSync]);

  // Update helper that handles both localStorage and Supabase
  const updatePlaces = useCallback((newPlaces: SavedPlace[]) => {
    setPlaces(newPlaces);
    saveToLocalStorage(newPlaces); // Immediate localStorage update
    scheduleDebouncedSync(newPlaces); // Debounced Supabase sync
  }, [saveToLocalStorage, scheduleDebouncedSync]);

  // Fetch address via reverse geocoding
  const fetchAddress = useCallback(async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const res = await fetch(`/api/geocode?reverse=true&lat=${lat}&lng=${lng}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.displayName || undefined;
    } catch {
      return undefined;
    }
  }, []);

  // Add a place (fetches address automatically if not provided)
  const addPlace = useCallback(async (place: Omit<SavedPlace, "id" | "savedAt">): Promise<SavedPlace> => {
    // Fetch address if not provided
    let address = place.address;
    if (!address) {
      address = await fetchAddress(place.lat, place.lng);
    }

    // Generate a default name from address if name looks like a label
    let name = place.name;
    if (address && (name.includes("/10") || name.includes("Sky") || name.includes("Bortle"))) {
      // Name looks auto-generated, use address instead
      name = address.split(",")[0] || address; // Use first part of address
    }

    const newPlace: SavedPlace = {
      ...place,
      name,
      address,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    const newPlaces = [newPlace, ...places];
    updatePlaces(newPlaces);
    return newPlace;
  }, [places, updatePlaces, fetchAddress]);

  // Remove a place
  const removePlace = useCallback((id: string) => {
    const newPlaces = places.filter((p) => p.id !== id);
    updatePlaces(newPlaces);
  }, [places, updatePlaces]);

  // Update a place
  const updatePlace = useCallback((id: string, updates: Partial<SavedPlace>) => {
    const newPlaces = places.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    updatePlaces(newPlaces);
  }, [places, updatePlaces]);

  // Check if a place is saved (by coordinates)
  const isPlaceSaved = useCallback((lat: number, lng: number): boolean => {
    const threshold = 0.001; // ~100m
    return places.some(
      (p) => Math.abs(p.lat - lat) < threshold && Math.abs(p.lng - lng) < threshold
    );
  }, [places]);

  // Find a saved place by coordinates
  const findPlace = useCallback((lat: number, lng: number): SavedPlace | undefined => {
    const threshold = 0.001;
    return places.find(
      (p) => Math.abs(p.lat - lat) < threshold && Math.abs(p.lng - lng) < threshold
    );
  }, [places]);

  return {
    places,
    isLoading,
    addPlace,
    removePlace,
    updatePlace,
    isPlaceSaved,
    findPlace,
    flushSync,
  };
}
