import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { producerNotificationProvider } from "@/lib/mail";
import { authorizeEditor } from "./editorial-authorization";
import { EditorialPolicyError } from "./editorial-transition-policy";
import { editorialRepository } from "./editorial-repository";
import { EDITORIAL_JSON_BODY_LIMIT, festivalIdSchema, listFestivalsQuerySchema, notificationIdSchema, reviewAssetSchema, setFeaturedSchema, transitionFestivalSchema } from "./editorial-schema";
import { getEditorialFestival, listEditorialFestivals, retryWorkflowNotification, reviewFestivalAsset, setFestivalFeatured, transitionFestival } from "./editorial-service";
import { enforceProducerMutationOrigin, producerEdgeRateLimitVerified } from "@/features/producer-submission/producer-request-security";

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
  const { editorialE2EDependencies } = await import("./editorial-e2e-fixture");
  const fixture = await editorialE2EDependencies();
  if (fixture) return fixture;
  const { auth } = await import("@/lib/auth");
  return { getSession: auth, userRepository: editorialRepository, repository: editorialRepository, notificationProvider: producerNotificationProvider };
}
async function authorized(injected) {
  const values = injected || await dependencies();
  return { ...values, user: await authorizeEditor(values) };
}
async function idFrom(context) {
  const parsed = festivalIdSchema.safeParse((await context.params)?.id);
  return parsed.success ? parsed.data : null;
}
async function notificationIdFrom(context) {
  const parsed = notificationIdSchema.safeParse((await context.params)?.notificationId);
  return parsed.success ? parsed.data : null;
}
async function parseJson(request, schema) {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return { response: json({ error: "Content-Type must be application/json." }, 415) };
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > EDITORIAL_JSON_BODY_LIMIT)) return { response: json({ error: "Request body is too large." }, 413) };
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > EDITORIAL_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };
  let body;
  try { body = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return { response: json({ error: "Request body must be valid JSON." }, 400) }; }
  const parsed = schema.safeParse(body);
  return parsed.success ? { data: parsed.data } : { response: json({ error: "Invalid request.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, 400) };
}
function mutationGate(request, values) {
  if (!enforceProducerMutationOrigin(request, values.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL, values.nodeEnv ?? process.env.NODE_ENV)) return json({ error: "Cross-origin editorial mutation rejected." }, 403);
  if (!(values.edgeRateLimitVerified ?? producerEdgeRateLimitVerified())) return json({ error: "Editorial mutations are unavailable until edge rate limiting is verified." }, 503);
  if (!consume(values.user.id)) return json({ error: "Too many editorial requests. Try again later." }, 429);
  return null;
}
function handled(error) {
  if (error instanceof EditorialPolicyError && error.code === "forbidden") return json({ error: error.message, code: error.code }, 403);
  if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
  console.error("[EDITORIAL WORKFLOW] Request failed; private data was redacted.");
  return json({ error: "The editorial request could not be processed." }, 500);
}

export async function handleAdminList(request, injected) {
  try {
    const values = await authorized(injected);
    const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = listFestivalsQuerySchema.safeParse(raw);
    if (!parsed.success) return json({ error: "Invalid query." }, 400);
    return json(await listEditorialFestivals(parsed.data, values));
  } catch (error) { return handled(error); }
}
export async function handleAdminDetail(_request, context, injected) {
  const id = await idFrom(context); if (!id) return json({ error: "Festival not found." }, 404);
  try { const values = await authorized(injected); return json({ festival: await getEditorialFestival(id, values) }); }
  catch (error) { return handled(error); }
}
export async function handleAdminTransition(request, context, injected) {
  const id = await idFrom(context); if (!id) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected); const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, transitionFestivalSchema); if (parsed.response) return parsed.response;
    return json(await transitionFestival(id, parsed.data, values));
  } catch (error) { return handled(error); }
}
export async function handleAdminNotificationRetry(request, context, injected) {
  const id = await idFrom(context);
  const notificationId = await notificationIdFrom(context);
  if (!id || !notificationId) return json({ error: "Workflow notification not found." }, 404);
  try {
    const values = await authorized(injected); const gate = mutationGate(request, values); if (gate) return gate;
    return json(await retryWorkflowNotification(id, notificationId, values));
  } catch (error) { return handled(error); }
}
export async function handleSetFeatured(request, injected) {
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, setFeaturedSchema); if (parsed.response) return parsed.response;
    return json({ festival: await setFestivalFeatured(parsed.data.id, parsed.data.featured, values) });
  } catch (error) { return handled(error); }
}
export async function handleAdminAssetReview(request, context, injected) {
  const id = await idFrom(context); if (!id) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected); const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, reviewAssetSchema); if (parsed.response) return parsed.response;
    return json({ asset: await reviewFestivalAsset(id, parsed.data, values) });
  } catch (error) { return handled(error); }
}
