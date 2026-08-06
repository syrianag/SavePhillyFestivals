import { NextResponse } from "next/server";
import { organizerEligibilitySchema } from "@/features/organizer-consent/organizer-consent-schema";
import { getOrganizerConsentE2eRepository } from "@/features/organizer-consent/organizer-consent-e2e-fixture";
import { extractTrustedRequestIp } from "@/features/organizer-consent/organizer-consent-security";
import { listEligibleOrganizers } from "@/features/organizer-consent/organizer-consent-service";
import {
  localPublicMutationRateLimiter,
  parsePublicMutationJson,
  publicMutationEdgeRateLimitVerified,
  publicMutationGuard,
} from "@/features/public-mutation/public-mutation-security";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });
const json = (body, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

async function productionDependencies() {
  return {
    repository: getOrganizerConsentE2eRepository() || (await import("@/features/organizer-consent/organizer-consent-repository")).organizerConsentRepository,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: publicMutationEdgeRateLimitVerified(),
    rateLimiter: localPublicMutationRateLimiter,
  };
}

export async function handleOrganizerEligibilityPost(request, injected) {
  const dependencies = injected || await productionDependencies();
  const rejected = publicMutationGuard(request, {
    ...dependencies,
    identifier: extractTrustedRequestIp(request),
    operation: "organizer_consent_eligibility",
  });
  if (rejected) return rejected;
  const body = await parsePublicMutationJson(request);
  if (body.response) return body.response;
  const parsed = organizerEligibilitySchema.safeParse(body.data);
  if (!parsed.success) return json({ error: "Invalid selection." }, 400);
  try {
    return json(await listEligibleOrganizers(parsed.data.selection, dependencies.repository));
  } catch {
    console.error("[ORGANIZER CONSENT] Eligibility lookup failed without exposing selections.");
    return json({ error: "Organizer choices are temporarily unavailable." }, 500);
  }
}

export function POST(request) {
  return handleOrganizerEligibilityPost(request);
}
