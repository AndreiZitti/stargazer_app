import { NextRequest, NextResponse } from "next/server";

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startLat = parseFloat(searchParams.get("startLat") || "0");
  const startLng = parseFloat(searchParams.get("startLng") || "0");
  const endLat = parseFloat(searchParams.get("endLat") || "0");
  const endLng = parseFloat(searchParams.get("endLng") || "0");
  const profile = searchParams.get("profile") || "driving-car";

  if (!ORS_API_KEY) {
    return NextResponse.json(
      { error: "Routing not configured. Please add OPENROUTESERVICE_API_KEY to environment." },
      { status: 500 }
    );
  }

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json(
      { error: "Missing coordinates. Required: startLat, startLng, endLat, endLng" },
      { status: 400 }
    );
  }

  try {
    // ORS expects coordinates as lng,lat (opposite of lat,lng)
    const response = await fetch(
      `${ORS_BASE_URL}/${profile}?api_key=${ORS_API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`,
      {
        headers: {
          "Accept": "application/json, application/geo+json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Routing failed" },
        { status: response.status }
      );
    }

    // Extract route information from GeoJSON response
    const feature = data.features?.[0];
    const properties = feature?.properties;
    const geometry = feature?.geometry;
    const segment = properties?.segments?.[0];

    return NextResponse.json({
      distance: segment?.distance || 0, // meters
      duration: segment?.duration || 0, // seconds
      coordinates: geometry?.coordinates || [], // [[lng, lat], ...]
      instructions: segment?.steps || [],
      bounds: data.bbox, // [minLng, minLat, maxLng, maxLat]
    });
  } catch (error) {
    console.error("Routing error:", error);
    return NextResponse.json(
      { error: "Routing service unavailable" },
      { status: 500 }
    );
  }
}
