// src/lib/cloud-forecast.ts
import { CloudForecast, CloudHour, CloudRating } from "./types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    precipitation_probability: number[];
    is_day: number[];
  };
}

function rateCloudConditions(cloudTotal: number, precipitation: number): CloudRating {
  // Bad if high precipitation chance
  if (precipitation > 50) return "bad";

  // Rate by cloud coverage
  if (cloudTotal <= 10) return "excellent";
  if (cloudTotal <= 25) return "great";
  if (cloudTotal <= 40) return "good";
  if (cloudTotal <= 70) return "poor";
  return "bad";
}

function buildOpenMeteoUrl(lat: number, lng: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: [
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "precipitation_probability",
      "is_day",
    ].join(","),
    timezone: timezone,
    forecast_days: "2",
  });

  return `${OPEN_METEO_URL}?${params.toString()}`;
}

export async function getCloudForecast(
  lat: number,
  lng: number,
  timezone: string = "auto"
): Promise<CloudForecast> {
  const url = buildOpenMeteoUrl(lat, lng, timezone);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  // Transform to our format
  const hours: CloudHour[] = data.hourly.time.map((time, i) => {
    const cloudTotal = data.hourly.cloud_cover[i];
    const precipitation = data.hourly.precipitation_probability[i];

    return {
      time,
      isNight: data.hourly.is_day[i] === 0,
      cloudTotal,
      cloudLow: data.hourly.cloud_cover_low[i],
      cloudMid: data.hourly.cloud_cover_mid[i],
      cloudHigh: data.hourly.cloud_cover_high[i],
      precipitation,
      rating: rateCloudConditions(cloudTotal, precipitation),
    };
  });

  // Extract best windows (night hours with good+ rating)
  const bestWindows = hours
    .filter((h) => h.isNight && ["excellent", "great", "good"].includes(h.rating))
    .sort((a, b) => {
      const ratingOrder: Record<CloudRating, number> = {
        excellent: 0,
        great: 1,
        good: 2,
        poor: 3,
        bad: 4,
      };
      return ratingOrder[a.rating] - ratingOrder[b.rating];
    })
    .slice(0, 5)
    .map((h) => ({
      time: h.time,
      cloudTotal: h.cloudTotal,
      rating: h.rating,
    }));

  return {
    location: {
      lat: data.latitude,
      lng: data.longitude,
      timezone: data.timezone,
    },
    generatedAt: new Date().toISOString(),
    hours,
    bestWindows,
  };
}
