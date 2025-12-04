import { NextRequest, NextResponse } from "next/server";
import { findDarkCandidates } from "@/lib/light-pollution";
import { getAccessibilityScore } from "@/lib/accessibility";
import { reverseGeocode } from "@/lib/geocode";
import { ScoredSpot, SpotsResponseV2 } from "@/lib/types";

const RADIUS_BANDS = [
  { min: 0, max: 10, label: 10 },
  { min: 10, max: 50, label: 50 },
  { min: 50, max: 150, label: 150 },
];

const CANDIDATES_PER_BAND = 5;

// Weighting for combined score (higher = more important)
const DARKNESS_WEIGHT = 2;
const ACCESSIBILITY_WEIGHT = 1;

function getBortleLabel(bortle: number): string {
  const labels: Record<number, string> = {
    1: "Excellent",
    2: "Excellent",
    3: "Good",
    4: "Good",
    5: "Moderate",
    6: "Moderate",
    7: "Poor",
    8: "Poor",
    9: "Poor",
  };
  return labels[Math.min(9, Math.max(1, Math.round(bortle)))] || "Unknown";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  const origin = { lat, lng };
  const spots: ScoredSpot[] = [];

  // Process each radius band
  for (const band of RADIUS_BANDS) {
    const candidates = findDarkCandidates(origin, band.min, band.max, CANDIDATES_PER_BAND);

    if (candidates.length === 0) continue;

    // Score each candidate for accessibility
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const accessibility = await getAccessibilityScore({
          lat: candidate.lat,
          lng: candidate.lng,
        });

        // Combined score: darkness (inverted bortle) + accessibility
        const darknessScore = (9 - candidate.bortle) * DARKNESS_WEIGHT;
        const combinedScore = darknessScore + (accessibility.score * ACCESSIBILITY_WEIGHT);

        return {
          ...candidate,
          accessibilityScore: accessibility.score,
          accessibilityFeatures: accessibility.features,
          combinedScore,
        };
      })
    );

    // Sort by combined score (highest first)
    scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    // Take the best candidate for this band
    const best = scoredCandidates[0];

    spots.push({
      radius: band.label,
      lat: best.lat,
      lng: best.lng,
      bortle: best.bortle,
      label: getBortleLabel(best.bortle),
      accessibilityScore: best.accessibilityScore,
      accessibilityFeatures: best.accessibilityFeatures,
    });
  }

  // Get location name for origin
  const displayName = await reverseGeocode(lat, lng);

  const response: SpotsResponseV2 = {
    origin: {
      lat,
      lng,
      displayName: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    },
    searchLocation: { lat, lng },
    spots,
  };

  return NextResponse.json(response);
}
