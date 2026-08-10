import { NextResponse } from "next/server";

import { geocodingRepository } from "@/features/festivals/geocoding-repository";
import { authorizeGeocodeSweep, runGeocodeSweep } from "@/features/festivals/geocoding-service";

export const dynamic = "force-dynamic";

/**
 * Scheduled geocoding sweep.
 *
 * Bearer-guarded with a constant-time comparison rather than left open: it writes to festival
 * rows and spends a rate-limited third-party quota, so an unauthenticated caller could both
 * corrupt coordinates and get the application's Nominatim access throttled.
 */
export async function POST(request) {
  if (!authorizeGeocodeSweep(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const outcome = await runGeocodeSweep({ repository: geocodingRepository });
    return NextResponse.json(outcome, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[GEOCODE SWEEP] Failed.", error?.message);
    return NextResponse.json({ error: "Sweep failed." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
