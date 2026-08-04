import { NextResponse } from "next/server";
import { n8nReportSchema } from "@/features/organizer-consent/organizer-consent-schema";
import { authorizeN8nRequest } from "@/features/organizer-consent/organizer-consent-security";

export async function POST(request) {
  if (!authorizeN8nRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = n8nReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report request." }, { status: 400 });
  try {
    const { organizerOutboxRepository } = await import("@/features/organizer-consent/organizer-outbox-repository");
    const result = await organizerOutboxRepository.report(parsed.data);
    return NextResponse.json(result, { status: result.accepted ? 200 : 409 });
  } catch {
    console.error("[N8N ORGANIZER OUTBOX] Report failed without logging work payloads.");
    return NextResponse.json({ error: "Report unavailable." }, { status: 500 });
  }
}
