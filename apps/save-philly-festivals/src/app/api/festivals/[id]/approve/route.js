import { NextResponse } from "next/server";

// Compatibility endpoint retained so old links fail safely without bypassing F-08.
export function POST() {
  return NextResponse.json({ error: "This moderation endpoint has been retired. Use /api/admin/festivals/:id/transitions." }, { status: 410 });
}
