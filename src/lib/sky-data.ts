import { DeepSkyObject, MeteorShower, MonthPhases, DarkSkyWindow } from './types';
import dsoData from '@/information/dso-december-january.json';
import meteorData from '@/information/meteor-showers.json';
import moonData from '@/information/moon-phases.json';

// Type the imported data
const dsos = dsoData.objects as DeepSkyObject[];
const showers = meteorData.showers as MeteorShower[];

// Extract year data from moon phases (skip metadata)
type MoonDataType = {
  metadata: unknown;
  [year: string]: Record<string, MonthPhases> | unknown;
};
const moonDataTyped = moonData as MoonDataType;
const moonPhases: Record<string, Record<string, MonthPhases>> = {};
for (const key of Object.keys(moonDataTyped)) {
  if (key !== 'metadata') {
    moonPhases[key] = moonDataTyped[key] as Record<string, MonthPhases>;
  }
}

/**
 * Get month name from date
 */
function getMonthName(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long' });
}

/**
 * Parse a date string like "December 13-14" or "Dec 13" to check if a date falls within it
 */
function isDateInRange(targetDate: Date, dateStr: string): boolean {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  const lower = dateStr.toLowerCase();

  // Find month in string
  let month = -1;
  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i]) || lower.includes(shortMonths[i])) {
      month = i;
      break;
    }
  }

  if (month === -1) return false;
  if (month !== targetMonth) return false;

  // Extract day numbers
  const dayMatch = dateStr.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!dayMatch) return false;

  const startDay = parseInt(dayMatch[1]);
  const endDay = dayMatch[2] ? parseInt(dayMatch[2]) : startDay;

  return targetDay >= startDay && targetDay <= endDay;
}

/**
 * Check if a date falls within an active period (handles cross-year periods)
 */
function isInActivePeriod(targetDate: Date, start: string, end: string): boolean {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];

  const parseMonthDay = (str: string): { month: number; day: number } | null => {
    const lower = str.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        const dayMatch = str.match(/(\d+)/);
        if (dayMatch) {
          return { month: i, day: parseInt(dayMatch[1]) };
        }
      }
    }
    return null;
  };

  const startParsed = parseMonthDay(start);
  const endParsed = parseMonthDay(end);

  if (!startParsed || !endParsed) return false;

  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  // Convert to day-of-year-like value for comparison
  const toDayValue = (month: number, day: number) => month * 31 + day;

  const targetValue = toDayValue(targetMonth, targetDay);
  const startValue = toDayValue(startParsed.month, startParsed.day);
  const endValue = toDayValue(endParsed.month, endParsed.day);

  // Handle wrap-around (e.g., December to January)
  if (startValue > endValue) {
    return targetValue >= startValue || targetValue <= endValue;
  }

  return targetValue >= startValue && targetValue <= endValue;
}

/**
 * Get all DSOs
 */
export function getAllDSOs(): DeepSkyObject[] {
  return dsos;
}

/**
 * Get all meteor showers
 */
export function getAllShowers(): MeteorShower[] {
  return showers;
}

/**
 * Get DSOs visible for a given month
 */
export function getDSOsForMonth(month: string): DeepSkyObject[] {
  const monthLower = month.toLowerCase();
  return dsos.filter(dso =>
    dso.visibility.best_months.some(m => m.toLowerCase() === monthLower)
  ).sort((a, b) => {
    // Sort by difficulty (easy first) then by magnitude (brighter first)
    const difficultyOrder = { easy: 0, moderate: 1, challenging: 2 };
    const aDiff = difficultyOrder[a.visibility.difficulty];
    const bDiff = difficultyOrder[b.visibility.difficulty];
    if (aDiff !== bDiff) return aDiff - bDiff;
    return (a.physical.magnitude_visual || 99) - (b.physical.magnitude_visual || 99);
  });
}

/**
 * Get meteor showers active in a given month
 */
export function getShowersForMonth(month: string): MeteorShower[] {
  const monthLower = month.toLowerCase();
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];

  return showers.filter(shower => {
    // Check if the month appears in the active period
    const start = shower.active_period.start.toLowerCase();
    const end = shower.active_period.end.toLowerCase();
    const peak = shower.peak_date.toLowerCase();

    // Check peak date first
    if (peak.includes(monthLower.slice(0, 3))) return true;

    // Find month indices
    const startMonthIdx = monthNames.findIndex(m => start.includes(m));
    const endMonthIdx = monthNames.findIndex(m => end.includes(m));
    const targetMonthIdx = monthNames.indexOf(monthLower);

    if (startMonthIdx === -1 || endMonthIdx === -1 || targetMonthIdx === -1) return false;

    // Handle wrap-around (e.g., December to January)
    if (startMonthIdx > endMonthIdx) {
      return targetMonthIdx >= startMonthIdx || targetMonthIdx <= endMonthIdx;
    }

    return targetMonthIdx >= startMonthIdx && targetMonthIdx <= endMonthIdx;
  }).sort((a, b) => b.zhr - a.zhr);
}

/**
 * Get moon data for a specific month
 */
