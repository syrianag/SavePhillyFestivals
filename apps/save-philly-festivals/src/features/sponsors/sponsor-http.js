import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { authorizeEditor } from "@/features/editorial-workflow/editorial-authorization";
import { EditorialPolicyError } from "@/features/editorial-workflow/editorial-transition-policy";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { enforceProducerMutationOrigin, producerEdgeRateLimitVerified } from "@/features/producer-submission/producer-request-security";
import { sponsorRepository } from "./sponsor-repository";
import { archiveSponsor, createSponsor, listSponsors, updateSponsor } from "./sponsor-service";
import {
  createSponsorSchema,
  listSponsorsQuerySchema,
  SPONSOR_JSON_BODY_LIMIT,
  sponsorIdSchema,
  updateSponsorSchema,
} from "./sponsor-schema";

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

/* Sponsors are editor-managed, so authorization reuses the editorial role check rather than
 * introducing a second admin role surface to keep in step. */
async function dependencies() {
  const { auth } = await import("@/lib/auth");
  return { getSession: auth, userRepository: editorialRepository, repository: sponsorRepository };
}

async function authorized(injected) {
  const values = injected || await dependencies();
  return { ...values, user: await authorizeEditor(values) };
}

async function idFrom(context) {
  const parsed = sponsorIdSchema.safeParse((await context.params)?.id);
  return parsed.success ? parsed.data : null;
}

async function parseJson(request, schema) {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return { response: json({ error: "Content-Type must be application/json." }, 415) };
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > SPONSOR_JSON_BODY_LIMIT)) {
    return { response: json({ error: "Request body is too large." }, 413) };
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > SPONSOR_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };
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
    return json({ error: "Cross-origin sponsor mutation rejected." }, 403);
  }
  if (!(values.edgeRateLimitVerified ?? producerEdgeRateLimitVerified())) {
    return json({ error: "Sponsor mutations are unavailable until edge rate limiting is verified." }, 503);
  }
  if (!consume(values.user.id)) return json({ error: "Too many sponsor requests. Try again later." }, 429);
  return null;
}

function handled(error) {
  if (error instanceof EditorialPolicyError && error.code === "forbidden") return json({ error: error.message, code: error.code }, 403);
  if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
  console.error("[SPONSORS] Request failed; private data was redacted.");
  return json({ error: "The sponsor request could not be processed." }, 500);
}

export async function handleSponsorList(request, injected) {
  try {
    const values = await authorized(injected);
    const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = listSponsorsQuerySchema.safeParse(raw);
    if (!parsed.success) return json({ error: "Invalid query." }, 400);
    return json(await listSponsors(parsed.data, values));
  } catch (error) { return handled(error); }
}

export async function handleSponsorCreate(request, injected) {
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, createSponsorSchema); if (parsed.response) return parsed.response;
    return json(await createSponsor({ ...parsed.data, created_by_user_id: values.user.id }, values), 201);
  } catch (error) { return handled(error); }
}

export async function handleSponsorUpdate(request, context, injected) {
  const id = await idFrom(context); if (!id) return json({ error: "Sponsor not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, updateSponsorSchema); if (parsed.response) return parsed.response;
    return json(await updateSponsor(id, parsed.data, values));
  } catch (error) { return handled(error); }
}

export async function handleSponsorArchive(request, context, injected) {
  const id = await idFrom(context); if (!id) return json({ error: "Sponsor not found." }, 404);
  try {
    const values = await authorized(injected);
    const gate = mutationGate(request, values); if (gate) return gate;
    return json(await archiveSponsor(id, values));
  } catch (error) { return handled(error); }
}
