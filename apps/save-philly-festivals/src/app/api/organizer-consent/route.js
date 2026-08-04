import { NextResponse } from "next/server";
import { getOrganizerConsentE2eRepository } from "@/features/organizer-consent/organizer-consent-e2e-fixture";
import { organizerConsentSchema, revokeConsentSchema } from "@/features/organizer-consent/organizer-consent-schema";
import { extractTrustedRequestIp } from "@/features/organizer-consent/organizer-consent-security";
import { ConsentConflictError, NoEligibleOrganizerError, revokeOrganizerConsent, submitOrganizerConsent } from "@/features/organizer-consent/organizer-consent-service";

async function repository() {
  return getOrganizerConsentE2eRepository() || (await import("@/features/organizer-consent/organizer-consent-repository")).organizerConsentRepository;
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = organizerConsentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid organizer consent request." }, { status: 400 });
  try {
    const result = await submitOrganizerConsent(parsed.data, {
      repository: await repository(),
      requestIp: extractTrustedRequestIp(request),
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof ConsentConflictError || error instanceof NoEligibleOrganizerError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[ORGANIZER CONSENT] Submission failed without logging consent PII.");
    return NextResponse.json({ error: "Consent could not be recorded. No organizer request was queued." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const body = await request.json().catch(() => null);
  const parsed = revokeConsentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid revocation request." }, { status: 400 });
  const revoked = await revokeOrganizerConsent(parsed.data, await repository());
  if (!revoked) return NextResponse.json({ error: "Consent was not found or was already revoked." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
