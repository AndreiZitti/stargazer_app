# Bottom Tab Navigation Redesign

## Overview

Reorganize the app navigation from scattered links to a consistent bottom tab bar, making the three main features (Map, Sky Viewer, Guide) equally accessible.

## Current State

- Main page (`/`): Full-screen light pollution map
- Top-right: Sky Viewer + December Guide links (hardcoded month)
- Left sidebar: Saved places + profile (hidden behind hamburger)
- `/stellarium`: Embedded sky viewer with own bottom controls
- `/december`, `/january`: Monthly sky guides

## Design Goals

1. Primary use case: Planning stargazing trips (map-first)
2. All three features equally important, need easy access
3. Mobile-app style bottom navigation
4. Auto-detect current month for guide

---

## New Components

### 1. BottomTabBar

Fixed bottom navigation with 4 tabs.

| Tab | Icon | Label | Action |
|-----|------|-------|--------|
| 1 | Map pin | Map | Navigate to `/` |
| 2 | Globe | Sky | Navigate to `/stellarium` |
| 3 | Star | Guide | Navigate to `/guide` |
| 4 | Bookmark | Saved | Open SavedPanel |

**Specs:**
- Height: ~60px (safe area aware)
- Background: `bg-card/95 backdrop-blur-sm border-t border-card-border`
- Active tab: accent color
- Inactive: `text-foreground/50`
- Z-index: above map, below modals

**Shown on:** `/` (map), `/guide/*`
**Hidden on:** `/stellarium`

### 2. FloatingNav

Compact navigation pill for Sky page where bottom bar is hidden.

```
┌──────────────────┐
│ ← Map │ Guide │ Saved │
└──────────────────┘
```

**Specs:**
- Position: top-left corner
- Style: `bg-card/90 backdrop-blur-sm rounded-full px-3 py-2`
- Height: ~40px
- Shows icons + labels

**Shown on:** `/stellarium` only

### 3. SavedPanel

Slide-up panel replacing the sidebar.

**Behavior:**
- Slides up from bottom, covers ~60% of screen
- Drag handle at top to expand/collapse
- Dismiss by tapping outside or dragging down
- Contains: saved places list with cloud coverage preview
- Tapping a place centers map and closes panel

**Triggered from:** BottomTabBar "Saved" tab, FloatingNav "Saved" button

---

## Route Changes

### New Routes

- `/guide` → Redirects to `/guide/[current-month]`
- `/guide/january`, `/guide/february`, etc. → Monthly guide pages

### Redirects (preserve old bookmarks)

- `/december` → `/guide/december`
- `/january` → `/guide/january`

---

## Removals

1. **Top-right buttons** - Sky Viewer and December Guide links
2. **Hamburger menu** - UserSidebar component
3. **Stellarium header bar** - "Back to Map", "December Guide" links

---

## File Changes

### New Files
- `src/components/BottomTabBar.tsx`
- `src/components/FloatingNav.tsx`
- `src/components/SavedPanel.tsx`
- `src/app/guide/page.tsx` (redirect logic)
- `src/app/guide/[month]/page.tsx` (monthly content)

### Modified Files
- `src/app/page.tsx` - Remove top-right links, add BottomTabBar
- `src/app/stellarium/page.tsx` - Remove header, add FloatingNav
- `src/app/december/page.tsx` - Add redirect to `/guide/december`
- `src/app/january/page.tsx` - Add redirect to `/guide/january`

### Removed/Deprecated
- `src/components/UserSidebar.tsx` - Functionality moves to SavedPanel

---

## Visual Reference

### Map Page
```
┌─────────────────────────────────────────────────┐
│ [?]                    Munich                   │
│                                                 │
│                   (map content)                 │
│                                                 │
│              [Search] [Find Dark Skies]         │
├────────────┬────────────┬────────────┬──────────┤
│    🗺️     │     🌐     │     ⭐     │    📑    │
│   Map     │    Sky     │   Guide    │  Saved   │
└────────────┴────────────┴────────────┴──────────┘
```

### Sky Page
```
┌─────────────────────────────────────────────────┐
│ [← Map │ Guide │ Saved]                         │
│                                                 │
│              (stellarium iframe)                │
│                                                 │
│           (stellarium's own controls)           │
└─────────────────────────────────────────────────┘
```

### Saved Panel (overlay)
```
┌─────────────────────────────────────────────────┐
│                   (map dimmed)                  │
├─────────────────────────────────────────────────┤
│                 ─── (drag handle)               │
│  Saved Places                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Alps Viewpoint          [toggle] [×]    │   │
│  │ Bortle 3 · Saved Dec 15                 │   │
│  │ Cloud Coverage: [21][22][23][00][01]... │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ Dark Forest Spot        [toggle] [×]    │   │
│  │ ...                                     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```
