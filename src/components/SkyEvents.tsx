import { MonthlyEvents } from "@/lib/types";

interface SkyEventsProps {
  events: MonthlyEvents;
}

const EVENT_ICONS: Record<string, string> = {
  meteor_shower: "shooting-star",
  planet: "planet",
  eclipse: "moon",
  conjunction: "stars",
  other: "star",
};

export default function SkyEvents({ events }: SkyEventsProps) {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const isCurrentMonth = events.month === currentMonth;

  // Check if we're near a new moon (within 5 days)
  const isNearNewMoon = (() => {
    if (!isCurrentMonth) return false;
    const monthNum = events.month.split("-")[1];
    const dayMatch = events.moonPhase.newMoon.match(/\d+/);
    if (!dayMatch) return false;
    const newMoonDay = parseInt(dayMatch[0]);
    const newMoonDate = new Date(
      parseInt(events.month.split("-")[0]),
      parseInt(monthNum) - 1,
      newMoonDay
    );
    const diff = Math.abs(today.getTime() - newMoonDate.getTime());
    return diff < 5 * 24 * 60 * 60 * 1000;
  })();

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">What to see tonight</h2>

      <div className="space-y-3">
        {events.highlights.map((event, index) => (
          <div key={index} className="flex gap-3">
            <span className="text-xl w-6 text-center">
              {EVENT_ICONS[event.type] === "shooting-star" && "☄️"}
              {EVENT_ICONS[event.type] === "planet" && "🪐"}
              {EVENT_ICONS[event.type] === "moon" && "🌑"}
              {EVENT_ICONS[event.type] === "stars" && "✨"}
              {EVENT_ICONS[event.type] === "star" && "⭐"}
            </span>
            <div>
              <div className="font-medium">
                {event.name}
                <span className="text-foreground/60 text-sm ml-2">
                  ({event.dates})
                </span>
              </div>
              <div className="text-sm text-foreground/60">
                {event.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-card-border">
        <div className="flex gap-4 text-sm flex-wrap">
          <span>
            🌑 New Moon: {events.moonPhase.newMoon}
            {isNearNewMoon && (
              <span className="text-success ml-1">(ideal darkness!)</span>
            )}
          </span>
          <span>🌕 Full Moon: {events.moonPhase.fullMoon}</span>
        </div>
      </div>
    </div>
  );
}
