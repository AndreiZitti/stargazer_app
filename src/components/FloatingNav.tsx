"use client";

import Link from "next/link";

interface FloatingNavProps {
  onSavedClick: () => void;
}

export default function FloatingNav({ onSavedClick }: FloatingNavProps) {
  return (
    <nav className="fixed top-4 left-4 z-[1001] bg-card/90 backdrop-blur-sm border border-card-border rounded-full shadow-lg flex items-center">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-3 py-2 text-foreground/70 hover:text-foreground transition-colors border-r border-card-border"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-xs font-medium">Map</span>
      </Link>
      <Link
        href="/guide"
        className="flex items-center gap-1.5 px-3 py-2 text-foreground/70 hover:text-foreground transition-colors border-r border-card-border"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span className="text-xs font-medium">Guide</span>
      </Link>
      <button
        onClick={onSavedClick}
        className="flex items-center gap-1.5 px-3 py-2 text-foreground/70 hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="text-xs font-medium">Saved</span>
      </button>
    </nav>
  );
}
