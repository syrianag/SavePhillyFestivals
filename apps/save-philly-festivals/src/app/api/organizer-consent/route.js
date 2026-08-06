import { NextResponse } from "next/server";
import { getOrganizerConsentE2eRepository } from "@/features/organizer-consent/organizer-consent-e2e-fixture";
import { organizerConsentSchema, revokeConsentSchema } from "@/features/organizer-consent/organizer-consent-schema";
import { extractTrustedRequestIp } from "@/features/organizer-consent/organizer-consent-security";
import { ConsentConflictError, NoEligibleOrganizerError, revokeOrganizerConsent, submitOrganizerConsent } from "@/features/organizer-consent/organizer-consent-service";
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

async function guardedBody(request, dependencies, operation) {
  const rejected = publicMutationGuard(request, {
    ...dependencies,
    identifier: extractTrustedRequestIp(request),
    operation,
  });
  if (rejected) return { response: rejected };
  return parsePublicMutationJson(request);
}

export async function handleOrganizerConsentPost(request, injected) {
  const dependencies = injected || await productionDependencies();
  const body = await guardedBody(request, dependencies, "organizer_consent");
  if (body.response) return body.response;
  const parsed = organizerConsentSchema.safeParse(body.data);
  if (!parsed.success) return json({ error: "Invalid organizer consent request." }, 400);
  try {
    const result = await submitOrganizerConsent(parsed.data, {
      repository: dependencies.repository,
      requestIp: extractTrustedRequestIp(request),
    });
    return json(result, result.replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof ConsentConflictError || error instanceof NoEligibleOrganizerError) {
      return json({ error: error.message }, error.statusCode);
    }
    console.error("[ORGANIZER CONSENT] Submission failed without logging consent PII.");
    return json({ error: "Consent could not be recorded. No organizer request was queued." }, 500);
  }
}

export async function handleOrganizerConsentDelete(request, injected) {
  const dependencies = injected || await productionDependencies();
  const body = await guardedBody(request, dependencies, "organizer_consent_revoke");
  if (body.response) return body.response;
  const parsed = revokeConsentSchema.safeParse(body.data);
  if (!parsed.success) return json({ error: "Invalid revocation request." }, 400);
  const revoked = await revokeOrganizerConsent(parsed.data, dependencies.repository);
  if (!revoked) return json({ error: "Consent was not found or was already revoked." }, 404);
  return json({ revoked: true });
}

export function POST(request) {
  return handleOrganizerConsentPost(request);
}

export function DELETE(request) {
  return handleOrganizerConsentDelete(request);
}
