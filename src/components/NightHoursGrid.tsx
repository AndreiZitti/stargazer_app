"use client";

import { CloudForecast, CloudHour } from "@/lib/types";

interface NightHoursGridProps {
  forecast: CloudForecast;
}

const RATING_COLORS: Record<string, string> = {
  excellent: "#22c55e",
  great: "#84cc16",
  good: "#eab308",
  poor: "#f97316",
  bad: "#ef4444",
};

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return String(date.getHours()).padStart(2, "0");
}

export default function NightHoursGrid({ forecast }: NightHoursGridProps) {
  // Filter to night hours only (better for stargazing) and get next 24h
  const now = new Date();
  const nightHours = forecast.hours
    .filter(h => h.isNight && new Date(h.time) >= now)
    .slice(0, 16); // ~16 night hours is reasonable

  if (nightHours.length === 0) {
    return (
      <div className="text-xs text-foreground/50 text-center py-2">
        No night hours in forecast
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-foreground/50">Cloud Coverage</div>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {nightHours.map((hour, i) => (
          <div
            key={i}
            className={`flex-shrink-0 text-center px-1 py-1 rounded ${
              hour.isNight ? "bg-indigo-950/30" : "bg-foreground/5"
            }`}
            style={{ minWidth: "32px" }}
            title={`${new Date(hour.time).toLocaleString()}: ${hour.cloudTotal}% clouds`}
          >
            <div className="text-[9px] text-foreground/50">{formatHour(hour.time)}</div>
            <div
              className="w-3 h-3 mx-auto rounded-full mt-0.5"
              style={{ backgroundColor: RATING_COLORS[hour.rating] || "#6b7280" }}
            />
            <div className="text-[9px] mt-0.5 font-medium">{hour.cloudTotal}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
