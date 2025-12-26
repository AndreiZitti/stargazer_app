"use client";

import { useState } from "react";
import Link from "next/link";
import { DeepSkyObject, MeteorShower } from "@/lib/types";
import CelestialCalendar from "./CelestialCalendar";
import FeaturedDSOCard from "./FeaturedDSOCard";

// Featured DSOs with local images
const FEATURED_DSO_IMAGES: Record<string, string> = {
  M31: "/data/Andromeda.jpg",
  M1: "/data/Crab Nebula Mosaic.webp",
  M42: "/data/OrionNebula.webp",
  M45: "/data/Pleiades.jpg",
  M78: "/data/M78.jpg",
  B33: "/data/HorseHead.jpg",
};

interface SkyGuideProps {
  month: "December" | "January";
  year: number;
  daysInMonth: number;
  dsos: DeepSkyObject[];
  showers: MeteorShower[];
  moonData: {
    newMoon: string;
    fullMoon: { date: string; name: string };
    darkSkyWindows: { start: string; end: string; quality: string }[];
  };
  otherMonth: "December" | "January";
}

// Color palette for meteor showers
const SHOWER_COLORS: Record<string, string> = {
  geminids: "#f59e0b",
  ursids: "#8b5cf6",
  quadrantids: "#06b6d4",
  perseids: "#ec4899",
  leonids: "#84cc16",
  orionids: "#f97316",
  taurids: "#ef4444",
  default: "#6366f1",
};

// Icons
const Icons = {
  nebula: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" className="fill-purple-400/30" />
      <ellipse cx="12" cy="12" rx="8" ry="5" className="stroke-purple-400/60" />
      <ellipse cx="12" cy="12" rx="5" ry="8" className="stroke-blue-400/40" />
    </svg>
  ),
  galaxy: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" className="stroke-amber-400/60" />
      <ellipse cx="12" cy="12" rx="6" ry="2.5" transform="rotate(-30 12 12)" className="stroke-amber-300/80" />
      <circle cx="12" cy="12" r="1.5" className="fill-amber-200" />
    </svg>
  ),
  cluster: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="1.5" className="fill-blue-300" />
      <circle cx="9" cy="11" r="1" className="fill-blue-200" />
      <circle cx="15" cy="11" r="1.2" className="fill-blue-300" />
      <circle cx="10" cy="14" r="0.8" className="fill-blue-200" />
      <circle cx="14" cy="15" r="1" className="fill-blue-300" />
      <circle cx="12" cy="12" r="1.3" className="fill-blue-400" />
    </svg>
  ),
  meteor: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l16 16" className="stroke-yellow-400" />
      <path d="M4 4l3 1" className="stroke-yellow-300/60" />
      <path d="M4 4l1 3" className="stroke-yellow-300/60" />
      <circle cx="18" cy="18" r="2" className="fill-orange-400 stroke-orange-300" />
    </svg>
  ),
  moon: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
        className="fill-slate-300"
      />
    </svg>
  ),
  star: (
    <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  binoculars: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="16" r="4" />
      <circle cx="18" cy="16" r="4" />
      <path d="M6 12V4h4v8M18 12V4h-4v8M10 16h4" />
    </svg>
  ),
  telescope: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 3L10 14M6 18l-4 4M14 10l4-4M10 14l-4 4M3 21l4-4" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  back: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
};

function getTypeIcon(typeShort: string) {
  switch (typeShort) {
    case 'EN':
    case 'RN':
    case 'DN':
    case 'SNR':
    case 'PN':
      return Icons.nebula;
    case 'Gal':
      return Icons.galaxy;
    case 'OC':
    case 'OC+OC':
      return Icons.cluster;
    case '**':
      return Icons.star;
    default:
      return Icons.star;
  }
}

function getEquipmentIcon(equipment: string) {
  switch (equipment) {
    case 'naked_eye':
      return Icons.eye;
    case 'binoculars':
      return Icons.binoculars;
    default:
      return Icons.telescope;
  }
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'bg-success/20 text-success';
    case 'moderate':
      return 'bg-warning/20 text-warning';
    case 'challenging':
      return 'bg-error/20 text-error';
    default:
      return 'bg-foreground/10 text-foreground/60';
  }
}

