import { randomUUID } from "node:crypto";

import { publicDetailWhere } from "../editorial-workflow/publication-policy";
import { SocialFeedConflictError, SocialFeedNotFoundError } from "./social-feed-errors";

const feedAdminSelect = Object.freeze({
  id: true, festival_id: true, hashtag: true, enabled: true, provider: true, provider_feed_id: true,
  revision: true, source_revision: true, last_sync_status: true, last_attempted_at: true, last_success_at: true,
  last_error_code: true, created_at: true, updated_at: true,
});
const postAdminSelect = Object.freeze({
  id: true, social_feed_id: true, provider_item_id: true, source_revision: true, network: true, canonical_url: true,
  author_name: true, author_handle: true, text_excerpt: true, source_published_at: true,
  moderation_status: true, moderation_revision: true, reviewed_by_user_id: true,
  reviewed_at: true, ingested_at: true, created_at: true, updated_at: true,
});
const publicPostSelect = Object.freeze({
  id: true, network: true, canonical_url: true, author_name: true, author_handle: true,
  text_excerpt: true, source_published_at: true,
});

export function toPublicSocialFeedDto(feed) {
  if (!feed?.enabled) return Object.freeze({ enabled: false, hashtag: null, state: "empty", posts: [] });
  const posts = (feed.posts || []).map((post) => Object.freeze({
    id: post.id,
    network: post.network,
    url: post.canonical_url,
    authorName: post.author_name || null,
    authorHandle: post.author_handle || null,
    text: post.text_excerpt,
    publishedAt: post.source_published_at || null,
  }));
  const state = posts.length ? "ready" : feed.last_sync_status === "failed" ? "unavailable" : "empty";
  return Object.freeze({ enabled: true, hashtag: `#${feed.hashtag}`, state, posts: Object.freeze(posts) });
}

