import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { authorizeEditor } from "@/features/editorial-workflow/editorial-authorization";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { EditorialPolicyError } from "@/features/editorial-workflow/editorial-transition-policy";
import { enforceProducerMutationOrigin, producerEdgeRateLimitVerified } from "@/features/producer-submission/producer-request-security";
import { scheduleRepository } from "./schedule-repository";
import { createScheduleSchema, SCHEDULE_JSON_BODY_LIMIT, scheduleIdSchema, updateScheduleSchema } from "./schedule-schema";
import {
  createFestivalSchedule,
  listFestivalSchedules,
  removeFestivalSchedule,
  updateFestivalSchedule,
} from "./schedule-service";

const HEADERS = { "Cache-Control": "private, no-store" };
const buckets = new Map();
const LIMIT = 60;

function json(body, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }

function consume(userId) {
  const now = Date.now();
  const current = buckets.get(userId);
  if (!current || current.resetAt <= now) { buckets.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  current.count += 1;
  return current.count <= LIMIT;
}

async function dependencies() {
  const { auth } = await import("@/lib/auth");
  return { getSession: auth, userRepository: editorialRepository, repository: scheduleRepository };
}

async function authorized(injected) {
  const values = injected || await dependencies();
  return { ...values, user: await authorizeEditor(values) };
}

async function idsFrom(context) {
  const params = await context.params;
  const festivalId = scheduleIdSchema.safeParse(params?.id);
  const scheduleId = params?.scheduleId ? scheduleIdSchema.safeParse(params.scheduleId) : { success: true, data: null };
  return festivalId.success && scheduleId.success
    ? { festivalId: festivalId.data, scheduleId: scheduleId.data }
    : null;
}

async function parseJson(request, schema) {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return { response: json({ error: "Content-Type must be application/json." }, 415) };
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > SCHEDULE_JSON_BODY_LIMIT)) {
    return { response: json({ error: "Request body is too large." }, 413) };
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > SCHEDULE_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };
  let body;
  try { body = JSON.parse(Buffer.from(bytes).toString("utf8")); }
  catch { return { response: json({ error: "Request body must be valid JSON." }, 400) }; }
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { data: parsed.data }
    : { response: json({ error: "Invalid request.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, 400) };
}

function mutationGate(request, values) {
  if (!enforceProducerMutationOrigin(request, values.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL, values.nodeEnv ?? process.env.NODE_ENV)) {
    return json({ error: "Cross-origin programme mutation rejected." }, 403);
  }
  if (!(values.edgeRateLimitVerified ?? producerEdgeRateLimitVerified())) {
    return json({
      error: "Programme changes are unavailable until edge rate limiting is verified. Set PRODUCER_EDGE_RATE_LIMIT_VERIFIED=1 in the production environment once identity/IP-aware rate limiting is enabled at the deployment edge.",
      code: "edge_rate_limit_unverified",
    }, 503);
  }
  if (!consume(values.user.id)) return json({ error: "Too many programme requests. Try again later." }, 429);
  return null;
}

function handled(error) {
  if (error instanceof EditorialPolicyError && error.code === "forbidden") return json({ error: error.message, code: error.code }, 403);
  if (error?.issues) return json({ error: error.message, code: error.code, issues: error.issues }, error.statusCode ?? 400);
  if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
  console.error("[SCHEDULES] Request failed; private data was redacted.");
  return json({ error: "The programme request could not be processed." }, 500);
}

export async function handleScheduleList(_request, context, injected) {
  const ids = await idsFrom(context); if (!ids) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected);
    return json(await listFestivalSchedules(ids.festivalId, values));
  } catch (error) { return handled(error); }
}

export async function handleScheduleCreate(request, context, injected) {
  const ids = await idsFrom(context); if (!ids) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, createScheduleSchema); if (parsed.response) return parsed.response;
    return json(await createFestivalSchedule(ids.festivalId, parsed.data, values), 201);
  } catch (error) { return handled(error); }
}

export async function handleScheduleUpdate(request, context, injected) {
  const ids = await idsFrom(context);
  if (!ids?.scheduleId) return json({ error: "Programme entry not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, updateScheduleSchema); if (parsed.response) return parsed.response;
    return json(await updateFestivalSchedule(ids.festivalId, ids.scheduleId, parsed.data, values));
  } catch (error) { return handled(error); }
}

export async function handleScheduleDelete(request, context, injected) {
  const ids = await idsFrom(context);
  if (!ids?.scheduleId) return json({ error: "Programme entry not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    return json(await removeFestivalSchedule(ids.festivalId, ids.scheduleId, values));
  } catch (error) { return handled(error); }
}