function DSOCard({ dso, month, year }: { dso: DeepSkyObject; month: string; year: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSkyView, setShowSkyView] = useState(false);

  // Build Stellarium URL for this DSO
  const getStellariumUrl = () => {
    const skysourceId = dso.stellarium?.skysource_id || dso.id;
    const fov = dso.stellarium?.default_fov || 30;

    // Set to 10 PM on the 15th of the month
    const monthNum = month === "December" ? 12 : 1;
    const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-15T22:00`;

    // Use production Stellarium (has proper CORS for API)
    const url = new URL(`https://stellarium-web.org/skysource/${encodeURIComponent(skysourceId)}`);
    url.searchParams.set("date", dateStr);
    url.searchParams.set("lat", "48");
    url.searchParams.set("lng", "11");
    url.searchParams.set("fov", String(fov));

    return url.toString();
  };

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-accent/50 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            {getTypeIcon(dso.physical.type_short)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-lg">{dso.names.primary}</h3>
              <span className="text-sm text-foreground/40">{dso.id}</span>
            </div>
            <p className="text-sm text-foreground/60">{dso.physical.type} in {dso.physical.constellation}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyStyle(dso.visibility.difficulty)}`}>
              {dso.visibility.difficulty}
            </span>
            <div className="text-foreground/40" title={dso.visibility.equipment_minimum.replace('_', ' ')}>
              {getEquipmentIcon(dso.visibility.equipment_minimum)}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-card-border/50 pt-5">
          <p className="text-foreground/80 leading-relaxed">{dso.science.short_description}</p>

          {/* Sky View Button and Iframe */}
          <div className="space-y-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSkyView(!showSkyView);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20" strokeDasharray="4 4" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              <span>{showSkyView ? "Hide Sky View" : "View in Night Sky"}</span>
            </button>

            {showSkyView && (
              <div className="rounded-lg overflow-hidden border border-card-border">
                <div className="bg-card-border/30 px-3 py-2 text-xs text-foreground/60 flex items-center justify-between">
                  <span>{month} 15, {year} at 10:00 PM - Central Europe</span>
                  <a
                    href={getStellariumUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Open fullscreen
                  </a>
                </div>
                <iframe
                  src={getStellariumUrl()}
                  className="w-full border-0"
                  style={{ height: "400px" }}
                  allow="fullscreen"
                  title={`Sky view of ${dso.names.primary}`}
                />
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-foreground/40 font-medium">How to Find It</h4>
              <p className="text-sm text-foreground/70 leading-relaxed">{dso.finding.naked_eye_guide}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-foreground/40 font-medium">What You&apos;ll See</h4>
              <div className="space-y-2">
                {dso.observation.naked_eye !== "Not visible" && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-foreground/40 shrink-0">{Icons.eye}</span>
                    <span className="text-foreground/70">{dso.observation.naked_eye}</span>
                  </div>
                )}
                <div className="flex gap-2 text-sm">
                  <span className="text-foreground/40 shrink-0">{Icons.binoculars}</span>
                  <span className="text-foreground/70">{dso.observation.binoculars}</span>
                </div>
              </div>
            </div>
          </div>

          {dso.science.interesting_facts.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-foreground/80">
                <span className="text-accent font-medium">Did you know?</span> {dso.science.interesting_facts[0]}
              </p>
            </div>
          )}

          {dso.physical.magnitude_visual && (
            <div className="flex gap-6 text-sm text-foreground/50">
              <span>Magnitude: {dso.physical.magnitude_visual}</span>
              {dso.physical.size_arcmin && <span>Size: {dso.physical.size_arcmin}&apos;</span>}
              <span>Distance: {dso.physical.distance_ly.toLocaleString()} ly</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to get active period days for a month
function getActivePeriodForMonth(
  start: string,
  end: string,
  targetMonth: string,
  daysInMonth: number
): { start: number; end: number } | null {
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const targetIdx = monthNames.indexOf(targetMonth.toLowerCase().slice(0, 3));
  if (targetIdx === -1) return null;

  const startMonth = monthNames.findIndex((m) => start.toLowerCase().includes(m));
  const endMonth = monthNames.findIndex((m) => end.toLowerCase().includes(m));

  if (startMonth === -1 || endMonth === -1) return null;

  const startDay = parseInt(start.match(/(\d+)/)?.[1] || "1");
  const endDay = parseInt(end.match(/(\d+)/)?.[1] || String(daysInMonth));

  // Check if target month is in range
  const isInRange =
    startMonth <= endMonth
      ? targetIdx >= startMonth && targetIdx <= endMonth
      : targetIdx >= startMonth || targetIdx <= endMonth;

  if (!isInRange) return null;

  // Calculate start/end days for this month
  let activeStart = 1;
  let activeEnd = daysInMonth;

  if (targetIdx === startMonth) {
    activeStart = startDay;
  }
  if (targetIdx === endMonth) {
    activeEnd = endDay;
  }

  return { start: activeStart, end: activeEnd };
}

export default function SkyGuide({ month, year, daysInMonth, dsos, showers, moonData, otherMonth }: SkyGuideProps) {
  const otherMonthPath = `/${otherMonth.toLowerCase()}`;

  // Format data for CelestialCalendar
  const calendarMoonPhases = {
    newMoon: new Date(moonData.newMoon).getDate(),
    fullMoon: new Date(moonData.fullMoon.date).getDate(),
    fullMoonName: moonData.fullMoon.name,
  };

  const calendarShowers = showers
    .map((shower) => {
      const activePeriod = getActivePeriodForMonth(
        shower.active_period.start,
        shower.active_period.end,
        month,
        daysInMonth
      );

      if (!activePeriod) return null;

      return {
        id: shower.id,
        name: shower.name,
        peakDate: shower.peak_date,
        activeStart: activePeriod.start,
        activeEnd: activePeriod.end,
        zhr: shower.zhr,
        color: SHOWER_COLORS[shower.id] || SHOWER_COLORS.default,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Calculate current day if viewing current month
  const today = new Date();
  const currentMonthIdx = month === "December" ? 11 : 0;
  const isCurrentMonth = today.getMonth() === currentMonthIdx && today.getFullYear() === year;
  const currentDay = isCurrentMonth ? today.getDate() : undefined;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
          >
            {Icons.back}
            <span>Back to Map</span>
          </Link>
          <Link
            href={otherMonthPath}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <span>{otherMonth} Guide</span>
            {Icons.arrow}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-card to-background border-b border-card-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{month} {year}</h1>
          <p className="text-xl text-foreground/60">Night Sky Guide for Europe</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Celestial Calendar */}
        <section>
          <CelestialCalendar
            month={month}
            year={year}
            daysInMonth={daysInMonth}
            moonPhases={calendarMoonPhases}
            meteorShowers={calendarShowers}
            currentDay={currentDay}
          />
        </section>


        {/* Deep Sky Objects */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">{Icons.nebula}</div>
            <h2 className="text-2xl font-semibold">Deep Sky Objects</h2>
          </div>

          <p className="text-foreground/60 mb-6">
            The best nebulae, galaxies, and star clusters visible this month. Click any object to learn how to find and observe it.
          </p>

          {/* Featured DSOs with images */}
          {dsos.some((dso) => FEATURED_DSO_IMAGES[dso.id]) && (
            <div className="mb-8">
              <h4 className="text-sm uppercase tracking-wider text-foreground/40 font-medium mb-4">Featured This Month</h4>
              <div className="grid md:grid-cols-2 gap-6">
                {dsos
                  .filter((dso) => FEATURED_DSO_IMAGES[dso.id])
                  .map((dso) => (
                    <FeaturedDSOCard
                      key={dso.id}
                      dso={dso}
                      imagePath={FEATURED_DSO_IMAGES[dso.id]}
                      month={month}
                      year={year}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Other DSOs */}
          <h4 className="text-sm uppercase tracking-wider text-foreground/40 font-medium mb-4">More Objects to Explore</h4>
          <div className="space-y-4">
            {dsos
              .filter((dso) => !FEATURED_DSO_IMAGES[dso.id])
              .map((dso) => (
                <DSOCard key={dso.id} dso={dso} month={month} year={year} />
              ))}
          </div>
        </section>

        {/* Footer nav */}
        <div className="flex justify-center pt-8 border-t border-card-border">
          <Link
            href={otherMonthPath}
            className="flex items-center gap-2 px-6 py-3 bg-card border border-card-border rounded-lg hover:border-accent transition-colors"
          >
            <span>View {otherMonth} Guide</span>
            {Icons.arrow}
          </Link>
        </div>
      </div>
    </main>
  );
}
