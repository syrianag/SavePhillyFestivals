import { NextResponse } from "next/server";

import { authorizeEditor } from "@/features/editorial-workflow/editorial-authorization";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { geocodingRepository } from "@/features/festivals/geocoding-repository";
import { geocodeFestival } from "@/features/festivals/geocoding-service";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * Geocode one festival on demand.
 *
 * A third-party call in a request handler is acceptable here precisely because it is
 * admin-triggered, singular, and non-critical: it puts a human in the loop at the moment
 * coverage matters — just before publishing — without a slow provider ever sitting in a
 * visitor's or producer's path.
 */
export async function POST(request, context) {
  try {
    const { auth } = await import("@/lib/auth");
    await authorizeEditor({ getSession: auth, userRepository: editorialRepository, repository: editorialRepository });

    const id = (await context.params)?.id;
    const festival = id ? await geocodingRepository.findForGeocode(id) : null;
    if (!festival) return NextResponse.json({ error: "Festival not found." }, { status: 404, headers: HEADERS });

    const result = await geocodeFestival(festival, { repository: geocodingRepository, throttle: false });
    return NextResponse.json(
      result.ok
        ? { resolved: true, latitude: result.latitude, longitude: result.longitude }
        : { resolved: false, reason: result.reason },
      { headers: HEADERS }
    );
  } catch (error) {
    if (error?.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers: HEADERS });
    console.error("[GEOCODE] On-demand request failed.", error?.message);
    return NextResponse.json({ error: "Geocoding failed." }, { status: 500, headers: HEADERS });
  }
}
