"use client";

interface SpotWeatherBadgeProps {
  score: number;
  loading?: boolean;
  compact?: boolean;
}

function getWeatherIcon(score: number): string {
  if (score >= 70) return "☀️";
  if (score >= 40) return "⛅";
  return "☁️";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-foreground/60";
}

export default function SpotWeatherBadge({ score, loading, compact }: SpotWeatherBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-foreground/40">
        <div className="w-4 h-4 rounded-full bg-foreground/10 animate-pulse" />
        {!compact && <span className="text-xs">Loading...</span>}
      </div>
    );
  }

  const icon = getWeatherIcon(score);
  const colorClass = getScoreColor(score);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <span>{icon}</span>
        <span className="text-xs font-medium">{score}%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${colorClass}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{score}% clear tonight</span>
    </div>
  );
}
