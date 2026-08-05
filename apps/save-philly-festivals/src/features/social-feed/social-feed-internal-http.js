import { NextResponse } from "next/server";

import { createSocialFeedProviderRegistry } from "./social-feed-provider";
import { socialFeedRepository } from "./social-feed-repository";
import { authorizeSocialFeedSync } from "./social-feed-security";
import { socialFeedIdSchema } from "./social-feed-schema";
import { syncSocialFeed } from "./social-feed-service";

const HEADERS = { "Cache-Control": "private, no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: HEADERS });

export async function handleInternalSocialFeedSync(request, context, injected) {
  const values = injected || { repository: socialFeedRepository, providers: createSocialFeedProviderRegistry() };
  if (!authorizeSocialFeedSync(request, values.secret)) return json({ error: "Unauthorized." }, 401);
  const parsed = socialFeedIdSchema.safeParse((await context.params)?.feedId);
  if (!parsed.success) return json({ error: "Social feed not found." }, 404);
  try {
    const result = await syncSocialFeed(parsed.data, values);
    return json(result, result.ok ? 200 : ["stale", "busy"].includes(result.state) ? 409 : 502);
  } catch (error) {
    if (error?.statusCode) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.statusCode);
    console.error("[SOCIAL FEED] Internal sync failed with details redacted.");
    return json({ error: "Social feed sync could not be processed." }, 500);
  }
}
