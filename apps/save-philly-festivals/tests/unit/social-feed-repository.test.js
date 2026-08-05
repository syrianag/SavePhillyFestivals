import { beforeAll, describe, expect, it, vi } from "vitest";

const defaultPrisma = vi.hoisted(() => ({}));
vi.mock("@/lib/db", () => ({ prisma: defaultPrisma }));

let createSocialFeedRepository;
let SocialFeedConflictError;
beforeAll(async () => {
  ({ createSocialFeedRepository, SocialFeedConflictError } = await import("@/features/social-feed/social-feed-repository"));
});

const approvedPost = {
  id: "post-approved", network: "instagram", canonical_url: "https://instagram.com/p/approved",
  author_name: "Visitor", author_handle: "visitor", text_excerpt: "Approved festival post",
  source_published_at: new Date("2026-08-01T12:00:00Z"), moderation_status: "approved",
  provider_item_id: "PRIVATE-PROVIDER-ID", reviewed_by_user_id: "PRIVATE-ADMIN",
};

describe("F-09 public repository contract", () => {
  it("queries published festivals and approved posts only, returning a provider-free DTO", async () => {
    const findFirst = vi.fn(async () => ({ id: "feed-1", enabled: true, hashtag: "PhillyFest", source_revision: 3, last_sync_status: "failed" }));
    const findMany = vi.fn(async () => [approvedPost]);
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback({ festivalSocialFeed: { findFirst }, socialPost: { findMany } }) });
    const result = await repository.getPublicFeed("festival-1");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ festival_id: "festival-1", enabled: true, festival: { OR: [{ workflow_state: "published" }, { workflow_state: "canceled", first_published_at: { not: null } }] } }),
    }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { social_feed_id: "feed-1", source_revision: 3, moderation_status: "approved" }, take: 24,
    }));
    expect(result).toEqual({
      enabled: true, hashtag: "#PhillyFest", state: "ready",
      posts: [{ id: "post-approved", network: "instagram", url: "https://instagram.com/p/approved", authorName: "Visitor", authorHandle: "visitor", text: "Approved festival post", publishedAt: new Date("2026-08-01T12:00:00Z") }],
    });
    expect(JSON.stringify(result)).not.toMatch(/provider|moderation|reviewed|error/i);
  });

  it("returns stable empty and unavailable states without provider details", async () => {
    const findFirst = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "feed-1", enabled: true, hashtag: "PhillyFest", source_revision: 1, last_sync_status: "success" }).mockResolvedValueOnce({ id: "feed-1", enabled: true, hashtag: "PhillyFest", source_revision: 1, last_sync_status: "failed", last_error_code: "private_error" });
    const findMany = vi.fn(async () => []);
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback({ festivalSocialFeed: { findFirst }, socialPost: { findMany } }) });
    await expect(repository.getPublicFeed("festival-1")).resolves.toEqual({ enabled: false, hashtag: null, state: "empty", posts: [] });
    await expect(repository.getPublicFeed("festival-1")).resolves.toEqual({ enabled: true, hashtag: "#PhillyFest", state: "empty", posts: [] });
    await expect(repository.getPublicFeed("festival-1")).resolves.toEqual({ enabled: true, hashtag: "#PhillyFest", state: "unavailable", posts: [] });
  });
});

describe("F-09 configuration concurrency", () => {
  it("resets source-specific sync metadata when the hashtag or provider identity changes", async () => {
    const transaction = {
      festivalSocialFeed: {
        findUnique: vi.fn().mockResolvedValueOnce({ id: "feed-1", revision: 2, source_revision: 4, hashtag: "OldFest", provider: "curator", provider_feed_id: "old-feed" }).mockResolvedValueOnce({ id: "feed-1", revision: 3, source_revision: 5 }),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    await repository.configureFeed({ festivalId: "festival-1", expectedRevision: 2, hashtag: "NewFest", enabled: true, provider: "flockler", providerFeedId: "new-feed" });
    expect(transaction.festivalSocialFeed.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source_revision: { increment: 1 }, sync_cursor: null, last_sync_status: "never", last_attempted_at: null, last_success_at: null, last_error_code: null }),
    }));
  });

  it("claims one durable sync attempt and rejects an overlapping claim", async () => {
    const transaction = {
      festivalSocialFeed: {
        findFirst: vi.fn(async () => ({ id: "feed-1", revision: 2, source_revision: 3, sync_cursor: null })),
        updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }),
      },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    const input = { feedId: "feed-1", attemptToken: "attempt-token-123456", attemptedAt: new Date("2026-08-04T12:00:00Z"), staleBefore: new Date("2026-08-04T11:55:00Z") };
    await expect(repository.claimSyncFeed(input)).resolves.toMatchObject({ id: "feed-1", sync_attempt_token: input.attemptToken });
    await expect(repository.claimSyncFeed({ ...input, attemptToken: "attempt-token-654321" })).rejects.toBeInstanceOf(SocialFeedConflictError);
    expect(transaction.festivalSocialFeed.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ sync_attempt_token: null }, { sync_attempt_started_at: { lt: input.staleBefore } }] }),
    }));
  });
});

