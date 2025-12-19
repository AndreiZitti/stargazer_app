"use client";

import { useEffect, useState } from "react";

interface TutorialPromptProps {
  onStartTour: () => void;
  onDismiss: () => void;
}

export default function TutorialPrompt({ onStartTour, onDismiss }: TutorialPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in after a short delay
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const handleStartTour = () => {
    setIsExiting(true);
    setTimeout(onStartTour, 200);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[1002] transition-all duration-200 ${
        isVisible && !isExiting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="bg-card/98 backdrop-blur-sm border border-card-border rounded-xl shadow-xl p-4 max-w-xs">
        {/* Arrow pointing to help button area */}
        <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-card-border" />
        <div className="absolute -left-[7px] top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-card" />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">New here?</p>
            <p className="text-xs text-foreground/60 mb-3">Take a quick tour to learn how to find the best stargazing spots.</p>
            <div className="flex gap-2">
              <button
                onClick={handleStartTour}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                Take tour
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
