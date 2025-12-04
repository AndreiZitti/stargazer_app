"use client";

import { useState } from "react";
import Link from "next/link";

export default function StellariumPage() {
  const [location, setLocation] = useState({ lat: 48, lng: 11 }); // Default: Central Europe

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

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-card-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Map</span>
          </Link>
          <h1 className="text-lg font-semibold">Night Sky Viewer</h1>
          <Link
            href="/december"
            className="text-accent hover:text-accent/80 transition-colors"
          >
            December Guide
          </Link>
        </div>
      </div>

      {/* Stellarium iframe - full remaining height */}
      <div className="flex-1 relative">
        <iframe
          src={getStellariumUrl()}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen"
          title="Stellarium Night Sky Viewer"
        />
      </div>
    </main>
  );
}
