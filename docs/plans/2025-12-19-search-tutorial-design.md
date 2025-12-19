# Search Autocomplete & Tutorial Feature Design

**Date:** 2025-12-19
**Status:** Approved

## Overview

Two improvements to the Stargazer app:
1. **Google Places Autocomplete** - Better search with suggestions as you type
2. **Interactive Tutorial** - Guided tour of key UI elements for new users

---

## Feature 1: Google Places Autocomplete

### Current State
The app uses OpenStreetMap Nominatim - user types a query, presses enter, gets a single result. No suggestions while typing.

### New Behavior
- As user types (2+ chars, 300ms debounce), dropdown shows up to 5 place suggestions
- Each suggestion shows place name and secondary text (city, country)
- User clicks suggestion or uses arrow keys + Enter to select
- On selection, fetch coordinates via Google Places Details API and center map
- Session tokens group autocomplete + details calls for billing efficiency
- Falls back to Nominatim if Google API fails or no key configured

### UI Changes to MapSearchBar
- Same pill-shaped input design
- Dropdown below with subtle shadow, matching dark card style
- Selected item gets subtle highlight
- Loading spinner in dropdown while fetching

---

## Feature 2: Interactive Tutorial

### Visual Design
- Semi-transparent dark backdrop (~40% opacity) covers screen
- Spotlight region around highlighted element is transparent with soft glow (box-shadow accent color)
- Tooltip card positioned near highlighted element (auto-positions to avoid edges)
- Tooltip contains: title, description, step indicator (e.g., "2 of 5"), navigation buttons

### Navigation
- "Next" and "Back" buttons (Back hidden on first step)
- "Skip" link to exit early
- Click backdrop to advance
- Arrow keys (Left/Right) navigate, Escape skips
- Ends after last step with "Got it!" confirmation

### Tutorial Steps

| Step | Element | Title | Description |
|------|---------|-------|-------------|
| 1 | Search bar | "Search for a location" | "Type a city or place name to find it on the map. We'll show suggestions as you type." |
| 2 | Location pin popup | "Find Dark Skies" | "Click 'Find Dark Skies' to discover stargazing spots at 10km, 50km, and 150km from your location." |
| 3 | Sidebar toggle | "Your Saved Places" | "Open the sidebar to see your saved spots. Click the star on any location to save it." |
| 4 | Sky Viewer link | "Sky Viewer" | "See what's visible in the night sky right now with an interactive star map." |
| 5 | December Guide link | "Monthly Sky Guide" | "Check out celestial events and what to observe this month." |

### Help Button
- Position: Top-right corner, before Sky Viewer link
- Style: Same card style as existing links
- Icon: Question mark (?)
- On click: Starts tutorial from step 1

### First-Visit Prompt
- Small tooltip near help button: "New here? Take a quick tour"
- "Take tour" and "Maybe later" options
- Appears 1 second after onboarding modal closes
- Only shows once (stored in localStorage)

---

## Technical Implementation

### New Files
- `src/components/TutorialOverlay.tsx` - Spotlight tutorial component
- `src/components/TutorialPrompt.tsx` - "Take a tour?" tooltip
- `src/components/HelpButton.tsx` - Question mark button

### Modified Files
- `src/components/MapSearchBar.tsx` - Add Google Places autocomplete dropdown
- `src/lib/geocode.ts` - Add Google Places API functions
- `src/app/page.tsx` - Add HelpButton, TutorialOverlay, state management, data-tutorial attributes
- `.env.local` - Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Key Technical Details
- Tutorial uses `data-tutorial="step-name"` attributes on elements
- `getBoundingClientRect()` calculates spotlight position
- Recalculates on window resize
- Google Places uses vanilla fetch (no SDK needed)
- Session tokens are UUIDs, regenerated after each selection

### No New Dependencies
Using vanilla fetch for Google APIs and CSS for spotlight effects.

---

## Configuration

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Google Places API free tier: 10,000 calls/month (sufficient for personal use).
