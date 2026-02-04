"use client";

import { useState } from "react";
import { DeepSkyObject, MeteorShower } from "@/lib/types";
import CelestialCalendar from "./CelestialCalendar";
import BottomTabBar from "./BottomTabBar";

interface SkyGuideProps {
  month: string;
  year: number;
  daysInMonth: number;
  dsos: DeepSkyObject[];
  showers: MeteorShower[];
  moonData: {
    newMoon: string;
    fullMoon: { date: string; name: string };
    darkSkyWindows: { start: string; end: string; quality: string }[];
  };
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getEquipmentLabel(equipment: string): string {
  switch (equipment) {
    case 'naked_eye': return 'Naked eye';
    case 'binoculars': return 'Binoculars';
    default: return 'Telescope';
  }
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

  const isInRange =
    startMonth <= endMonth
      ? targetIdx >= startMonth && targetIdx <= endMonth
      : targetIdx >= startMonth || targetIdx <= endMonth;

  if (!isInRange) return null;

  let activeStart = 1;
  let activeEnd = daysInMonth;

  if (targetIdx === startMonth) activeStart = startDay;
  if (targetIdx === endMonth) activeEnd = endDay;

  return { start: activeStart, end: activeEnd };
}

export default function SkyGuide({ month, year, daysInMonth, dsos, showers, moonData }: SkyGuideProps) {
  const [expandedDso, setExpandedDso] = useState<string | null>(null);

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

  // Current day calculation
  const today = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthIdx = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
  const isCurrentMonth = today.getMonth() === currentMonthIdx && today.getFullYear() === year;
  const currentDay = isCurrentMonth ? today.getDate() : undefined;

  // Best window formatting
  const bestWindow = moonData.darkSkyWindows[0];
  const bestStart = bestWindow ? formatDate(bestWindow.start) : null;
  const bestEnd = bestWindow ? formatDate(bestWindow.end) : null;

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header with highlighted month */}
      <header className="bg-gradient-to-b from-accent/20 to-background border-b border-card-border">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-foreground/50 uppercase tracking-wider mb-2">Night Sky Guide</p>
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-accent">{month}</span> {year}
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Summary Card */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Moon Phases */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌑</span>
                <div>
                  <p className="text-xs text-foreground/50">New Moon</p>
                  <p className="font-medium">{formatDate(moonData.newMoon)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌕</span>
                <div>
                  <p className="text-xs text-foreground/50">{moonData.fullMoon.name}</p>
                  <p className="font-medium">{formatDate(moonData.fullMoon.date)}</p>
                </div>
              </div>
            </div>

            {/* Best Nights */}
            <div className="border-l border-card-border pl-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⭐</span>
                <p className="text-xs text-foreground/50">Best Dark Sky Nights</p>
              </div>
              {bestStart && bestEnd ? (
                <p className="font-medium text-accent">{bestStart} - {bestEnd}</p>
              ) : (
                <p className="text-foreground/50">No optimal window</p>
              )}
              {bestWindow?.quality && (
                <p className="text-xs text-foreground/40 capitalize">{bestWindow.quality} conditions</p>
              )}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <CelestialCalendar
          month={month}
          year={year}
          daysInMonth={daysInMonth}
          moonPhases={calendarMoonPhases}
          meteorShowers={calendarShowers}
          currentDay={currentDay}
        />

        {/* What to See */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>🔭</span> What to See
          </h2>

          <div className="space-y-2">
            {dsos.slice(0, 8).map((dso) => (
              <div
                key={dso.id}
                className="bg-card border border-card-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedDso(expandedDso === dso.id ? null : dso.id)}
                  className="w-full p-3 text-left flex items-center justify-between hover:bg-foreground/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {dso.physical.type_short === 'Gal' ? '🌀' :
                       dso.physical.type_short.includes('N') ? '🌫️' : '✨'}
                    </span>
                    <div>
                      <p className="font-medium">{dso.names.primary}</p>
                      <p className="text-xs text-foreground/50">{dso.physical.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      dso.visibility.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                      dso.visibility.difficulty === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {dso.visibility.difficulty}
                    </span>
                    <svg
                      className={`w-4 h-4 text-foreground/40 transition-transform ${expandedDso === dso.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedDso === dso.id && (
                  <div className="px-3 pb-3 pt-0 border-t border-card-border/50">
                    <p className="text-sm text-foreground/70 my-2">{dso.science.short_description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-foreground/10 px-2 py-1 rounded">{dso.physical.constellation}</span>
                      <span className="bg-foreground/10 px-2 py-1 rounded">{getEquipmentLabel(dso.visibility.equipment_minimum)}</span>
                      {dso.physical.magnitude_visual && (
                        <span className="bg-foreground/10 px-2 py-1 rounded">Mag {dso.physical.magnitude_visual}</span>
                      )}
                    </div>
                    {dso.finding.naked_eye_guide && (
                      <p className="text-xs text-foreground/50 mt-2 italic">{dso.finding.naked_eye_guide}</p>
                    )}
                    {dso.stellarium?.skysource_id && (
                      <a
                        href={`https://stellarium-web.org/skysource/${dso.stellarium.skysource_id}?fov=${dso.stellarium.default_fov || 5}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                          <path strokeLinecap="round" strokeWidth={1.5} d="M2 12h20" />
                        </svg>
                        View in Sky
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {dsos.length > 8 && (
            <p className="text-center text-sm text-foreground/40 mt-3">
              +{dsos.length - 8} more objects visible this month
            </p>
          )}
        </section>

        {/* Meteor Showers (if any) */}
        {showers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>☄️</span> Meteor Showers
            </h2>
            <div className="space-y-2">
              {showers.map((shower) => (
                <div key={shower.id} className="bg-card border border-card-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{shower.name}</p>
                      <p className="text-xs text-foreground/50">Peak: {shower.peak_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">{shower.zhr}</p>
                      <p className="text-xs text-foreground/50">meteors/hr</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomTabBar />
    </main>
  );
}
