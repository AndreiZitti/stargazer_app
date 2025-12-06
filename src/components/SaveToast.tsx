"use client";

import { useEffect, useState } from "react";

interface SaveToastProps {
  placeName: string;
  lat: number;
  lng: number;
  onPlanTrip: () => void;
  onDismiss: () => void;
}

export default function SaveToast({
  placeName,
  onPlanTrip,
  onDismiss,
}: SaveToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handlePlanTrip = () => {
    setIsVisible(false);
    setTimeout(() => {
      onPlanTrip();
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="bg-card border border-card-border rounded-lg shadow-xl p-4 flex items-center gap-4 min-w-[280px]">
        <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{placeName} saved!</div>
          <button
            onClick={handlePlanTrip}
            className="text-accent hover:underline text-sm"
          >
            Plan a trip here?
          </button>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-foreground/40 hover:text-foreground/60 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
