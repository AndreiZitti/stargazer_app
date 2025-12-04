import { GeocodedLocation } from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(
  address: string
): Promise<GeocodedLocation | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": "Stargazer/1.0 (stargazing spot finder)",
      },
    });

    if (!response.ok) {
      console.error("Geocoding failed:", response.status);
      return null;
    }

    const results = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        "User-Agent": "Stargazer/1.0 (stargazing spot finder)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
