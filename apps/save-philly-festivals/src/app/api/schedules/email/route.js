import { NextResponse } from "next/server";
import { getScheduleEmailE2eDependencies } from "@/features/schedule-email/schedule-email-e2e-fixture";
import { scheduleEmailRequestSchema } from "@/features/schedule-email/schedule-email-schema";
import {
  IdempotencyConflictError,
  NoResolvedScheduleItemsError,
  submitScheduleEmail,
} from "@/features/schedule-email/schedule-email-service";

async function productionDependencies() {
  const [{ scheduleEmailRepository }, { scheduleEmailProvider }] = await Promise.all([
    import("@/features/schedule-email/schedule-email-repository"),
    import("@/lib/mail"),
  ]);
  return { repository: scheduleEmailRepository, provider: scheduleEmailProvider };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = scheduleEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid schedule email request.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  try {
    const dependencies = getScheduleEmailE2eDependencies() || await productionDependencies();
    const result = await submitScheduleEmail(parsed.data, {
      ...dependencies,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
    const status = result.status === "failed" ? 502 : result.replayed ? 200 : 201;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (
      error instanceof NoResolvedScheduleItemsError ||
      error instanceof IdempotencyConflictError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[SCHEDULE EMAIL] Request failed without exposing recipient data.");
    return NextResponse.json(
      { error: "The schedule email request could not be processed. Please try again." },
      { status: 500 }
    );
  }
}