describe("F-09 ingestion and immutable moderation audit", () => {
  it("does not modify locally moderated posts during ingestion", async () => {
    const transaction = {
      socialPost: {
        findUnique: vi.fn(async () => ({ id: "post-1", moderation_status: "approved" })),
        create: vi.fn(), updateMany: vi.fn(),
      },
      festivalSocialFeed: {
        findUnique: vi.fn(async () => ({ enabled: true, revision: 2, source_revision: 3, sync_cursor: "current", sync_attempt_token: "attempt-1" })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    await expect(repository.ingestItems({
      feedId: "feed-1", expectedRevision: 2, sourceRevision: 3, expectedCursor: "current", attemptToken: "attempt-1", nextCursor: "next", attemptedAt: new Date(),
      items: [{ providerItemId: "provider-1", network: "x", canonicalUrl: "https://x.com/a/status/1", authorName: null, authorHandle: "a", textExcerpt: "Provider changed this", sourcePublishedAt: null }],
    })).resolves.toMatchObject({ created: 0, refreshed: 0, received: 1 });
    expect(transaction.socialPost.create).not.toHaveBeenCalled();
    expect(transaction.socialPost.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale sync results before inserting provider items", async () => {
    const transaction = {
      festivalSocialFeed: { findUnique: vi.fn(async () => ({ enabled: true, revision: 3, source_revision: 4, sync_cursor: "newer", sync_attempt_token: "newer-attempt" })) },
      socialPost: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    await expect(repository.ingestItems({
      feedId: "feed-1", expectedRevision: 2, sourceRevision: 3, expectedCursor: "older", attemptToken: "older-attempt", nextCursor: "result", attemptedAt: new Date(), items: [],
    })).rejects.toBeInstanceOf(SocialFeedConflictError);
    expect(transaction.socialPost.create).not.toHaveBeenCalled();
  });

  it("atomically increments moderation revision and writes an immutable transition", async () => {
    const transaction = {
      socialPost: {
        findFirst: vi.fn(async () => ({ id: "post-1", moderation_status: "pending", moderation_revision: 0 })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => ({ id: "post-1", moderation_status: "approved", moderation_revision: 1 })),
      },
      socialPostModerationTransition: { create: vi.fn(async () => ({})) },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    const now = new Date("2026-08-04T12:00:00Z");
    await expect(repository.moderatePost({ festivalId: "festival-1", postId: "post-1", expectedRevision: 0, status: "approved", actorUserId: "admin-1", now, createId: () => "transition-1" }))
      .resolves.toMatchObject({ moderation_status: "approved", moderation_revision: 1 });
    expect(transaction.socialPost.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post-1", moderation_status: "pending", moderation_revision: 0 } }));
    expect(transaction.socialPostModerationTransition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: "transition-1", from_status: "pending", to_status: "approved", revision: 1, actor_user_id: "admin-1" }) });
  });

  it("rejects stale moderation revisions before writing audit", async () => {
    const transaction = {
      socialPost: { findFirst: vi.fn(async () => ({ id: "post-1", moderation_status: "approved", moderation_revision: 3 })) },
      socialPostModerationTransition: { create: vi.fn() },
    };
    const repository = createSocialFeedRepository({ $transaction: (callback) => callback(transaction) });
    await expect(repository.moderatePost({ festivalId: "festival-1", postId: "post-1", expectedRevision: 2, status: "hidden", actorUserId: "admin-1", now: new Date() })).rejects.toBeInstanceOf(SocialFeedConflictError);
    expect(transaction.socialPostModerationTransition.create).not.toHaveBeenCalled();
  });
});
