import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error: "This legacy public upload endpoint has been retired.",
      replacement: "/api/producer/festivals/[id]/assets",
    },
    { status: 410, headers: { "Cache-Control": "private, no-store" } }
  );
}
