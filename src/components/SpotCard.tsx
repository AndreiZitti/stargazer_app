import { SpotResult, WeatherForecast } from "@/lib/types";

interface SpotCardProps {
  spot: SpotResult;
  weather: WeatherForecast[] | null;
  isLoadingWeather: boolean;
}

const BORTLE_COLORS: Record<string, string> = {
  Excellent: "text-success",
  Good: "text-green-400",
  Moderate: "text-warning",
  Poor: "text-error",
};

const VISIBILITY_COLORS: Record<string, string> = {
  Excellent: "text-success",
  Good: "text-green-400",
  Fair: "text-warning",
  Poor: "text-error",
};

export default function SpotCard({
  spot,
  weather,
  isLoadingWeather,
}: SpotCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  const tonight = weather?.[0];

  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{spot.radius}km radius</h3>
        <span className={`font-medium ${BORTLE_COLORS[spot.label]}`}>
          Bortle {spot.bortle} ({spot.label})
        </span>
      </div>

      <div className="text-foreground/60 text-sm mb-3">
        {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
      </div>

      {isLoadingWeather ? (
        <div className="text-foreground/40 text-sm mb-3">
          Loading weather...
        </div>
      ) : tonight ? (
        <div className="mb-3">
          <span className="text-foreground/60">Tonight: </span>
          <span>{tonight.cloudCover}% clouds - </span>
          <span className={VISIBILITY_COLORS[tonight.visibility]}>
            {tonight.visibility}
          </span>
        </div>
      ) : (
        <div className="text-foreground/40 text-sm mb-3">
          Weather unavailable
        </div>
      )}

      {weather && weather.length > 1 && (
        <div className="text-sm text-foreground/60 mb-3">
          <div className="flex gap-4">
            {weather.slice(1).map((day) => (
              <span key={day.date}>
                {new Date(day.date).toLocaleDateString("en", {
                  weekday: "short",
                })}
                :{" "}
                <span className={VISIBILITY_COLORS[day.visibility]}>
                  {day.visibility}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-card-border hover:bg-accent/20 rounded transition-colors text-sm"
      >
        Open in Maps
      </a>
    </div>
  );
}
