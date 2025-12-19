import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get("input");
  const sessionToken = searchParams.get("sessionToken");

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ predictions: [], error: "API key not configured" });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("types", "geocode");
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json({ predictions: [], error: data.status });
    }

    const predictions = (data.predictions || []).map((prediction: {
      place_id: string;
      structured_formatting: {
        main_text: string;
        secondary_text?: string;
      };
      description: string;
    }) => ({
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text || "",
      fullText: prediction.description,
    }));

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json({ predictions: [], error: "Request failed" });
  }
}
