"use client";

import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onCheckSpot: () => void;
  onSearchFromHere: () => void;
  onClose: () => void;
}

export default function MapContextMenu({
  x,
  y,
  onCheckSpot,
  onSearchFromHere,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedStyle = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 100),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[2000] bg-card border border-card-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
      style={adjustedStyle}
    >
      <button
        onClick={() => {
          onCheckSpot();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Check this spot
      </button>
      <div className="border-t border-card-border" />
      <button
        onClick={() => {
          onSearchFromHere();
          onClose();
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/5 transition-colors flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Search from here
      </button>
    </div>
  );
}
