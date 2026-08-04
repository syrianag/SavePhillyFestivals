import { NextResponse } from "next/server";
import { organizerEligibilitySchema } from "@/features/organizer-consent/organizer-consent-schema";
import { getOrganizerConsentE2eRepository } from "@/features/organizer-consent/organizer-consent-e2e-fixture";
import { listEligibleOrganizers } from "@/features/organizer-consent/organizer-consent-service";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = organizerEligibilitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid selection." }, { status: 400 });
  try {
    const repository = getOrganizerConsentE2eRepository() || (await import("@/features/organizer-consent/organizer-consent-repository")).organizerConsentRepository;
    return NextResponse.json(await listEligibleOrganizers(parsed.data.selection, repository));
  } catch {
    console.error("[ORGANIZER CONSENT] Eligibility lookup failed without exposing selections.");
    return NextResponse.json({ error: "Organizer choices are temporarily unavailable." }, { status: 500 });
  }
}
