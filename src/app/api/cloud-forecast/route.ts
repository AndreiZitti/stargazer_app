import { NextRequest, NextResponse } from "next/server";
import { getCloudForecast } from "@/lib/cloud-forecast";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const timezone = searchParams.get("timezone") || "auto";

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

  try {
    const forecast = await getCloudForecast(lat, lng, timezone);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Cloud forecast error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cloud forecast" },
      { status: 500 }
    );
  }
}
