// src/lib/tile-light-pollution.ts
import { Coordinates } from "./types";

const TILE_URL_TEMPLATE = "https://djlorenz.github.io/lightpollution/tiles/2024/tile_{z}_{x}_{y}.png";
const TILE_SIZE = 256;
const MAX_ZOOM = 8;

// Color to Bortle mapping (RGB values from World Atlas legend)
// These are approximate - we match by finding closest color
const BORTLE_COLORS: { r: number; g: number; b: number; bortle: number }[] = [
  { r: 0, g: 0, b: 0, bortle: 1 },       // Black - pristine
  { r: 64, g: 64, b: 64, bortle: 2 },    // Dark gray
  { r: 128, g: 128, b: 128, bortle: 3 }, // Gray
  { r: 0, g: 0, b: 255, bortle: 4 },     // Blue
  { r: 0, g: 255, b: 0, bortle: 5 },     // Green
  { r: 255, g: 255, b: 0, bortle: 6 },   // Yellow
  { r: 255, g: 165, b: 0, bortle: 7 },   // Orange
  { r: 255, g: 0, b: 0, bortle: 8 },     // Red
  { r: 255, g: 255, b: 255, bortle: 9 }, // White - urban
];

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function latLngToPixelInTile(lat: number, lng: number, zoom: number): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yTile = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;

  const px = Math.floor((xTile % 1) * TILE_SIZE);
  const py = Math.floor((yTile % 1) * TILE_SIZE);
  return { px, py };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

function rgbToBortle(r: number, g: number, b: number): number {
  // Transparent or very dark = pristine (Bortle 1)
  if (r < 10 && g < 10 && b < 10) return 1;

  // Find closest matching color
  let closestBortle = 5;
  let minDistance = Infinity;

  for (const color of BORTLE_COLORS) {
    const dist = colorDistance(r, g, b, color.r, color.g, color.b);
    if (dist < minDistance) {
      minDistance = dist;
      closestBortle = color.bortle;
    }
  }

  return closestBortle;
}

export async function getBortleAtPoint(lat: number, lng: number): Promise<number> {
  const zoom = MAX_ZOOM;
  const { x, y } = latLngToTile(lat, lng, zoom);
  const { px, py } = latLngToPixelInTile(lat, lng, zoom);

  const tileUrl = TILE_URL_TEMPLATE
    .replace("{z}", zoom.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());

  try {
    const response = await fetch(tileUrl);
    if (!response.ok) {
      console.error("Failed to fetch tile:", tileUrl);
      return 5; // Default to moderate
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Use canvas to read pixel (this runs server-side in API route)
    // For server-side, we need to parse PNG directly
    // Simplified: return estimated value based on tile availability
    // Full implementation would use 'pngjs' or similar

    // For now, return a placeholder - we'll enhance this
    return 5;
  } catch (error) {
    console.error("Error reading tile:", error);
    return 5;
  }
}

export function bortleToScore(bortle: number): number {
  // Bortle 1 = 10, Bortle 9 = 1, linear mapping
  // Score = 11 - bortle, but cap between 1-10
  return Math.max(1, Math.min(10, 11 - bortle));
}

export function scoreToLabel(score: number): string {
  if (score >= 9) return "Exceptional - pristine dark sky";
  if (score >= 7) return "Great for stargazing";
  if (score >= 5) return "Decent - some light pollution";
  if (score >= 3) return "Limited - bright sky";
  return "Poor - urban glow";
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
