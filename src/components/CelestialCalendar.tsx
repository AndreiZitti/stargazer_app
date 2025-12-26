"use client";

import { useMemo } from "react";

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

interface CelestialCalendarProps {
  month: string;
  year: number;
  daysInMonth: number;
  moonPhases: MoonPhaseData;
  meteorShowers: MeteorShowerEvent[];
  currentDay?: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMoonPhase(day: number, newMoonDay: number, daysInMonth: number): number {
  const lunarCycle = 29.53;
  const daysSinceNew = (day - newMoonDay + daysInMonth) % daysInMonth;
  return (daysSinceNew / lunarCycle) % 1;
}

function getFirstDayOfMonth(month: string, year: number): number {
  const monthIndex = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ].indexOf(month);
  const date = new Date(year, monthIndex, 1);
  // Convert Sunday=0 to Monday=0 format
  return (date.getDay() + 6) % 7;
}

function MoonIcon({ phase, size = 24, isCurrentDay = false }: { phase: number; size?: number; isCurrentDay?: boolean }) {
  const illumination = Math.abs(Math.cos(phase * 2 * Math.PI));
  const isWaxing = phase < 0.5;
  const radius = size / 2 - 1;
  const centerX = size / 2;
  const centerY = size / 2;
  const terminatorX = radius * Math.cos(phase * 2 * Math.PI);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
      {/* Glow effect for current day */}
      {isCurrentDay && (
        <>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 3}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            opacity="0.6"
            filter="url(#glow)"
          />
        </>
      )}

      {/* Moon base */}
      <circle cx={centerX} cy={centerY} r={radius} fill="#1a1a2e" stroke="#2a2a4a" strokeWidth="0.5" />

      {/* Illuminated portion */}
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

      {/* Full moon */}
      {phase >= 0.45 && phase <= 0.55 && (
        <circle cx={centerX} cy={centerY} r={radius - 0.5} fill="#e8e4d9" />
      )}

      {/* New moon outline */}
      {(phase < 0.03 || phase > 0.97) && (
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#3a3a5a" strokeWidth="1" strokeDasharray="2 2" />
      )}

      {/* Moon surface details */}
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

function formatDateRange(start: number, end: number, month: string): string {
  return `${month.slice(0, 3)} ${start}-${end}`;
}

function extractPeakDay(peakDate: string): number | null {
  const match = peakDate.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export default function CelestialCalendar({
  month,
  year,
  daysInMonth,
  moonPhases,
  meteorShowers,
  currentDay,
}: CelestialCalendarProps) {
  const firstDayOffset = useMemo(() => getFirstDayOfMonth(month, year), [month, year]);

  const calendarWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOffset; i++) {
      currentWeek.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining cells in last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [daysInMonth, firstDayOffset]);

  const getActiveShowersForDay = (day: number): MeteorShowerEvent[] => {
    return meteorShowers.filter(s => day >= s.activeStart && day <= s.activeEnd);
  };

  return (
    <div className="bg-[#0a0a12] border border-[#1a1a2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a1a2e] bg-gradient-to-r from-[#0d0d18] to-[#0a0a12]">
        <h3 className="text-lg font-light tracking-widest text-[#8888aa] uppercase">
          {month} {year}
        </h3>
      </div>

      <div className="flex">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs text-[#6a6a8a] font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar weeks */}
          <div className="space-y-1">
            {calendarWeeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => {
                  if (day === null) {
                    return <div key={dayIdx} className="aspect-square" />;
                  }

                  const phase = getMoonPhase(day, moonPhases.newMoon, daysInMonth);
                  const isToday = day === currentDay;
                  const activeShowers = getActiveShowersForDay(day);

                  return (
                    <div
                      key={dayIdx}
                      className={`aspect-square flex flex-col items-center justify-center p-1 rounded-lg transition-colors ${
                        isToday ? "bg-blue-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      {/* Day number */}
                      <span className={`text-xs tabular-nums mb-1 ${
                        isToday ? "text-blue-400 font-medium" : "text-[#6a6a8a]"
                      }`}>
                        {day}
                      </span>

                      {/* Moon icon */}
                      <MoonIcon phase={phase} size={24} isCurrentDay={isToday} />

                      {/* Meteor shower dots */}
                      {activeShowers.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {activeShowers.map((shower) => (
                            <div
                              key={shower.id}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: shower.color }}
                              title={shower.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Meteor Shower Legend Sidebar */}
        {meteorShowers.length > 0 && (
          <div className="w-48 border-l border-[#1a1a2e] p-4 bg-[#0d0d18]/50">
            <h4 className="text-xs font-medium text-[#6a6a8a] uppercase tracking-wider mb-4">
              Meteor Showers
            </h4>
            <div className="space-y-4">
              {meteorShowers.map((shower) => {
                const peakDay = extractPeakDay(shower.peakDate);
                return (
                  <div key={shower.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: shower.color,
                          boxShadow: `0 0 4px ${shower.color}`
                        }}
                      />
                      <span className="text-sm font-medium" style={{ color: shower.color }}>
                        {shower.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#6a6a8a] pl-4">
                      {formatDateRange(shower.activeStart, shower.activeEnd, month)}
                    </div>
                    {peakDay && (
                      <div className="text-xs text-[#8888aa] pl-4">
                        Peak: {month.slice(0, 3)} {peakDay}
                      </div>
                    )}
                    <div className="text-xs text-[#6a6a8a] pl-4">
                      ~{shower.zhr}/hr
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
