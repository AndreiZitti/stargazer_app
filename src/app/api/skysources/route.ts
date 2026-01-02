import { NextRequest, NextResponse } from "next/server";

// Proxy to NoctuaSky API to bypass CORS
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "10";
  const exact = searchParams.get("exact");

  const url = `https://api.noctuasky.com/api/v1/skysources/?q=${encodeURIComponent(q)}&limit=${limit}${exact ? "&exact=true" : ""}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("NoctuaSky API error:", error);
    return NextResponse.json({ error: "Failed to fetch from NoctuaSky API" }, { status: 500 });
  }
}
