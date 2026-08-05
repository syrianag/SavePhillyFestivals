import { describe, expect, it } from "vitest";

import { configureSocialFeedSchema, moderateSocialPostSchema, normalizeHashtag } from "@/features/social-feed/social-feed-schema";

const validConfig = {
  expected_revision: 0,
  hashtag: " #South_Street_Fest ",
  enabled: true,
  provider: "curator",
  provider_feed_id: "feed:philly-1",
};

describe("F-09 social feed validation", () => {
  it("normalizes one or more leading hashtag markers", () => {
    expect(normalizeHashtag("  ###PhillyFest  ")).toBe("PhillyFest");
    expect(configureSocialFeedSchema.parse(validConfig).hashtag).toBe("South_Street_Fest");
  });

  it("strictly bounds configuration and rejects URLs, unknown providers, and extra fields", () => {
    expect(configureSocialFeedSchema.safeParse({ ...validConfig, provider_feed_id: "https://evil.test/feed" }).success).toBe(false);
    expect(configureSocialFeedSchema.safeParse({ ...validConfig, provider: "instagram" }).success).toBe(false);
    expect(configureSocialFeedSchema.safeParse({ ...validConfig, token: "secret" }).success).toBe(false);
    expect(configureSocialFeedSchema.safeParse({ ...validConfig, hashtag: "bad tag" }).success).toBe(false);
  });

  it("requires optimistic moderation revisions and reasons for non-public decisions", () => {
    expect(moderateSocialPostSchema.safeParse({ expected_moderation_revision: 0, status: "approved" }).success).toBe(true);
    expect(moderateSocialPostSchema.safeParse({ expected_moderation_revision: 1, status: "hidden" }).success).toBe(false);
    expect(moderateSocialPostSchema.safeParse({ expected_moderation_revision: 1, status: "rejected", reason: "Off topic" }).success).toBe(true);
    expect(moderateSocialPostSchema.safeParse({ expected_moderation_revision: 0, status: "pending" }).success).toBe(false);
  });
});
