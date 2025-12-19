# Celestial Calendar Redesign

## Problem

Users don't understand the current calendar visualization. The horizontal timeline layout with meteor shower tracks is unfamiliar and confusing.

## Solution

Redesign as a traditional 7-day grid calendar that people immediately recognize, with moon phases as the primary visual element.

## Design

### Layout

Two-column layout:
- **Left (main)**: Traditional 7-day calendar grid showing the full month (4-5 rows)
- **Right (sidebar)**: Meteor shower legend with colors and date ranges

### Calendar Grid

**Header row**: Mon, Tue, Wed, Thu, Fri, Sat, Sun

**Day cells** contain:
- Day number (top)
- Moon phase icon (center) - existing SVG moon component
- Colored dots (bottom) - one dot per active meteor shower on that day

**Current day**: Moon icon gets a glowing halo effect to stand out

**Empty cells**: Days from previous/next month are blank or very faded

### Meteor Shower Legend (right sidebar)

Vertical list:
```
● Geminids
  Dec 4-17, peak Dec 14

● Ursids
  Dec 17-26, peak Dec 22
```

Each entry shows:
- Colored dot matching calendar dots
- Shower name
- Active date range
- Peak date

### Props Changes

New prop needed:
- `currentDay?: number` - to highlight today (optional, only highlights if viewing current month)

Removed from props:
- `darkSkyWindows` - no longer displayed

### Removed Features

- Dark sky windows (users can infer good nights from moon phase)
- Hover info panel
- Horizontal meteor shower track bars
- Shimmer animations on tracks

### Visual Reference

```
┌─────────────────────────────────────────┬──────────────────┐
│  December 2025                          │  Meteor Showers  │
├─────────────────────────────────────────┤                  │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun      │  ● Geminids      │
│   1    2    3    4    5    6    7       │    Dec 4-17      │
│   🌑   🌒   🌒   🌓   🌓   🌔   🌔      │    peak Dec 14   │
│        ●              ●                 │                  │
│                                         │  ● Ursids        │
│   8    9   10   11   12   13   14       │    Dec 17-26     │
│   🌕   🌖   🌖   🌗   🌗  [🌘]  🌘       │    peak Dec 22   │
│   ●    ●    ●    ●    ●    ●    ●       │                  │
│                       ↑                 │                  │
│                    (glows)              │                  │
└─────────────────────────────────────────┴──────────────────┘
```
