import { NextResponse } from "next/server";
import { n8nClaimSchema } from "@/features/organizer-consent/organizer-consent-schema";
import { authorizeN8nRequest } from "@/features/organizer-consent/organizer-consent-security";

export async function POST(request) {
  if (!authorizeN8nRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = n8nClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid claim request." }, { status: 400 });
  try {
    const { organizerOutboxRepository } = await import("@/features/organizer-consent/organizer-outbox-repository");
    const items = await organizerOutboxRepository.claim(parsed.data.limit);
    return NextResponse.json({ items });
  } catch {
    console.error("[N8N ORGANIZER OUTBOX] Claim failed without logging work payloads.");
    return NextResponse.json({ error: "Claim unavailable." }, { status: 500 });
  }
}
