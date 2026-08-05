import { NextResponse } from "next/server";
import { z } from "zod";

// F-08 deliberately has no public Google Drive transport: F-07 has no operational
// production scanner/decoder. Returning a stable private fallback is safer than ever
// exposing a Drive identifier or redirect URL. A future proxy must query the shared
// eligibility predicate and stream bytes server-side after transport health verification.
export async function GET(_request, context) {
  const parsed = z.uuid().safeParse((await context.params)?.id);
  if (!parsed.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}
