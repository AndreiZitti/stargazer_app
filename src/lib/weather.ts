import { WeatherForecast } from "./types";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

function getVisibilityLabel(
  cloudCover: number
): "Excellent" | "Good" | "Fair" | "Poor" {
  if (cloudCover <= 20) return "Excellent";
  if (cloudCover <= 40) return "Good";
  if (cloudCover <= 60) return "Fair";
  return "Poor";
}

/**
 * Calculate a stargazing score (0-100) based on weather conditions
 * Higher is better for stargazing
 */
function calculateStargazingScore(
  cloudCover: number,
  precipitation: number
): number {
  // Cloud cover is the main factor (0-70 points)
  const cloudScore = Math.max(0, 70 - cloudCover * 0.7);

  // No precipitation is important (0-30 points)
  const precipScore = precipitation > 0 ? 0 : 30;

  return Math.round(cloudScore + precipScore);
}

/**
 * Average an array of numbers, ignoring null/undefined
 */
function average(arr: (number | null | undefined)[]): number {
  const valid = arr.filter((n): n is number => n !== null && n !== undefined);
  if (valid.length === 0) return 50;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export async function getWeatherForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<WeatherForecast[]> {
  try {
    // Fetch hourly cloud data for layer breakdown, daily for aggregates
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      hourly: "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high",
      daily: "precipitation_sum,sunrise,sunset",
      timezone: "auto",
      forecast_days: Math.min(days, 16).toString(),
    });

    const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

    if (!response.ok) {
      console.error("Weather API failed:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.daily?.time || !data.hourly?.time) {
      console.error("Weather API missing data:", data);
      return [];
    }

    const forecasts: WeatherForecast[] = [];
    const hoursPerDay = 24;

    for (let i = 0; i < data.daily.time.length; i++) {
      const startHour = i * hoursPerDay;
      const endHour = startHour + hoursPerDay;

      // Get hourly data for this day
      const dayCloudCover = data.hourly.cloud_cover?.slice(startHour, endHour) || [];
      const dayCloudLow = data.hourly.cloud_cover_low?.slice(startHour, endHour) || [];
      const dayCloudMid = data.hourly.cloud_cover_mid?.slice(startHour, endHour) || [];
      const dayCloudHigh = data.hourly.cloud_cover_high?.slice(startHour, endHour) || [];

      const cloudCover = Math.round(average(dayCloudCover));
      const cloudCoverLow = Math.round(average(dayCloudLow));
      const cloudCoverMid = Math.round(average(dayCloudMid));
      const cloudCoverHigh = Math.round(average(dayCloudHigh));
      const precipitation = data.daily.precipitation_sum?.[i] ?? 0;

      forecasts.push({
        date: data.daily.time[i],
        cloudCover,
        cloudCoverLow,
        cloudCoverMid,
        cloudCoverHigh,
        precipitation: Math.round(precipitation * 10) / 10,
        visibility: getVisibilityLabel(cloudCover),
        stargazingScore: calculateStargazingScore(cloudCover, precipitation),
        sunrise: data.daily.sunrise?.[i] ?? "",
        sunset: data.daily.sunset?.[i] ?? "",
      });
    }

    return forecasts;
  } catch (error) {
    console.error("Weather API error:", error);
    return [];
  }
}
