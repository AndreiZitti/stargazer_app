"use client";

import { useState, useMemo } from "react";

interface MeteorShowerEvent {
  id: string;
  name: string;
  peakDate: string;
  activeStart: number;
  activeEnd: number;
  zhr: number;
  color: string;
}

interface MoonPhaseData {
  newMoon: number;
  fullMoon: number;
  fullMoonName: string;
}

interface DarkSkyWindow {
  start: number;
  end: number;
}

interface CelestialCalendarProps {
  month: string;
  year: number;
  daysInMonth: number;
  moonPhases: MoonPhaseData;
  meteorShowers: MeteorShowerEvent[];
  darkSkyWindows: DarkSkyWindow[];
}

function getMoonPhase(day: number, newMoonDay: number, daysInMonth: number): number {
  const lunarCycle = 29.53;
  const daysSinceNew = (day - newMoonDay + daysInMonth) % daysInMonth;
  return (daysSinceNew / lunarCycle) % 1;
}

function MoonIcon({ phase, size = 24 }: { phase: number; size?: number }) {
  const illumination = Math.abs(Math.cos(phase * 2 * Math.PI));
  const isWaxing = phase < 0.5;
  const radius = size / 2 - 1;
  const centerX = size / 2;
  const centerY = size / 2;
  const terminatorX = radius * Math.cos(phase * 2 * Math.PI);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={centerX} cy={centerY} r={radius} fill="#1a1a2e" stroke="#2a2a4a" strokeWidth="0.5" />
      {phase > 0.01 && phase < 0.99 && (
        <path
          d={
            isWaxing
              ? `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} A ${Math.abs(terminatorX)} ${radius} 0 0 ${terminatorX > 0 ? 0 : 1} ${centerX} ${centerY - radius}`
              : `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 0 ${centerX} ${centerY + radius} A ${Math.abs(terminatorX)} ${radius} 0 0 ${terminatorX > 0 ? 1 : 0} ${centerX} ${centerY - radius}`
          }
          fill="#e8e4d9"
        />
      )}
      {phase >= 0.45 && phase <= 0.55 && (
        <circle cx={centerX} cy={centerY} r={radius - 0.5} fill="#e8e4d9" />
      )}
      {(phase < 0.03 || phase > 0.97) && (
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#3a3a5a" strokeWidth="1" strokeDasharray="2 2" />
      )}
      {illumination > 0.3 && (
        <>
          <circle cx={centerX - 2} cy={centerY - 1} r="1.5" fill="#d4d0c5" opacity="0.3" />
          <circle cx={centerX + 3} cy={centerY + 2} r="2" fill="#d4d0c5" opacity="0.2" />
          <circle cx={centerX - 1} cy={centerY + 3} r="1" fill="#d4d0c5" opacity="0.25" />
        </>
      )}
    </svg>
  );
}

// Meteor shower track with activity bar and shimmer
function MeteorShowerTrack({
  shower,
  daysInMonth,
  isHighlighted,
}: {
  shower: MeteorShowerEvent;
  daysInMonth: number;
  isHighlighted: boolean;
}) {
  // Calculate positions as percentages of calendar width
  // Each day occupies (100 / daysInMonth)% of width
  // Day N is centered at ((N - 0.5) / daysInMonth * 100)%
  const dayWidth = 100 / daysInMonth;
  const startPercent = (shower.activeStart - 1) * dayWidth;
  const endPercent = shower.activeEnd * dayWidth;
  const width = endPercent - startPercent;

  // Find peak day for gradient
  const peakMatch = shower.peakDate.match(/(\d+)/);
  const peakDay = peakMatch ? parseInt(peakMatch[1]) : null;

  // Peak position relative to bar (for gradient intensity)
  const peakRelativePercent = peakDay && width > 0
    ? ((peakDay - shower.activeStart) / (shower.activeEnd - shower.activeStart)) * 100
    : 50;

  return (
    <div
      className={`relative h-12 flex items-center transition-opacity duration-300 ${
        isHighlighted ? "opacity-100" : "opacity-25"
      }`}
    >
      {/* Shower label - positioned at start */}
      <div
        className="absolute text-[11px] font-medium tracking-wide z-10 flex items-center gap-2 whitespace-nowrap"
        style={{
          left: `${startPercent}%`,
          top: '2px',
          color: shower.color,
        }}
      >
        <span>{shower.name}</span>
        <span className="opacity-50 text-[9px]">~{shower.zhr}/hr</span>
      </div>

      {/* Activity bar container */}
      <div
        className="absolute h-6 top-1/2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{
          left: `${startPercent}%`,
          width: `${width}%`,
        }}
      >
        {/* Base bar with gradient - peaks at the peak location */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg,
              ${shower.color}20 0%,
              ${shower.color}50 ${Math.max(0, peakRelativePercent - 15)}%,
              ${shower.color} ${peakRelativePercent}%,
              ${shower.color}50 ${Math.min(100, peakRelativePercent + 15)}%,
              ${shower.color}20 100%)`,
          }}
        />

        {/* Shimmer effect - moving highlight */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(90deg,
              transparent 0%,
              transparent 35%,
              rgba(255,255,255,0.2) 50%,
              transparent 65%,
              transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />

        {/* Top highlight edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] rounded-full opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent, ${shower.color}, transparent)`,
          }}
        />
      </div>

    </div>
  );
}

