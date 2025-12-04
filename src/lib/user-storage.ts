import { UserData, UserProfile, SavedPlace } from "./types";

const STORAGE_KEY = "stargazer_user_data";

const DEFAULT_USER_DATA: UserData = {
  profile: {
    name: "Stargazer",
    createdAt: new Date().toISOString(),
    lastVisit: new Date().toISOString(),
  },
  savedPlaces: [],
};

/**
 * Load user data from localStorage
 */
export function loadUserData(): UserData {
  if (typeof window === "undefined") {
    return DEFAULT_USER_DATA;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Initialize with defaults
      saveUserData(DEFAULT_USER_DATA);
      return DEFAULT_USER_DATA;
    }

    const data = JSON.parse(stored) as UserData;

    // Update last visit
    data.profile.lastVisit = new Date().toISOString();
    saveUserData(data);

    return data;
  } catch (error) {
    console.error("Failed to load user data:", error);
    return DEFAULT_USER_DATA;
  }
}

/**
 * Save user data to localStorage
 */
export function saveUserData(data: UserData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save user data:", error);
  }
}

/**
 * Update user profile
 */
export function updateProfile(profile: Partial<UserProfile>): UserData {
  const data = loadUserData();
  data.profile = { ...data.profile, ...profile };
  saveUserData(data);
  return data;
}

/**
 * Add a saved place
 */
export function addSavedPlace(place: Omit<SavedPlace, "id" | "savedAt">): UserData {
  const data = loadUserData();

  const newPlace: SavedPlace = {
    ...place,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  data.savedPlaces.unshift(newPlace); // Add to beginning
  saveUserData(data);
  return data;
}

/**
 * Remove a saved place
 */
export function removeSavedPlace(id: string): UserData {
  const data = loadUserData();
  data.savedPlaces = data.savedPlaces.filter((p) => p.id !== id);
  saveUserData(data);
  return data;
}

/**
 * Update a saved place
 */
export function updateSavedPlace(id: string, updates: Partial<SavedPlace>): UserData {
  const data = loadUserData();
  const index = data.savedPlaces.findIndex((p) => p.id === id);
  if (index !== -1) {
    data.savedPlaces[index] = { ...data.savedPlaces[index], ...updates };
    saveUserData(data);
  }
  return data;
}

/**
 * Check if a place is saved (by coordinates)
 */
export function isPlaceSaved(lat: number, lng: number): boolean {
  const data = loadUserData();
  // Consider places within ~100m as the same
  const threshold = 0.001;
  return data.savedPlaces.some(
    (p) => Math.abs(p.lat - lat) < threshold && Math.abs(p.lng - lng) < threshold
  );
}

/**
 * Find a saved place by coordinates
 */
export function findSavedPlace(lat: number, lng: number): SavedPlace | undefined {
  const data = loadUserData();
  const threshold = 0.001;
  return data.savedPlaces.find(
    (p) => Math.abs(p.lat - lat) < threshold && Math.abs(p.lng - lng) < threshold
  );
}
