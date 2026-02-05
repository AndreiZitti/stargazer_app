"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Trip, TripTarget } from "@/lib/types";

const STORAGE_KEY = "stargazer_trips";
const SYNC_DEBOUNCE_MS = 3000;

export function useTrips(user: User | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Track pending changes for debounced sync
  const pendingSync = useRef<Trip[] | null>(null);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): Trip[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save to localStorage (immediate)
  const saveToLocalStorage = useCallback((data: Trip[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save trips to localStorage:", err);
    }
  }, []);

  // Sync to Supabase (called after debounce)
  const syncToSupabase = useCallback(async (data: Trip[], userId: string) => {
    try {
      const { error } = await supabase
        .schema("astro")
        .from("trips")
        .upsert(
          { user_id: userId, trips: data },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Failed to sync trips to Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase trips sync error:", err);
    }
  }, [supabase]);

  // Schedule debounced sync to Supabase
  const scheduleDebouncedSync = useCallback((data: Trip[]) => {
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
            .from("trips")
            .select("trips")
            .eq("user_id", user.id)
            .single();

          if (!error && data?.trips) {
            const supabaseTrips = data.trips as Trip[];
            setTrips(supabaseTrips);
            saveToLocalStorage(supabaseTrips);
          } else {
            // No Supabase data, use localStorage and sync it up
            const localTrips = loadFromLocalStorage();
            setTrips(localTrips);
            if (localTrips.length > 0) {
              syncToSupabase(localTrips, user.id);
            }
          }
        } catch {
          // Fallback to localStorage on error
          const localTrips = loadFromLocalStorage();
          setTrips(localTrips);
        }
      } else {
        // Not logged in, use localStorage only
        const localTrips = loadFromLocalStorage();
        setTrips(localTrips);
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
  const updateTrips = useCallback((newTrips: Trip[]) => {
    setTrips(newTrips);
    saveToLocalStorage(newTrips);
    scheduleDebouncedSync(newTrips);
  }, [saveToLocalStorage, scheduleDebouncedSync]);

  // Add a trip
  const addTrip = useCallback((trip: Omit<Trip, "id" | "createdAt" | "targets">): Trip => {
    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      targets: [],
      createdAt: new Date().toISOString(),
    };
    const newTrips = [newTrip, ...trips];
    updateTrips(newTrips);
    return newTrip;
  }, [trips, updateTrips]);

  // Remove a trip
  const removeTrip = useCallback((id: string) => {
    const newTrips = trips.filter((t) => t.id !== id);
    updateTrips(newTrips);
  }, [trips, updateTrips]);

  // Update a trip
  const updateTrip = useCallback((id: string, updates: Partial<Trip>) => {
    const newTrips = trips.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    updateTrips(newTrips);
  }, [trips, updateTrips]);

  // Add a target to a trip
  const addTarget = useCallback((tripId: string, target: Omit<TripTarget, "id">): TripTarget => {
    const newTarget: TripTarget = {
      ...target,
      id: crypto.randomUUID(),
    };
    const newTrips = trips.map((t) =>
      t.id === tripId
        ? { ...t, targets: [...t.targets, newTarget] }
        : t
    );
    updateTrips(newTrips);
    return newTarget;
  }, [trips, updateTrips]);

  // Remove a target from a trip
  const removeTarget = useCallback((tripId: string, targetId: string) => {
    const newTrips = trips.map((t) =>
      t.id === tripId
        ? { ...t, targets: t.targets.filter((target) => target.id !== targetId) }
        : t
    );
    updateTrips(newTrips);
  }, [trips, updateTrips]);

  // Update a target in a trip
  const updateTarget = useCallback((tripId: string, targetId: string, updates: Partial<TripTarget>) => {
    const newTrips = trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            targets: t.targets.map((target) =>
              target.id === targetId ? { ...target, ...updates } : target
            ),
          }
        : t
    );
    updateTrips(newTrips);
  }, [trips, updateTrips]);

  // Toggle a trip as live (public). Only one trip can be live at a time.
  const toggleLive = useCallback(async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const wasLive = trip.live;

    // Turn off any currently live trip, then toggle this one
    const newTrips = trips.map((t) => ({
      ...t,
      live: t.id === tripId ? !wasLive : false,
    }));
    updateTrips(newTrips);

    // Sync to public_trips table
    if (!user) return;
    try {
      if (wasLive) {
        // Remove from public
        await supabase
          .schema("astro")
          .from("public_trips")
          .delete()
          .eq("user_id", user.id);
      } else {
        // Upsert to public
        const publicTrip = { ...trip, live: true };
        await supabase
          .schema("astro")
          .from("public_trips")
          .upsert(
            { user_id: user.id, trip: publicTrip },
            { onConflict: "user_id" }
          );
      }
    } catch (err) {
      console.error("Failed to toggle live trip:", err);
    }
  }, [trips, updateTrips, user, supabase]);

  // Fetch public/live trips (for unauthenticated users)
  const [publicTrips, setPublicTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const fetchPublic = async () => {
      try {
        const { data, error } = await supabase
          .schema("astro")
          .from("public_trips")
          .select("trip");

        if (!error && data) {
          setPublicTrips(data.map((d) => d.trip as Trip));
        }
      } catch {
        // Ignore
      }
    };
    fetchPublic();
  }, [supabase]);

  // Get upcoming trips (sorted by date)
  const upcomingTrips = trips
    .filter((t) => new Date(t.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get past trips
  const pastTrips = trips
    .filter((t) => new Date(t.date) < new Date(new Date().toDateString()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    trips,
    upcomingTrips,
    pastTrips,
    publicTrips,
    isLoading,
    addTrip,
    removeTrip,
    updateTrip,
    addTarget,
    removeTarget,
    updateTarget,
    toggleLive,
    flushSync,
  };
}
