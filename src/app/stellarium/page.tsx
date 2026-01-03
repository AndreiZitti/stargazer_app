"use client";

import { useState } from "react";
import FloatingNav from "@/components/FloatingNav";
import SavedPanel from "@/components/SavedPanel";
import { SavedPlace } from "@/lib/types";

export default function StellariumPage() {
  const [location, setLocation] = useState({ lat: 48, lng: 11 }); // Default: Central Europe
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  // Build base Stellarium URL
  const getStellariumUrl = () => {
    const now = new Date();
    // Set to 10 PM today
    now.setHours(22, 0, 0, 0);
    const dateStr = now.toISOString().slice(0, 16);

    const url = new URL("https://stellarium-web.org/");
    url.searchParams.set("date", dateStr);
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lng", String(location.lng));
    url.searchParams.set("fov", "60");

    return url.toString();
  };

  const handlePlaceClick = (place: SavedPlace) => {
    setLocation({ lat: place.lat, lng: place.lng });
    setShowSavedPanel(false);
  };

  return (
    <main className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Floating Navigation */}
      <FloatingNav onSavedClick={() => setShowSavedPanel(true)} />

      {/* Stellarium iframe - full screen */}
      <iframe
        src={getStellariumUrl()}
        className="absolute inset-0 w-full h-full border-0"
        allow="fullscreen"
        title="Stellarium Night Sky Viewer"
      />

      {/* Saved Panel */}
      <SavedPanel
        isOpen={showSavedPanel}
        onClose={() => setShowSavedPanel(false)}
        onPlaceClick={handlePlaceClick}
      />
    </main>
  );
}
