import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error: "This legacy saved-schedule endpoint has been retired.",
      replacement: "/api/schedules/email",
    },
    { status: 410, headers: { "Cache-Control": "private, no-store" } }
  );
}