export function getMoonDataForMonth(year: string, month: string): {
  newMoon: string;
  fullMoon: { date: string; name: string };
  darkSkyWindows: { start: string; end: string; quality: string }[];
} | null {
  const yearData = moonPhases[year];
  if (!yearData) return null;

  const monthData = yearData[month.toLowerCase()];
  if (!monthData) return null;

  const newMoon = typeof monthData.new_moon === 'string'
    ? monthData.new_moon
    : monthData.new_moon.date;

  return {
    newMoon,
    fullMoon: {
      date: monthData.full_moon.date,
      name: monthData.full_moon.name,
    },
    darkSkyWindows: monthData.dark_sky_windows.map(w => ({
      start: w.start,
      end: w.end,
      quality: w.quality,
    })),
  };
}

/**
 * Get active meteor showers for a given date
 */
export function getActiveShowers(date: Date): MeteorShower[] {
  return showers.filter(shower =>
    isInActivePeriod(date, shower.active_period.start, shower.active_period.end)
  ).sort((a, b) => b.zhr - a.zhr); // Sort by ZHR (highest first)
}

/**
 * Check if a shower is at peak on a given date
 */
export function isShowerAtPeak(date: Date, shower: MeteorShower): boolean {
  return isDateInRange(date, shower.peak_date);
}

/**
 * Get moon phase info for a date
 */
export function getMoonPhaseForDate(date: Date): {
  phase: string;
  isNewMoon: boolean;
  isFullMoon: boolean;
  daysToNewMoon: number;
  daysToFullMoon: number;
  inDarkSkyWindow: boolean;
  darkSkyWindow: DarkSkyWindow | null;
  fullMoonName?: string;
} {
  const year = date.getFullYear().toString();
  const monthName = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();

  const yearData = moonPhases[year];
  if (!yearData) {
    return {
      phase: 'Unknown',
      isNewMoon: false,
      isFullMoon: false,
      daysToNewMoon: -1,
      daysToFullMoon: -1,
      inDarkSkyWindow: false,
      darkSkyWindow: null,
    };
  }

  const monthData = yearData[monthName];
  if (!monthData) {
    return {
      phase: 'Unknown',
      isNewMoon: false,
      isFullMoon: false,
      daysToNewMoon: -1,
      daysToFullMoon: -1,
      inDarkSkyWindow: false,
      darkSkyWindow: null,
    };
  }

  const dateStr = date.toISOString().split('T')[0];

  // Get new moon date
  const newMoonDate = typeof monthData.new_moon === 'string'
    ? monthData.new_moon
    : monthData.new_moon.date;

  const fullMoonDate = monthData.full_moon.date;

  const isNewMoon = dateStr === newMoonDate;
  const isFullMoon = dateStr === fullMoonDate;

  // Calculate days to events
  const targetTime = date.getTime();
  const newMoonTime = new Date(newMoonDate).getTime();
  const fullMoonTime = new Date(fullMoonDate).getTime();

  const daysToNewMoon = Math.round((newMoonTime - targetTime) / (1000 * 60 * 60 * 24));
  const daysToFullMoon = Math.round((fullMoonTime - targetTime) / (1000 * 60 * 60 * 24));

  // Check dark sky windows
  let inDarkSkyWindow = false;
  let darkSkyWindow: DarkSkyWindow | null = null;

  for (const window of monthData.dark_sky_windows || []) {
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();
    if (targetTime >= start && targetTime <= end) {
      inDarkSkyWindow = true;
      darkSkyWindow = window;
      break;
    }
  }

  // Determine approximate phase
  let phase = 'Waxing';
  if (isNewMoon) phase = 'New Moon';
  else if (isFullMoon) phase = 'Full Moon';
  else if (daysToNewMoon > 0 && daysToNewMoon <= 3) phase = 'Waning Crescent';
  else if (daysToNewMoon < 0 && daysToNewMoon >= -3) phase = 'Waxing Crescent';
  else if (daysToFullMoon > 0 && daysToFullMoon <= 3) phase = 'Waxing Gibbous';
  else if (daysToFullMoon < 0 && daysToFullMoon >= -3) phase = 'Waning Gibbous';
  else if (daysToFullMoon > 0) phase = 'Waxing';
  else phase = 'Waning';

  return {
    phase,
    isNewMoon,
    isFullMoon,
    daysToNewMoon,
    daysToFullMoon,
    inDarkSkyWindow,
    darkSkyWindow,
    fullMoonName: isFullMoon ? monthData.full_moon.name : undefined,
  };
}

/**
 * Get equipment icon for DSO
 */
export function getEquipmentIcon(equipment: string): string {
  switch (equipment) {
    case 'naked_eye': return 'eye';
    case 'binoculars': return 'binoculars';
    case 'small_telescope': return 'telescope';
    case 'large_telescope': return 'telescope-lg';
    default: return 'star';
  }
}

/**
 * Get difficulty color class
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'text-success';
    case 'moderate': return 'text-warning';
    case 'challenging': return 'text-error';
    default: return 'text-foreground/60';
  }
}

/**
 * Get type icon for DSO
 */
export function getDSOTypeIcon(typeShort: string): string {
  switch (typeShort) {
    case 'EN': return 'nebula';
    case 'RN': return 'nebula';
    case 'DN': return 'dark-nebula';
    case 'SNR': return 'supernova';
    case 'OC': return 'cluster';
    case 'OC+OC': return 'cluster';
    case 'Gal': return 'galaxy';
    case 'PN': return 'planetary';
    case '**': return 'double-star';
    default: return 'star';
  }
}
