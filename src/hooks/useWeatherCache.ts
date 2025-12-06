"use client";

import { useState, useCallback, useRef } from "react";
import { TonightForecast } from "@/lib/types";

interface CacheEntry {
  data: TonightForecast;
  timestamp: number;
}

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export function useWeatherCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const getFromCache = useCallback((lat: number, lng: number): TonightForecast | null => {
    const key = getCacheKey(lat, lng);
    const entry = cacheRef.current.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
    if (isExpired) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const setInCache = useCallback((lat: number, lng: number, data: TonightForecast) => {
    const key = getCacheKey(lat, lng);
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<TonightForecast | null> => {
    // Check cache first
    const cached = getFromCache(lat, lng);
    if (cached) return cached;

    const key = getCacheKey(lat, lng);

    // Prevent duplicate fetches
    if (loading.has(key)) return null;

    setLoading(prev => new Set(prev).add(key));

    try {
      const response = await fetch(`/api/weather/tonight?lat=${lat}&lng=${lng}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.tonight) {
        setInCache(lat, lng, data.tonight);
        return data.tonight;
      }
      return null;
    } catch {
      return null;
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [getFromCache, setInCache, loading]);

  return { fetchWeather, getFromCache };
}
