import { describe, expect, it, vi } from "vitest";

import { createCuratorProvider, createFlocklerProvider, SocialFeedProviderError } from "@/features/social-feed/social-feed-provider";

function response(body, { status = 200, contentLength } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: vi.fn(() => contentLength == null ? null : String(contentLength)) },
    text: vi.fn(async () => typeof body === "string" ? body : JSON.stringify(body)),
  };
}

const curatorPost = {
  id: "provider-1", network: "instagram", url: "https://www.instagram.com/p/abc/?utm_source=feed#fragment",
  text: " A Philly festival post. ", author: { name: "Festival Visitor", handle: "visitor" },
  published_at: "2026-08-01T12:00:00.000Z",
};

describe("F-09 fixed-origin provider adapters", () => {
  it("normalizes bounded text cards using injected fetch only", async () => {
    const fetchImpl = vi.fn(async () => response({ posts: [curatorPost], next_cursor: "next-1" }));
    const globalFetch = vi.spyOn(globalThis, "fetch");
    const provider = createCuratorProvider({ token: "test-token", fetchImpl, timeoutMs: 100 });
    const result = await provider.fetchPosts({ feedId: "feed-1" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requested = new URL(fetchImpl.mock.calls[0][0]);
    expect(requested.origin).toBe("https://api.curator.io");
    expect(requested.pathname).toBe("/v1/feeds/feed-1/posts");
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe("Bearer test-token");
    expect(result).toEqual({
      items: [{
        providerItemId: "provider-1", network: "instagram",
        canonicalUrl: "https://www.instagram.com/p/abc/?utm_source=feed",
        authorName: "Festival Visitor", authorHandle: "visitor", textExcerpt: "A Philly festival post.",
        sourcePublishedAt: new Date("2026-08-01T12:00:00.000Z"),
      }],
      nextCursor: "next-1",
    });
    expect(result.items[0]).not.toHaveProperty("html");
    expect(result.items[0]).not.toHaveProperty("media");
    expect(globalFetch).not.toHaveBeenCalled();
    globalFetch.mockRestore();
  });

  it("drops executable/off-network cards and rejects HTML or non-strict payloads", async () => {
    const invalidCards = [
      { ...curatorPost, id: "bad-host", url: "https://instagram.com.evil.test/p/1" },
      { ...curatorPost, id: "html", text: "<script>alert(1)</script>" },
    ];
    const provider = createCuratorProvider({ token: "test-token", fetchImpl: vi.fn(async () => response({ posts: invalidCards })) });
    await expect(provider.fetchPosts({ feedId: "feed-1" })).resolves.toEqual({ items: [], nextCursor: null });

    const extraFieldProvider = createCuratorProvider({ token: "test-token", fetchImpl: vi.fn(async () => response({ posts: [{ ...curatorPost, embed_html: "<iframe>" }] })) });
    await expect(extraFieldProvider.fetchPosts({ feedId: "feed-1" })).rejects.toMatchObject({ code: "provider_invalid_response" });
  });

  it("bounds responses and redacts provider HTTP failures into stable codes", async () => {
    const tooLarge = createFlocklerProvider({ token: "test-token", fetchImpl: vi.fn(async () => response("{}", { contentLength: 600_000 })) });
    await expect(tooLarge.fetchPosts({ feedId: "site-1" })).rejects.toMatchObject({ code: "provider_response_too_large" });

    const limited = createCuratorProvider({ token: "test-token", fetchImpl: vi.fn(async () => response({}, { status: 429 })) });
    await expect(limited.fetchPosts({ feedId: "feed-1" })).rejects.toMatchObject({ code: "provider_rate_limited" });

    const noCredential = createCuratorProvider({ token: "", fetchImpl: vi.fn() });
    await expect(noCredential.fetchPosts({ feedId: "feed-1" })).rejects.toBeInstanceOf(SocialFeedProviderError);

    const globalFetch = vi.spyOn(globalThis, "fetch");
    const testModeDefault = createCuratorProvider({ token: "credential-that-must-not-enable-network" });
    await expect(testModeDefault.fetchPosts({ feedId: "feed-1" })).rejects.toMatchObject({ code: "provider_unconfigured" });
    expect(globalFetch).not.toHaveBeenCalled();
    globalFetch.mockRestore();
  });
});