export default function CelestialCalendar({
  month,
  year,
  daysInMonth,
  moonPhases,
  meteorShowers,
  darkSkyWindows,
}: CelestialCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [selectedShower, setSelectedShower] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const hoveredDayInfo = useMemo(() => {
    if (!hoveredDay) return null;

    const phase = getMoonPhase(hoveredDay, moonPhases.newMoon, daysInMonth);
    const isNewMoon = hoveredDay === moonPhases.newMoon;
    const isFullMoon = hoveredDay === moonPhases.fullMoon;

    const activeShowers = meteorShowers.filter(
      (s) => hoveredDay >= s.activeStart && hoveredDay <= s.activeEnd
    );

    const inDarkWindow = darkSkyWindows.some(
      (w) => hoveredDay >= w.start && hoveredDay <= w.end
    );

    let phaseName = "";
    if (isNewMoon) phaseName = "New Moon";
    else if (isFullMoon) phaseName = `Full Moon (${moonPhases.fullMoonName})`;
    else if (phase < 0.25) phaseName = "Waxing Crescent";
    else if (phase < 0.3) phaseName = "First Quarter";
    else if (phase < 0.45) phaseName = "Waxing Gibbous";
    else if (phase < 0.55) phaseName = "Full";
    else if (phase < 0.7) phaseName = "Waning Gibbous";
    else if (phase < 0.8) phaseName = "Last Quarter";
    else phaseName = "Waning Crescent";

    return {
      day: hoveredDay,
      phase,
      phaseName,
      isNewMoon,
      isFullMoon,
      activeShowers,
      inDarkWindow,
    };
  }, [hoveredDay, moonPhases, meteorShowers, darkSkyWindows, daysInMonth]);

  return (
    <div className="relative">
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>

      <div className="bg-[#0a0a12] border border-[#1a1a2e] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1a1a2e] bg-gradient-to-r from-[#0d0d18] to-[#0a0a12]">
          <h3 className="text-lg font-light tracking-widest text-[#8888aa] uppercase">
            {month} {year} &mdash; Celestial Calendar
          </h3>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-b border-[#1a1a2e]/50 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1a3a2a] border border-[#2a5a3a]" />
            <span className="text-[#6a8a7a]">Dark Sky Window</span>
          </div>
          {meteorShowers.map((shower) => (
            <button
              key={shower.id}
              onClick={() => setSelectedShower(selectedShower === shower.id ? null : shower.id)}
              className={`flex items-center gap-2 transition-opacity ${
                selectedShower && selectedShower !== shower.id ? "opacity-40" : ""
              }`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: shower.color,
                  boxShadow: `0 0 4px ${shower.color}`
                }}
              />
              <span style={{ color: shower.color }}>{shower.name}</span>
            </button>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="p-6">
          {/* Meteor shower tracks */}
          <div className="relative mb-4 space-y-1">
            {meteorShowers.map((shower) => (
              <MeteorShowerTrack
                key={shower.id}
                shower={shower}
                daysInMonth={daysInMonth}
                isHighlighted={!selectedShower || selectedShower === shower.id}
              />
            ))}
          </div>

          {/* Days row with moon phases */}
          <div className="relative">
            {/* Dark sky window backgrounds */}
            {darkSkyWindows.map((window, idx) => {
              const startPercent = ((window.start - 1) / daysInMonth) * 100;
              const endPercent = (window.end / daysInMonth) * 100;

              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 rounded-lg"
                  style={{
                    left: `${startPercent}%`,
                    width: `${endPercent - startPercent}%`,
                    background: "linear-gradient(180deg, #0a1a10 0%, #0a1a1088 100%)",
                    border: "1px solid #1a3a2a",
                  }}
                />
              );
            })}

            {/* Days */}
            <div className="relative flex">
              {days.map((day) => {
                const phase = getMoonPhase(day, moonPhases.newMoon, daysInMonth);
                const isNewMoon = day === moonPhases.newMoon;
                const isFullMoon = day === moonPhases.fullMoon;
                const isSpecial = isNewMoon || isFullMoon;

                const hasShowerPeak = meteorShowers.some((s) => {
                  const match = s.peakDate.match(/(\d+)/);
                  return match && parseInt(match[1]) === day;
                });

                return (
                  <div
                    key={day}
                    className={`flex-1 flex flex-col items-center py-3 cursor-pointer transition-all duration-200 ${
                      hoveredDay === day ? "bg-white/5" : ""
                    }`}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {isSpecial && (
                      <div
                        className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
                        style={{
                          background: isFullMoon
                            ? "radial-gradient(circle at center, #e8e4d9 0%, transparent 70%)"
                            : "radial-gradient(circle at center, #3a3a6a 0%, transparent 70%)",
                        }}
                      />
                    )}

                    <div className={`relative ${isSpecial ? "scale-125" : ""}`}>
                      <MoonIcon phase={phase} size={isSpecial ? 28 : 20} />
                      {isFullMoon && (
                        <div
                          className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
                          style={{ boxShadow: "0 0 12px #e8e4d9, 0 0 24px #e8e4d966" }}
                        />
                      )}
                    </div>

                    <span
                      className={`mt-1 text-xs tabular-nums ${
                        isSpecial ? "text-white font-medium" : "text-[#6a6a8a]"
                      }`}
                    >
                      {day}
                    </span>

                    {hasShowerPeak && (
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hover info panel */}
        {hoveredDayInfo && (
          <div className="px-6 py-4 border-t border-[#1a1a2e] bg-gradient-to-r from-[#0d0d18] to-[#0a0a12]">
            <div className="flex items-start gap-6">
              <div className="flex items-center gap-3">
                <MoonIcon phase={hoveredDayInfo.phase} size={40} />
                <div>
                  <p className="text-white font-medium">
                    {month} {hoveredDayInfo.day}
                  </p>
                  <p className="text-[#8888aa] text-sm">{hoveredDayInfo.phaseName}</p>
                </div>
              </div>

              {hoveredDayInfo.inDarkWindow && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a3a2a]/50 border border-[#2a5a3a] rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#4a8a5a] animate-pulse" />
                  <span className="text-[#6a9a7a] text-sm">Dark Sky Window</span>
                </div>
              )}

              {hoveredDayInfo.activeShowers.length > 0 && (
                <div className="flex-1">
                  <p className="text-[#6a6a8a] text-xs uppercase tracking-wider mb-1">
                    Active Showers
                  </p>
                  <div className="flex gap-3">
                    {hoveredDayInfo.activeShowers.map((shower) => {
                      const peakMatch = shower.peakDate.match(/(\d+)/);
                      const peakDay = peakMatch ? parseInt(peakMatch[1]) : null;
                      const isPeak = peakDay === hoveredDayInfo.day;

                      return (
                        <div key={shower.id} className="flex items-center gap-2" style={{ color: shower.color }}>
                          <span className="font-medium">{shower.name}</span>
                          {isPeak && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${shower.color}33` }}>
                              PEAK
                            </span>
                          )}
                          <span className="text-xs opacity-70">{shower.zhr}/hr</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
