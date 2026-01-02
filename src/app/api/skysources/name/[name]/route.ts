import { NextRequest, NextResponse } from "next/server";

// Proxy to NoctuaSky API to bypass CORS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const url = `https://api.noctuasky.com/api/v1/skysources/name/${encodeURIComponent(name)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("NoctuaSky API error:", error);
    return NextResponse.json({ error: "Failed to fetch from NoctuaSky API" }, { status: 500 });
  }
}
