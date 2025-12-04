"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserData, UserProfile, SavedPlace } from "@/lib/types";
import {
  loadUserData,
  saveUserData,
  addSavedPlace as addPlace,
  removeSavedPlace as removePlace,
  updateSavedPlace as updatePlace,
  isPlaceSaved as checkPlaceSaved,
  findSavedPlace as findPlace,
} from "@/lib/user-storage";

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addSavedPlace: (place: Omit<SavedPlace, "id" | "savedAt">) => void;
  removeSavedPlace: (id: string) => void;
  updateSavedPlace: (id: string, updates: Partial<SavedPlace>) => void;
  isPlaceSaved: (lat: number, lng: number) => boolean;
  findSavedPlace: (lat: number, lng: number) => SavedPlace | undefined;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data on mount
  useEffect(() => {
    const data = loadUserData();
    setUserData(data);
    setIsLoading(false);
  }, []);

  const handleUpdateProfile = (profile: Partial<UserProfile>) => {
    if (!userData) return;
    const updated = { ...userData, profile: { ...userData.profile, ...profile } };
    saveUserData(updated);
    setUserData(updated);
  };

  const handleAddSavedPlace = (place: Omit<SavedPlace, "id" | "savedAt">) => {
    const updated = addPlace(place);
    setUserData(updated);
  };

  const handleRemoveSavedPlace = (id: string) => {
    const updated = removePlace(id);
    setUserData(updated);
  };

  const handleUpdateSavedPlace = (id: string, updates: Partial<SavedPlace>) => {
    const updated = updatePlace(id, updates);
    setUserData(updated);
  };

  const handleIsPlaceSaved = (lat: number, lng: number): boolean => {
    return checkPlaceSaved(lat, lng);
  };

  const handleFindSavedPlace = (lat: number, lng: number): SavedPlace | undefined => {
    return findPlace(lat, lng);
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        isLoading,
        updateProfile: handleUpdateProfile,
        addSavedPlace: handleAddSavedPlace,
        removeSavedPlace: handleRemoveSavedPlace,
        updateSavedPlace: handleUpdateSavedPlace,
        isPlaceSaved: handleIsPlaceSaved,
        findSavedPlace: handleFindSavedPlace,
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
