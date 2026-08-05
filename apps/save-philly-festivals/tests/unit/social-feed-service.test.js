import { describe, expect, it, vi } from "vitest";

import { SocialFeedConflictError } from "@/features/social-feed/social-feed-errors";
import { moderateSocialPost, syncSocialFeed } from "@/features/social-feed/social-feed-service";

const attemptToken = "test-sync-attempt-token";
const claimedFeed = (overrides = {}) => ({
  id: "feed-1", provider: "curator", provider_feed_id: "external-1", hashtag: "PhillyFest",
  revision: 4, source_revision: 2, sync_cursor: "cursor", sync_attempt_token: attemptToken,
  ...overrides,
});

describe("F-09 sync and moderation services", () => {
  it("records a redacted failure against the exact claimed attempt", async () => {
    const repository = {
      claimSyncFeed: vi.fn(async () => claimedFeed()),
      ingestItems: vi.fn(),
      recordSyncFailure: vi.fn(async () => ({ count: 1 })),
    };
    const provider = { provider: "curator", fetchPosts: vi.fn(async () => { throw new Error("token=PRIVATE provider exploded"); }) };
    const now = new Date("2026-08-04T12:00:00Z");

    await expect(syncSocialFeed("feed-1", { repository, providers: { curator: provider }, now: () => now, createAttemptToken: () => attemptToken }))
      .resolves.toEqual({ ok: false, state: "unavailable", errorCode: "provider_error" });
    expect(repository.claimSyncFeed).toHaveBeenCalledWith({ feedId: "feed-1", attemptToken, attemptedAt: now, staleBefore: new Date("2026-08-04T11:55:00Z") });
    expect(repository.recordSyncFailure).toHaveBeenCalledWith({ feedId: "feed-1", expectedRevision: 4, sourceRevision: 2, expectedCursor: "cursor", attemptToken, attemptedAt: now, errorCode: "provider_error" });
    expect(repository.ingestItems).not.toHaveBeenCalled();
  });

  it("records empty successful syncs against the exact claimed attempt", async () => {
    const repository = {
      claimSyncFeed: vi.fn(async () => claimedFeed({ provider: "flockler", revision: 1, source_revision: 1, sync_cursor: null })),
      ingestItems: vi.fn(async () => ({ created: 0, refreshed: 0, received: 0 })),
      recordSyncFailure: vi.fn(),
    };
    const provider = { provider: "flockler", fetchPosts: vi.fn(async () => ({ items: [], nextCursor: null })) };
    await expect(syncSocialFeed("feed-1", { repository, providers: { flockler: provider }, createAttemptToken: () => attemptToken })).resolves.toMatchObject({ ok: true, state: "empty", received: 0 });
    expect(repository.ingestItems).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, sourceRevision: 1, expectedCursor: null, attemptToken }));
    expect(repository.recordSyncFailure).not.toHaveBeenCalled();
  });

  it("discards stale results and failures whose attempt claim was replaced", async () => {
    const feed = claimedFeed({ revision: 2, source_revision: 3, sync_cursor: "old" });
    const staleResultRepository = {
      claimSyncFeed: vi.fn(async () => feed),
      ingestItems: vi.fn(async () => { throw new SocialFeedConflictError(); }),
      recordSyncFailure: vi.fn(),
    };
    const provider = { provider: "curator", fetchPosts: vi.fn(async () => ({ items: [], nextCursor: null })) };
    await expect(syncSocialFeed("feed-1", { repository: staleResultRepository, providers: { curator: provider }, createAttemptToken: () => attemptToken })).resolves.toEqual({ ok: false, state: "stale" });

    const staleFailureRepository = {
      claimSyncFeed: vi.fn(async () => feed), ingestItems: vi.fn(),
      recordSyncFailure: vi.fn(async () => ({ count: 0 })),
    };
    const failedProvider = { provider: "curator", fetchPosts: vi.fn(async () => { throw new Error("failed"); }) };
    await expect(syncSocialFeed("feed-1", { repository: staleFailureRepository, providers: { curator: failedProvider }, createAttemptToken: () => attemptToken })).resolves.toEqual({ ok: false, state: "stale" });
  });

  it("returns busy without contacting a provider when another attempt owns the lease", async () => {
    const repository = { claimSyncFeed: vi.fn(async () => { throw new SocialFeedConflictError(); }) };
    const provider = { provider: "curator", fetchPosts: vi.fn() };
    await expect(syncSocialFeed("feed-1", { repository, providers: { curator: provider }, createAttemptToken: () => attemptToken })).resolves.toEqual({ ok: false, state: "busy" });
    expect(provider.fetchPosts).not.toHaveBeenCalled();
  });

  it("passes actor and optimistic revision to the moderation repository", async () => {
    const repository = { moderatePost: vi.fn(async (input) => input) };
    const now = new Date("2026-08-04T12:00:00Z");
    const result = await moderateSocialPost("festival-1", "post-1", {
      expected_moderation_revision: 2, status: "hidden", reason: "No longer suitable",
    }, { repository, user: { id: "admin-1" }, now: () => now });
    expect(result).toMatchObject({ festivalId: "festival-1", postId: "post-1", expectedRevision: 2, status: "hidden", actorUserId: "admin-1", now });
  });
});
