import { NextRequest, NextResponse } from "next/server";
import { checkRoadAccess } from "@/lib/accessibility";
import { bortleToScore, scoreToLabel } from "@/lib/tile-light-pollution";
// Keep using existing grid for now until tile reader is complete
import { findDarkCandidates } from "@/lib/light-pollution";

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

  // Get road access info
  const roadAccess = await checkRoadAccess({ lat, lng });

  // Get Bortle from existing grid (fallback until tile reader works)
  // Sample a tiny area around the point
  const candidates = findDarkCandidates({ lat, lng }, 0, 1, 1);
  const bortle = candidates.length > 0 ? candidates[0].bortle : 5;

  // Convert to 10-point score
  const score = bortleToScore(bortle);
  const label = scoreToLabel(score);

  return NextResponse.json({
    lat,
    lng,
    score,
    label,
    bortle,
    hasRoadAccess: roadAccess.hasRoadAccess,
    nearestFeature: roadAccess.nearestFeature,
  });
}
