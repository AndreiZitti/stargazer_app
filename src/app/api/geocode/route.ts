import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address") || searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const isReverse = searchParams.get("reverse") === "true";

  // Reverse geocoding (lat/lng to address)
  if (isReverse && lat && lng) {
    const displayName = await reverseGeocode(parseFloat(lat), parseFloat(lng));

    if (!displayName) {
      return NextResponse.json({ displayName: null });
    }

    return NextResponse.json({ displayName });
  }

  // Forward geocoding (address to lat/lng)
  if (!address) {
    return NextResponse.json(
      { error: "Address or q parameter is required" },
      { status: 400 }
    );
  }

  const result = await geocodeAddress(address);

  if (!result) {
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
