// src/app/api/find-spots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { findDarkCandidates } from "@/lib/light-pollution";
import { checkRoadAccess } from "@/lib/accessibility";
import { bortleToScore, scoreToLabel, haversineDistance } from "@/lib/tile-light-pollution";
import { SpotSearchResult } from "@/lib/types";

const CANDIDATES_TO_CHECK = 10;
const RESULTS_TO_RETURN = 3;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const maxDistanceStr = searchParams.get("maxDistance");
  const hasCarStr = searchParams.get("hasCar");

  if (!latStr || !lngStr || !maxDistanceStr) {
    return NextResponse.json(
      { error: "lat, lng, and maxDistance parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const maxDistanceKm = parseFloat(maxDistanceStr);
  const hasCar = hasCarStr !== "false";

  if (isNaN(lat) || isNaN(lng) || isNaN(maxDistanceKm)) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  // Find dark candidates within the radius
  const candidates = findDarkCandidates(
    { lat, lng },
    0,
    maxDistanceKm,
    CANDIDATES_TO_CHECK
  );

  if (candidates.length === 0) {
    return NextResponse.json({ spots: [] });
  }

  // Check road access for each candidate
  const spotsWithAccess = await Promise.all(
    candidates.map(async (candidate) => {
      const roadAccess = await checkRoadAccess({
        lat: candidate.lat,
        lng: candidate.lng,
      });

      return {
        ...candidate,
        hasRoadAccess: roadAccess.hasRoadAccess,
      };
    })
  );

  // Prefer spots with road access, but fall back to all spots if none found
  let filteredSpots = spotsWithAccess.filter((spot) => spot.hasRoadAccess);

  // If no spots have road access, show all candidates anyway (they'll be marked as remote)
  if (filteredSpots.length === 0) {
    filteredSpots = spotsWithAccess;
  }

  // Sort by darkness (lowest bortle first)
  filteredSpots.sort((a, b) => a.bortle - b.bortle);

  // Take top results
  const topSpots = filteredSpots.slice(0, RESULTS_TO_RETURN);

  // Format response
  const results: SpotSearchResult[] = topSpots.map((spot) => ({
    lat: spot.lat,
    lng: spot.lng,
    score: bortleToScore(spot.bortle),
    label: scoreToLabel(bortleToScore(spot.bortle)),
    distanceKm: Math.round(haversineDistance(lat, lng, spot.lat, spot.lng)),
    hasRoadAccess: spot.hasRoadAccess,
  }));

  return NextResponse.json({ spots: results });
}
