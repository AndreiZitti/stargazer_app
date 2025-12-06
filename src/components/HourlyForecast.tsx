"use client";

import { HourlyCondition } from "@/lib/types";

interface HourlyForecastProps {
  hours: HourlyCondition[];
  className?: string;
}

function getIcon(condition: HourlyCondition["icon"]): string {
  switch (condition) {
    case "clear": return "☀️";
    case "partly": return "⛅";
    case "cloudy": return "☁️";
    case "rainy": return "🌧️";
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function getScoreColor(cloudCover: number): string {
  const score = 100 - cloudCover;
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-foreground/50";
}

export default function HourlyForecast({ hours, className = "" }: HourlyForecastProps) {
  return (
    <div className={`flex gap-1 overflow-x-auto ${className}`}>
      {hours.map((hour) => (
        <div
          key={hour.hour}
          className="flex flex-col items-center min-w-[44px] p-2 rounded-lg bg-foreground/5"
        >
          <span className="text-xs text-foreground/60">{formatHour(hour.hour)}</span>
          <span className="text-lg my-1">{getIcon(hour.icon)}</span>
          <span className={`text-xs font-medium ${getScoreColor(hour.cloudCover)}`}>
            {100 - hour.cloudCover}%
          </span>
        </div>
      ))}
    </div>
  );
}
