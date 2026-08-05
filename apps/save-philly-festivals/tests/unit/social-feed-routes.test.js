import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { handleAdminSocialFeedPatch, handleAdminSocialPostModeration } from "@/features/social-feed/social-feed-http";
import { handleInternalSocialFeedSync } from "@/features/social-feed/social-feed-internal-http";

const festivalId = "00000000-0000-4000-8000-000000000001";
const postId = "00000000-0000-4000-8000-000000000002";
const feedId = "00000000-0000-4000-8000-000000000003";
const user = { id: "admin-1", email: "admin@example.test", role: "admin" };
const adminDependencies = (repository) => ({
  getSession: async () => ({ user: { id: user.id } }),
  userRepository: { findCurrentUser: vi.fn(async () => user) },
  repository, siteUrl: "https://festivals.example", nodeEnv: "production", edgeRateLimitVerified: true,
});
const mutationRequest = (path, body) => new Request(`https://festivals.example${path}`, {
  method: "POST", headers: { origin: "https://festivals.example", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("F-09 administrative and internal routes", () => {
  it("reloads editor authorization, enforces same-origin, and persists normalized configuration", async () => {
    const repository = { configureFeed: vi.fn(async (value) => value) };
    const request = new Request(`https://festivals.example/api/admin/festivals/${festivalId}/social-feed`, {
      method: "PATCH", headers: { origin: "https://festivals.example", "sec-fetch-site": "same-origin", "content-type": "application/json" },
      body: JSON.stringify({ expected_revision: 0, hashtag: "#PhillyFest", enabled: true, provider: "curator", provider_feed_id: "feed-1" }),
    });
    const response = await handleAdminSocialFeedPatch(request, { params: Promise.resolve({ id: festivalId }) }, adminDependencies(repository));
    expect(response.status).toBe(200);
    expect(repository.configureFeed).toHaveBeenCalledWith(expect.objectContaining({ hashtag: "PhillyFest", providerFeedId: "feed-1" }));
  });

  it("rejects cross-origin moderation before repository mutation", async () => {
    const repository = { moderatePost: vi.fn() };
    const request = new Request(`https://festivals.example/api/admin/festivals/${festivalId}/social-posts/${postId}/moderation`, {
      method: "POST", headers: { origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify({ expected_moderation_revision: 0, status: "approved" }),
    });
    const response = await handleAdminSocialPostModeration(request, { params: Promise.resolve({ id: festivalId, postId }) }, adminDependencies(repository));
    expect(response.status).toBe(403);
    expect(repository.moderatePost).not.toHaveBeenCalled();
  });

  it("rejects non-editor sessions", async () => {
    const repository = { moderatePost: vi.fn() };
    const dependencies = adminDependencies(repository);
    dependencies.userRepository.findCurrentUser.mockResolvedValue({ ...user, role: "producer" });
    const response = await handleAdminSocialPostModeration(
      mutationRequest(`/api/admin/festivals/${festivalId}/social-posts/${postId}/moderation`, { expected_moderation_revision: 0, status: "approved" }),
      { params: Promise.resolve({ id: festivalId, postId }) }, dependencies,
    );
    expect(response.status).toBe(403);
  });

  it("uses a dedicated constant-time bearer secret and injected provider", async () => {
    const repository = {
      claimSyncFeed: vi.fn(async ({ attemptToken }) => ({ id: feedId, provider: "curator", provider_feed_id: "external-1", hashtag: "PhillyFest", revision: 1, source_revision: 1, sync_cursor: null, sync_attempt_token: attemptToken })),
      ingestItems: vi.fn(async () => ({ created: 0, refreshed: 0, received: 0 })), recordSyncFailure: vi.fn(),
    };
    const providers = { curator: { provider: "curator", fetchPosts: vi.fn(async () => ({ items: [], nextCursor: null })) } };
    const unauthorized = await handleInternalSocialFeedSync(new Request(`https://festivals.example/api/internal/social-feeds/${feedId}/sync`, { method: "POST", headers: { authorization: "Bearer wrong" } }), { params: Promise.resolve({ feedId }) }, { repository, providers, secret: "dedicated-secret" });
    expect(unauthorized.status).toBe(401);
    expect(providers.curator.fetchPosts).not.toHaveBeenCalled();

    const authorized = await handleInternalSocialFeedSync(new Request(`https://festivals.example/api/internal/social-feeds/${feedId}/sync`, { method: "POST", headers: { authorization: "Bearer dedicated-secret" } }), { params: Promise.resolve({ feedId }) }, { repository, providers, secret: "dedicated-secret" });
    expect(authorized.status).toBe(200);
    expect(providers.curator.fetchPosts).toHaveBeenCalledTimes(1);
  });
});