export function createSocialFeedRepository(client) {
  return Object.freeze({
    findCurrentUser(id) {
      return client.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
    },

    findFeedForAdmin(festivalId) {
      return client.festivalSocialFeed.findUnique({ where: { festival_id: festivalId }, select: feedAdminSelect });
    },

    async configureFeed({ festivalId, expectedRevision, hashtag, enabled, provider, providerFeedId, createId = randomUUID }) {
      return client.$transaction(async (transaction) => {
        const existing = await transaction.festivalSocialFeed.findUnique({ where: { festival_id: festivalId }, select: { id: true, revision: true, source_revision: true, hashtag: true, provider: true, provider_feed_id: true } });
        if (!existing) {
          if (expectedRevision !== 0) throw new SocialFeedConflictError();
          const festival = await transaction.festival.findUnique({ where: { id: festivalId }, select: { id: true } });
          if (!festival) throw new SocialFeedNotFoundError("Festival not found.");
          try {
            return await transaction.festivalSocialFeed.create({
              data: { id: createId(), festival_id: festivalId, hashtag, enabled, provider, provider_feed_id: providerFeedId, revision: 1, source_revision: 1 },
              select: feedAdminSelect,
            });
          } catch (error) {
            if (error?.code === "P2002") throw new SocialFeedConflictError();
            throw error;
          }
        }
        const sourceChanged = existing.hashtag !== hashtag || existing.provider !== provider || existing.provider_feed_id !== providerFeedId;
        const changed = await transaction.festivalSocialFeed.updateMany({
          where: { id: existing.id, revision: expectedRevision },
          data: {
            hashtag, enabled, provider, provider_feed_id: providerFeedId, revision: { increment: 1 },
            sync_attempt_token: null, sync_attempt_started_at: null,
            ...(sourceChanged ? { source_revision: { increment: 1 }, sync_cursor: null, last_sync_status: "never", last_attempted_at: null, last_success_at: null, last_error_code: null } : {}),
          },
        });
        if (changed.count !== 1) throw new SocialFeedConflictError();
        return transaction.festivalSocialFeed.findUnique({ where: { id: existing.id }, select: feedAdminSelect });
      });
    },

    async listPosts(festivalId, { status, page, limit }) {
      const feed = await client.festivalSocialFeed.findUnique({ where: { festival_id: festivalId }, select: { id: true, source_revision: true } });
      if (!feed) throw new SocialFeedNotFoundError();
      const where = { social_feed_id: feed.id, source_revision: feed.source_revision, ...(status ? { moderation_status: status } : {}) };
      const [posts, total] = await Promise.all([
        client.socialPost.findMany({ where, select: postAdminSelect, orderBy: [{ source_published_at: { sort: "desc", nulls: "last" } }, { ingested_at: "desc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
        client.socialPost.count({ where }),
      ]);
      return { posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    },

    moderatePost({ festivalId, postId, expectedRevision, status, reason, actorUserId, now, createId = randomUUID }) {
      return client.$transaction(async (transaction) => {
        const current = await transaction.socialPost.findFirst({
          where: { id: postId, social_feed: { festival_id: festivalId } },
          select: { id: true, moderation_status: true, moderation_revision: true },
        });
        if (!current) throw new SocialFeedNotFoundError("Social post not found.");
        if (current.moderation_revision !== expectedRevision || current.moderation_status === status) throw new SocialFeedConflictError("Social post moderation changed. Reload and try again.");
        const nextRevision = current.moderation_revision + 1;
        const changed = await transaction.socialPost.updateMany({
          where: { id: current.id, moderation_status: current.moderation_status, moderation_revision: expectedRevision },
          data: { moderation_status: status, moderation_revision: nextRevision, reviewed_by_user_id: actorUserId, reviewed_at: now },
        });
        if (changed.count !== 1) throw new SocialFeedConflictError("Social post moderation changed. Reload and try again.");
        await transaction.socialPostModerationTransition.create({
          data: { id: createId(), social_post_id: current.id, actor_user_id: actorUserId, from_status: current.moderation_status, to_status: status, revision: nextRevision, reason: reason || null },
        });
        return transaction.socialPost.findUnique({ where: { id: current.id }, select: postAdminSelect });
      });
    },

    async claimSyncFeed({ feedId, attemptToken, attemptedAt, staleBefore }) {
      return client.$transaction(async (transaction) => {
        const feed = await transaction.festivalSocialFeed.findFirst({
          where: { id: feedId, enabled: true },
          select: { id: true, hashtag: true, provider: true, provider_feed_id: true, revision: true, source_revision: true, sync_cursor: true },
        });
        if (!feed) throw new SocialFeedNotFoundError();
        const claimed = await transaction.festivalSocialFeed.updateMany({
          where: {
            id: feed.id, enabled: true, revision: feed.revision, source_revision: feed.source_revision,
            OR: [{ sync_attempt_token: null }, { sync_attempt_started_at: { lt: staleBefore } }],
          },
          data: { sync_attempt_token: attemptToken, sync_attempt_started_at: attemptedAt },
        });
        if (claimed.count !== 1) throw new SocialFeedConflictError("Social feed synchronization is already running.");
        return { ...feed, sync_attempt_token: attemptToken };
      });
    },

    ingestItems({ feedId, expectedRevision, sourceRevision, expectedCursor, attemptToken, items, nextCursor, attemptedAt, createId = randomUUID }) {
      return client.$transaction(async (transaction) => {
        const currentFeed = await transaction.festivalSocialFeed.findUnique({
          where: { id: feedId }, select: { enabled: true, revision: true, source_revision: true, sync_cursor: true, sync_attempt_token: true },
        });
        if (!currentFeed?.enabled || currentFeed.revision !== expectedRevision || currentFeed.source_revision !== sourceRevision || currentFeed.sync_cursor !== expectedCursor || currentFeed.sync_attempt_token !== attemptToken) {
          throw new SocialFeedConflictError("Social feed changed while synchronization was running.");
        }
        let created = 0;
        let refreshed = 0;
        for (const item of items) {
          const identity = { social_feed_id_source_revision_provider_item_id: { social_feed_id: feedId, source_revision: sourceRevision, provider_item_id: item.providerItemId } };
          const existing = await transaction.socialPost.findUnique({ where: identity, select: { id: true, moderation_status: true } });
          if (!existing) {
            try {
              await transaction.socialPost.create({
                data: {
                  id: createId(), social_feed_id: feedId, provider_item_id: item.providerItemId, source_revision: sourceRevision,
                  network: item.network, canonical_url: item.canonicalUrl, author_name: item.authorName,
                  author_handle: item.authorHandle, text_excerpt: item.textExcerpt,
                  source_published_at: item.sourcePublishedAt, ingested_at: attemptedAt,
                },
              });
              created += 1;
            } catch (error) {
              if (error?.code !== "P2002") throw error;
            }
          } else if (existing.moderation_status === "pending") {
            const changed = await transaction.socialPost.updateMany({
              where: { id: existing.id, moderation_status: "pending" },
              data: {
                network: item.network, canonical_url: item.canonicalUrl, author_name: item.authorName,
                author_handle: item.authorHandle, text_excerpt: item.textExcerpt,
                source_published_at: item.sourcePublishedAt, ingested_at: attemptedAt,
              },
            });
            refreshed += changed.count;
          }
        }
        const recorded = await transaction.festivalSocialFeed.updateMany({
          where: { id: feedId, enabled: true, revision: expectedRevision, source_revision: sourceRevision, sync_cursor: expectedCursor, sync_attempt_token: attemptToken },
          data: { sync_cursor: nextCursor, sync_attempt_token: null, sync_attempt_started_at: null, last_sync_status: "success", last_attempted_at: attemptedAt, last_success_at: attemptedAt, last_error_code: null },
        });
        if (recorded.count !== 1) throw new SocialFeedConflictError("A newer social feed synchronization completed first.");
        return { created, refreshed, received: items.length };
      });
    },

    recordSyncFailure({ feedId, expectedRevision, sourceRevision, expectedCursor, attemptToken, attemptedAt, errorCode }) {
      return client.festivalSocialFeed.updateMany({
        where: { id: feedId, enabled: true, revision: expectedRevision, source_revision: sourceRevision, sync_cursor: expectedCursor, sync_attempt_token: attemptToken },
        data: { sync_attempt_token: null, sync_attempt_started_at: null, last_sync_status: "failed", last_attempted_at: attemptedAt, last_error_code: errorCode },
      });
    },

    async getPublicFeed(festivalId) {
      return client.$transaction(async (transaction) => {
        const feed = await transaction.festivalSocialFeed.findFirst({
          where: { festival_id: festivalId, enabled: true, festival: publicDetailWhere },
          select: { id: true, enabled: true, hashtag: true, source_revision: true, last_sync_status: true },
        });
        if (!feed) return toPublicSocialFeedDto(null);
        const posts = await transaction.socialPost.findMany({
          where: { social_feed_id: feed.id, source_revision: feed.source_revision, moderation_status: "approved" },
          select: publicPostSelect,
          orderBy: [{ source_published_at: { sort: "desc", nulls: "last" } }, { ingested_at: "desc" }, { id: "asc" }],
          take: 24,
        });
        return toPublicSocialFeedDto({ ...feed, posts });
      }, { isolationLevel: "RepeatableRead" });
    },
  });
}

export { feedAdminSelect, postAdminSelect, publicPostSelect, SocialFeedConflictError, SocialFeedNotFoundError };
