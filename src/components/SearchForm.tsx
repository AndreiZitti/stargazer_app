"use client";

import { useState } from "react";

interface SearchFormProps {
  onSearch: (lat: number, lng: number) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to find location");
        return;
      }

      onSearch(data.lat, data.lng);
    } catch {
      setError("Failed to search. Please try again.");
    }
  };

  const handleGeolocation = () => {
    setError(null);
    setIsGeolocating(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSearch(position.coords.latitude, position.coords.longitude);
        setIsGeolocating(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Please enter an address instead."
            : "Could not get your location. Please enter an address."
        );
        setIsGeolocating(false);
      }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={handleGeolocation}
        disabled={isLoading || isGeolocating}
        className="w-full mb-4 px-4 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isGeolocating ? "Getting location..." : "Use my location"}
      </button>

      <div className="text-center text-foreground/60 mb-4">or</div>

      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter city or address..."
          className="flex-1 px-4 py-3 bg-card border border-card-border rounded-lg focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-error text-sm text-center">{error}</p>
      )}
    </div>
  );
}
