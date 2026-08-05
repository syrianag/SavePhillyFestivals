import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { authorizeEditor } from "@/features/editorial-workflow/editorial-authorization";
import { festivalIdSchema } from "@/features/editorial-workflow/editorial-schema";
import { enforceProducerMutationOrigin, producerEdgeRateLimitVerified } from "@/features/producer-submission/producer-request-security";
import {
  configureSocialFeedSchema, listSocialPostsQuerySchema, moderateSocialPostSchema,
  socialPostIdSchema, SOCIAL_FEED_JSON_BODY_LIMIT,
} from "./social-feed-schema";
import { socialFeedRepository } from "./social-feed-repository";
import { configureSocialFeed, getAdminSocialFeed, listAdminSocialPosts, moderateSocialPost } from "./social-feed-service";

const HEADERS = { "Cache-Control": "private, no-store" };
const buckets = new Map();
const LIMIT = 60;
const json = (body, status = 200) => NextResponse.json(body, { status, headers: HEADERS });

function consume(userId) {
  const now = Date.now();
  const current = buckets.get(userId);
  if (!current || current.resetAt <= now) { buckets.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  current.count += 1;
  return current.count <= LIMIT;
}

async function dependencies() {
  const { socialFeedE2EDependencies } = await import("./social-feed-e2e-fixture");
  const fixture = await socialFeedE2EDependencies();
  if (fixture) return fixture;
  const { auth } = await import("@/lib/auth");
  return { getSession: auth, userRepository: socialFeedRepository, repository: socialFeedRepository };
}

async function authorized(injected) {
  const values = injected || await dependencies();
  return { ...values, user: await authorizeEditor(values) };
}

async function parseJson(request, schema) {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return { response: json({ error: "Content-Type must be application/json." }, 415) };
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > SOCIAL_FEED_JSON_BODY_LIMIT)) return { response: json({ error: "Request body is too large." }, 413) };
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > SOCIAL_FEED_JSON_BODY_LIMIT) return { response: json({ error: "Request body is too large." }, 413) };
  let body;
  try { body = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return { response: json({ error: "Request body must be valid JSON." }, 400) }; }
  const parsed = schema.safeParse(body);
  return parsed.success ? { data: parsed.data } : { response: json({ error: "Invalid request.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, 400) };
}

function mutationGate(request, values) {
  if (!enforceProducerMutationOrigin(request, values.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL, values.nodeEnv ?? process.env.NODE_ENV)) return json({ error: "Cross-origin social moderation mutation rejected." }, 403);
  if (!(values.edgeRateLimitVerified ?? producerEdgeRateLimitVerified())) return json({ error: "Social moderation is unavailable until edge rate limiting is verified." }, 503);
  if (!consume(values.user.id)) return json({ error: "Too many social moderation requests. Try again later." }, 429);
  return null;
}

async function festivalIdFrom(context) {
  const parsed = festivalIdSchema.safeParse((await context.params)?.id);
  return parsed.success ? parsed.data : null;
}

function handled(error) {
  if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
  console.error("[SOCIAL FEED] Administrative request failed; provider and post data were redacted.");
  return json({ error: "The social feed request could not be processed." }, 500);
}

export async function handleAdminSocialFeedGet(_request, context, injected) {
  const festivalId = await festivalIdFrom(context); if (!festivalId) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected);
    return json({ feed: await getAdminSocialFeed(festivalId, values) });
  } catch (error) { return handled(error); }
}

export async function handleAdminSocialFeedPatch(request, context, injected) {
  const festivalId = await festivalIdFrom(context); if (!festivalId) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected); const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, configureSocialFeedSchema); if (parsed.response) return parsed.response;
    return json({ feed: await configureSocialFeed(festivalId, parsed.data, values) });
  } catch (error) { return handled(error); }
}

export async function handleAdminSocialPostsGet(request, context, injected) {
  const festivalId = await festivalIdFrom(context); if (!festivalId) return json({ error: "Festival not found." }, 404);
  try {
    const values = await authorized(injected);
    const parsed = listSocialPostsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return json({ error: "Invalid query." }, 400);
    return json(await listAdminSocialPosts(festivalId, parsed.data, values));
  } catch (error) { return handled(error); }
}

export async function handleAdminSocialPostModeration(request, context, injected) {
  const params = await context.params;
  const festivalId = festivalIdSchema.safeParse(params?.id);
  const postId = socialPostIdSchema.safeParse(params?.postId);
  if (!festivalId.success || !postId.success) return json({ error: "Social post not found." }, 404);
  try {
    const values = await authorized(injected); const gate = mutationGate(request, values); if (gate) return gate;
    const parsed = await parseJson(request, moderateSocialPostSchema); if (parsed.response) return parsed.response;
    return json({ post: await moderateSocialPost(festivalId.data, postId.data, parsed.data, values) });
  } catch (error) { return handled(error); }
}
