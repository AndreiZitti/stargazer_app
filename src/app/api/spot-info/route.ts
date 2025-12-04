import { NextRequest, NextResponse } from "next/server";
import { getAccessibilityScore } from "@/lib/accessibility";

const BORTLE_LABELS: Record<number, string> = {
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

  // Get accessibility info for this spot
  const accessibility = await getAccessibilityScore({ lat, lng });

  // For now, we don't have real-time Bortle data for arbitrary points
  // In a real app, you'd query the VIIRS data or a Bortle API
  // For demo, we'll estimate based on accessibility (rural areas tend to be darker)
  const estimatedBortle = accessibility.score >= 4 ? 3 :
                          accessibility.score >= 2 ? 5 : 7;

  return NextResponse.json({
    lat,
    lng,
    bortle: estimatedBortle,
    label: BORTLE_LABELS[estimatedBortle] || "Unknown",
    accessibilityScore: accessibility.score,
    accessibilityFeatures: accessibility.features,
  });
}
