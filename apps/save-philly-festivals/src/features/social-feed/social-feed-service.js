import { randomUUID } from "node:crypto";

import { redactSocialFeedError } from "./social-feed-security";
import { SocialFeedConflictError, SocialFeedNotFoundError } from "./social-feed-errors";

export function getAdminSocialFeed(festivalId, { repository }) {
  return repository.findFeedForAdmin(festivalId);
}

export function configureSocialFeed(festivalId, input, { repository }) {
  return repository.configureFeed({
    festivalId,
    expectedRevision: input.expected_revision,
    hashtag: input.hashtag,
    enabled: input.enabled,
    provider: input.provider,
    providerFeedId: input.provider_feed_id,
  });
}

export function listAdminSocialPosts(festivalId, input, { repository }) {
  return repository.listPosts(festivalId, input);
}

export function moderateSocialPost(festivalId, postId, input, { repository, user, now = () => new Date() }) {
  return repository.moderatePost({
    festivalId,
    postId,
    expectedRevision: input.expected_moderation_revision,
    status: input.status,
    reason: input.reason,
    actorUserId: user.id,
    now: now(),
  });
}

export async function syncSocialFeed(feedId, { repository, providers, now = () => new Date(), createAttemptToken = randomUUID }) {
  const attemptedAt = now();
  let feed;
  try {
    feed = await repository.claimSyncFeed({
      feedId,
      attemptToken: createAttemptToken(),
      attemptedAt,
      staleBefore: new Date(attemptedAt.getTime() - 5 * 60 * 1000),
    });
  } catch (error) {
    if (error instanceof SocialFeedConflictError) return { ok: false, state: "busy" };
    if (error instanceof SocialFeedNotFoundError) throw error;
    throw error;
  }
  const provider = providers?.[feed.provider];
  if (!provider || provider.provider !== feed.provider || typeof provider.fetchPosts !== "function") {
    const recorded = await repository.recordSyncFailure({ feedId, expectedRevision: feed.revision, sourceRevision: feed.source_revision, expectedCursor: feed.sync_cursor, attemptToken: feed.sync_attempt_token, attemptedAt, errorCode: "provider_unconfigured" });
    return recorded.count === 1
      ? { ok: false, state: "unavailable", errorCode: "provider_unconfigured" }
      : { ok: false, state: "stale" };
  }
  let result;
  try {
    result = await provider.fetchPosts({ feedId: feed.provider_feed_id, hashtag: feed.hashtag, cursor: feed.sync_cursor });
  } catch (error) {
    const errorCode = redactSocialFeedError(error);
    const recorded = await repository.recordSyncFailure({ feedId, expectedRevision: feed.revision, sourceRevision: feed.source_revision, expectedCursor: feed.sync_cursor, attemptToken: feed.sync_attempt_token, attemptedAt, errorCode });
    return recorded.count === 1
      ? { ok: false, state: "unavailable", errorCode }
      : { ok: false, state: "stale" };
  }
  try {
    const ingestion = await repository.ingestItems({
      feedId,
      expectedRevision: feed.revision,
      sourceRevision: feed.source_revision,
      expectedCursor: feed.sync_cursor,
      attemptToken: feed.sync_attempt_token,
      items: result.items,
      nextCursor: result.nextCursor,
      attemptedAt,
    });
    return { ok: true, state: result.items.length ? "synced" : "empty", ...ingestion };
  } catch (error) {
    if (error instanceof SocialFeedConflictError) return { ok: false, state: "stale" };
    throw error;
  }
}

export function getPublicSocialFeed(festivalId, { repository }) {
  return repository.getPublicFeed(festivalId);
}
