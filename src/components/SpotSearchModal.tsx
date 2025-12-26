// src/components/SpotSearchModal.tsx
"use client";

import { useState } from "react";

interface SpotSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (maxDistanceKm: number, hasCar: boolean) => void;
}

const DISTANCE_OPTIONS = [
  { label: "15 min", km: 15 },
  { label: "30 min", km: 40 },
  { label: "1 hour", km: 80 },
  { label: "2+ hours", km: 150 },
];

export default function SpotSearchModal({
  isOpen,
  onClose,
  onSearch,
}: SpotSearchModalProps) {
  const [selectedDistance, setSelectedDistance] = useState<number>(40);
  const [hasCar, setHasCar] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSearch = () => {
    onSearch(selectedDistance, hasCar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-6">Find Your Stargazing Spot</h2>

        {/* Distance question */}
        <div className="mb-6">
          <p className="text-sm text-foreground/70 mb-3">
            How far are you willing to travel?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {DISTANCE_OPTIONS.map((option) => (
              <button
                key={option.km}
                onClick={() => setSelectedDistance(option.km)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedDistance === option.km
                    ? "bg-accent text-white border-accent"
                    : "bg-card border-card-border hover:border-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Car question */}
        <div className="mb-8">
          <p className="text-sm text-foreground/70 mb-3">
            Do you have a car?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHasCar(true)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                hasCar
                  ? "bg-accent text-white border-accent"
                  : "bg-card border-card-border hover:border-accent/50"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setHasCar(false)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                !hasCar
                  ? "bg-accent text-white border-accent"
                  : "bg-card border-card-border hover:border-accent/50"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-card-border hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Find Spots
          </button>
        </div>
      </div>
    </div>
  );
}
