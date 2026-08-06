import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "This legacy saved-schedule endpoint has been retired.",
      replacement: "/calendar",
    },
    { status: 410, headers: { "Cache-Control": "private, no-store" } }
  );
}

export function GET() {
  return gone();
}

export function DELETE() {
  return gone();
}
