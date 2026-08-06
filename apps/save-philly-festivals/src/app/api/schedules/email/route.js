import { NextResponse } from "next/server";
import {
  extractTrustedRequestIp,
  localPublicMutationRateLimiter,
  parsePublicMutationJson,
  publicMutationEdgeRateLimitVerified,
  publicMutationGuard,
} from "@/features/public-mutation/public-mutation-security";
import { getScheduleEmailE2eDependencies } from "@/features/schedule-email/schedule-email-e2e-fixture";
import { scheduleEmailRequestSchema } from "@/features/schedule-email/schedule-email-schema";
import {
  IdempotencyConflictError,
  NoResolvedScheduleItemsError,
  submitScheduleEmail,
} from "@/features/schedule-email/schedule-email-service";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });
const json = (body, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

async function productionDependencies() {
  const [{ scheduleEmailRepository }, { scheduleEmailProvider }] = await Promise.all([
    import("@/features/schedule-email/schedule-email-repository"),
    import("@/lib/mail"),
  ]);
  return {
    repository: scheduleEmailRepository,
    provider: scheduleEmailProvider,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: publicMutationEdgeRateLimitVerified(),
    rateLimiter: localPublicMutationRateLimiter,
  };
}

export async function handleScheduleEmailPost(request, injected) {
  const dependencies = injected || getScheduleEmailE2eDependencies() || await productionDependencies();
  const rejected = publicMutationGuard(request, {
    ...dependencies,
    identifier: extractTrustedRequestIp(request),
    operation: "schedule_email",
  });
  if (rejected) return rejected;

  const body = await parsePublicMutationJson(request);
  if (body.response) return body.response;
  const parsed = scheduleEmailRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return json({
      error: "Invalid schedule email request.",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }, 400);
  }

  try {
    const result = await submitScheduleEmail(parsed.data, dependencies);
    const status = result.status === "pending" ? 202 : result.status === "failed" ? 502 : result.replayed ? 200 : 201;
    return json(result, status);
  } catch (error) {
    if (error instanceof NoResolvedScheduleItemsError || error instanceof IdempotencyConflictError) {
      return json({ error: error.message }, error.statusCode);
    }
    console.error("[SCHEDULE EMAIL] Request failed without exposing recipient data.");
    return json({ error: "The schedule email request could not be processed. Please try again." }, 500);
  }
}

export function POST(request) {
  return handleScheduleEmailPost(request);
}
