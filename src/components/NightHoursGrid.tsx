"use client";

import { CloudForecast, CloudHour } from "@/lib/types";

interface NightHoursGridProps {
  forecast: CloudForecast;
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(":00", "");
}

function groupNightHours(hours: CloudHour[]): { label: string; hours: CloudHour[] }[] {
  const nightHours = hours.filter(h => h.isNight);
  if (nightHours.length === 0) return [];

  const tonight: CloudHour[] = [];
  const tomorrow: CloudHour[] = [];
  const now = new Date();
  const todayDate = now.toDateString();

  nightHours.forEach(hour => {
    const hourDate = new Date(hour.time);
    const hourDateStr = hourDate.toDateString();
    const hourNum = hourDate.getHours();

    // If same calendar day or early morning of next day (continuation of tonight)
    if (hourDateStr === todayDate || (hourNum < 6 && new Date(hourDate.getTime() - 6 * 60 * 60 * 1000).toDateString() === todayDate)) {
      tonight.push(hour);
    } else {
      tomorrow.push(hour);
    }
  });

  const result: { label: string; hours: CloudHour[] }[] = [];
  if (tonight.length > 0) result.push({ label: "Tonight", hours: tonight });
  if (tomorrow.length > 0) result.push({ label: "Tomorrow Night", hours: tomorrow });

  return result;
}

export default function NightHoursGrid({ forecast }: NightHoursGridProps) {
  const groups = groupNightHours(forecast.hours);

  if (groups.length === 0) {
    return (
      <div className="text-xs text-foreground/50 text-center py-2">
        No night hours in forecast
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, idx) => (
        <div key={idx}>
          <div className="text-xs text-foreground/50 mb-1.5">{group.label}</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {group.hours.map((hour, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-center px-1.5 py-1 bg-foreground/5 rounded"
                style={{ minWidth: "40px" }}
              >
                <div className="text-[10px] text-foreground/40">{formatHour(hour.time)}</div>
                <div className="text-xs font-medium">{hour.cloudTotal}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
