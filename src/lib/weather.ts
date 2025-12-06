import { WeatherForecast, HourlyCondition, TonightForecast } from "./types";

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

function getWeatherIcon(cloudCover: number, precipitation: number): "clear" | "partly" | "cloudy" | "rainy" {
  if (precipitation > 0.5) return "rainy";
  if (cloudCover <= 30) return "clear";
  if (cloudCover <= 60) return "partly";
  return "cloudy";
}

export async function getTonightForecast(
  lat: number,
  lng: number
): Promise<TonightForecast | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      hourly: "cloud_cover,precipitation",
      timezone: "auto",
      forecast_days: "2",
    });

    const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.hourly?.time) return null;

    // Get hours from 20:00 (8pm) to 02:00 (2am next day)
    const hours: HourlyCondition[] = [];
    const targetHours = [20, 21, 22, 23, 0, 1, 2];

    for (const targetHour of targetHours) {
      // Find index in hourly data
      const dayOffset = targetHour < 12 ? 1 : 0; // 0-2am is next day
      const hourIndex = dayOffset * 24 + targetHour;

      if (hourIndex < data.hourly.cloud_cover.length) {
        const cloudCover = data.hourly.cloud_cover[hourIndex] ?? 50;
        const precip = data.hourly.precipitation?.[hourIndex] ?? 0;

        hours.push({
          hour: targetHour,
          cloudCover: Math.round(cloudCover),
          icon: getWeatherIcon(cloudCover, precip),
        });
      }
    }

    const avgCloud = hours.reduce((sum, h) => sum + h.cloudCover, 0) / hours.length;
    const overallScore = Math.round(100 - avgCloud);
    const bestHourData = hours.reduce((best, h) => h.cloudCover < best.cloudCover ? h : best, hours[0]);

    // Generate summary
    let summary = "Clear skies tonight";
    if (avgCloud > 70) summary = "Mostly cloudy tonight";
    else if (avgCloud > 40) summary = "Partly cloudy tonight";
    else if (bestHourData.hour !== hours[0].hour) {
      const hourStr = bestHourData.hour === 0 ? "midnight" :
                      bestHourData.hour < 12 ? `${bestHourData.hour}am` :
                      bestHourData.hour === 12 ? "noon" : `${bestHourData.hour - 12}pm`;
      summary = `Clearest around ${hourStr}`;
    }

    return {
      hours,
      overallScore,
      bestHour: bestHourData.hour,
      summary,
    };
  } catch (error) {
    console.error("Tonight forecast error:", error);
    return null;
  }
}
