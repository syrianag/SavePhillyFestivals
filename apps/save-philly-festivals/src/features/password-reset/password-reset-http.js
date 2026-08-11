import { NextResponse } from "next/server";

import { parsePublicMutationJson } from "@/features/public-mutation/public-mutation-security";
import { passwordResetE2EDependencies } from "./password-reset-e2e-fixture";
import { PasswordResetError, passwordResetRepository } from "./password-reset-repository";
import {
  PASSWORD_RESET_JSON_BODY_LIMIT,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "./password-reset-schema";
import {
  enforcePasswordResetOrigin,
  extractTrustedRequestIp,
  localPasswordResetRateLimiter,
} from "./password-reset-security";
import { confirmPasswordReset, requestPasswordReset } from "./password-reset-service";

const HEADERS = { "Cache-Control": "private, no-store" };

function json(body, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }

/** Resolved through an async indirection so tests and the E2E fixture can substitute collaborators
 * without this module importing prisma or the mail provider. */
async function dependencies(injected) {
  if (injected) return injected;
  return passwordResetE2EDependencies() || { repository: passwordResetRepository };
}

function guard(request, operation, rateLimiter) {
  if (!enforcePasswordResetOrigin(request, process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV)) {
    return json({ error: "Cross-origin request rejected." }, 403);
  }
  if (rateLimiter?.consume?.({ identifier: extractTrustedRequestIp(request), operation }) === false) {
    return json({ error: "Too many attempts. Try again later." }, 429);
  }
  return null;
}

function parsed(schema, body) {
  const result = schema.safeParse(body);
  return result.success
    ? { data: result.data }
    : {
        response: json({
          error: "Invalid request.",
          issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        }, 400),
      };
}

function handled(error) {
  if (error instanceof PasswordResetError) return json({ error: error.message, code: error.code }, error.statusCode);
  console.error("[PASSWORD RESET] Request failed; private data was redacted.");
  return json({ error: "The request could not be processed." }, 500);
}

/**
 * Always answers 202 with the same body.
 *
 * A 404 for an unknown address, or a 200-vs-404 split, would make this an account enumeration
 * oracle — the reason the endpoint reports acceptance of the *request* rather than the outcome of
 * the send. Validation failures still return 400: a malformed email is a client bug, not a signal
 * about who is registered.
 */
export async function handlePasswordResetRequest(request, injected) {
  try {
    const gate = guard(request, "password_reset_request", injected?.rateLimiter ?? localPasswordResetRateLimiter);
    if (gate) return gate;

    const body = await parsePublicMutationJson(request, PASSWORD_RESET_JSON_BODY_LIMIT);
    if (body.response) return body.response;
    const input = parsed(passwordResetRequestSchema, body.data);
    if (input.response) return input.response;

    const values = await dependencies(injected);
    return json(await requestPasswordReset(input.data, values), 202);
  } catch (error) { return handled(error); }
}

export async function handlePasswordResetConfirm(request, injected) {
  try {
    const gate = guard(request, "password_reset_confirm", injected?.rateLimiter ?? localPasswordResetRateLimiter);
    if (gate) return gate;

    const body = await parsePublicMutationJson(request, PASSWORD_RESET_JSON_BODY_LIMIT);
    if (body.response) return body.response;
    const input = parsed(passwordResetConfirmSchema, body.data);
    if (input.response) return input.response;

    const values = await dependencies(injected);
    return json(await confirmPasswordReset(input.data, values));
  } catch (error) { return handled(error); }
}
