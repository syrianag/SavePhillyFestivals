import { randomUUID } from "node:crypto";

import {
  EDITORIAL_E2E_USER,
  producerE2EFixtureEnabled,
  producerE2ESelectedIdentity,
} from "@/features/producer-submission/producer-e2e-fixture";
import { SocialFeedConflictError, SocialFeedNotFoundError } from "./social-feed-errors";
import { toPublicSocialFeedDto } from "./social-feed-repository";

const STATE_KEY = Symbol.for("save-philly-festivals.social-feed-e2e-state");
const FIXED_FEEDS = Object.freeze({
  "e2e-approved-1": {
    id: "30000000-0000-4000-8000-000000000001",
    festival_id: "e2e-approved-1",
    hashtag: "RiverfrontArtsFest",
    enabled: true,
    provider: "curator",
    provider_feed_id: "riverfront-fixture",
    revision: 1,
    source_revision: 1,
    last_sync_status: "success",
    last_attempted_at: new Date("2026-08-04T12:00:00.000Z"),
    last_success_at: new Date("2026-08-04T12:00:00.000Z"),
    last_error_code: null,
    posts: [
      {
        id: "31000000-0000-4000-8000-000000000001",
        provider_item_id: "approved-1",
        source_revision: 1,
        network: "instagram",
        canonical_url: "https://www.instagram.com/p/approved-riverfront/",
        author_name: "Riverfront Arts Festival",
        author_handle: "@riverfrontartsfestival",
        text_excerpt: "Artists and neighbors are getting ready for festival weekend.",
        source_published_at: new Date("2026-08-03T16:00:00.000Z"),
        moderation_status: "approved",
        moderation_revision: 1,
      },
      {
        id: "31000000-0000-4000-8000-000000000002",
        provider_item_id: "approved-2",
        source_revision: 1,
        network: "facebook",
        canonical_url: "https://www.facebook.com/riverfrontartsfestival/posts/approved",
        author_name: "Riverfront Arts Festival",
        author_handle: null,
        text_excerpt: "The community arts parade route is now available.",
        source_published_at: new Date("2026-08-02T16:00:00.000Z"),
        moderation_status: "approved",
        moderation_revision: 1,
      },
      {
        id: "31000000-0000-4000-8000-000000000003",
        provider_item_id: "hidden-1",
        source_revision: 1,
        network: "instagram",
        canonical_url: "https://www.instagram.com/p/hidden-riverfront/",
        author_name: "Hidden Fixture",
        author_handle: "@hiddenfixture",
        text_excerpt: "This hidden post must never be public.",
        source_published_at: new Date("2026-08-01T16:00:00.000Z"),
        moderation_status: "hidden",
        moderation_revision: 1,
      },
      {
        id: "31000000-0000-4000-8000-000000000004",
        provider_item_id: "rejected-1",
        source_revision: 1,
        network: "instagram",
        canonical_url: "https://www.instagram.com/p/rejected-riverfront/",
        author_name: "Rejected Fixture",
        author_handle: "@rejectedfixture",
        text_excerpt: "This rejected post must never be public.",
        source_published_at: new Date("2026-07-31T16:00:00.000Z"),
        moderation_status: "rejected",
        moderation_revision: 1,
      },
    ],
  },
  "e2e-approved-2": {
    id: "30000000-0000-4000-8000-000000000002",
    festival_id: "e2e-approved-2",
    hashtag: "SouthPhillyFoodFest",
    enabled: true,
    provider: "flockler",
    provider_feed_id: "south-philly-fixture",
    revision: 1,
    source_revision: 1,
    last_sync_status: "failed",
    last_attempted_at: new Date("2026-08-04T12:00:00.000Z"),
    last_success_at: null,
    last_error_code: "provider_unavailable",
    posts: [],
  },
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function state() {
  globalThis[STATE_KEY] ||= { feeds: new Map(), transitions: [] };
  return globalThis[STATE_KEY];
}

function fixedFeed(festivalId) {
  return FIXED_FEEDS[festivalId] ? clone(FIXED_FEEDS[festivalId]) : null;
}

function feedForFestival(festivalId) {
  return state().feeds.get(festivalId) || fixedFeed(festivalId);
}

function seedPendingPosts(feed) {
  if (feed.posts.length) return;
  feed.posts.push(
    {
      id: randomUUID(), provider_item_id: "fixture-pending", source_revision: feed.source_revision, network: "instagram",
      canonical_url: "https://www.instagram.com/p/pending-editorial-fixture/",
      author_name: "Community Contributor", author_handle: "@communitycontributor",
      text_excerpt: "A pending community photo awaiting local editorial review.",
      source_published_at: new Date("2026-08-04T10:00:00.000Z"), moderation_status: "pending",
      moderation_revision: 0, reviewed_by_user_id: null, reviewed_at: null,
    },
    {
      id: randomUUID(), provider_item_id: "fixture-hidden", source_revision: feed.source_revision, network: "facebook",
      canonical_url: "https://www.facebook.com/community/posts/hidden-editorial-fixture",
      author_name: "Previously Reviewed Contributor", author_handle: null,
      text_excerpt: "A previously hidden item remains unavailable to visitors.",
      source_published_at: new Date("2026-08-03T10:00:00.000Z"), moderation_status: "hidden",
      moderation_revision: 1, reviewed_by_user_id: EDITORIAL_E2E_USER.id, reviewed_at: new Date("2026-08-03T12:00:00.000Z"),
    },
  );
  for (let index = 1; index <= 25; index += 1) {
    const suffix = String(index).padStart(2, "0");
    feed.posts.push({
      id: randomUUID(), provider_item_id: `fixture-page-${suffix}`, source_revision: feed.source_revision, network: "instagram",
      canonical_url: `https://www.instagram.com/p/paginated-editorial-fixture-${suffix}/`,
      author_name: `Paginated Contributor ${suffix}`, author_handle: null,
      text_excerpt: `Paginated pending fixture ${suffix}.`,
      source_published_at: new Date(`2026-07-${String(26 - index).padStart(2, "0")}T10:00:00.000Z`), moderation_status: "pending",
      moderation_revision: 0, reviewed_by_user_id: null, reviewed_at: null,
    });
  }
}

const repository = {
  async findCurrentUser(id) {
    return id === EDITORIAL_E2E_USER.id ? clone(EDITORIAL_E2E_USER) : null;
  },
  async findFeedForAdmin(festivalId) {
    const feed = feedForFestival(festivalId);
    if (!feed) return null;
    const { posts: _posts, ...adminFeed } = feed;
    return clone(adminFeed);
  },
  async configureFeed({ festivalId, expectedRevision, hashtag, enabled, provider, providerFeedId }) {
    const current = state().feeds.get(festivalId);
    if (!current && expectedRevision !== 0) throw new SocialFeedConflictError();
    if (current && current.revision !== expectedRevision) throw new SocialFeedConflictError();
    const sourceChanged = current && (current.hashtag !== hashtag || current.provider !== provider || current.provider_feed_id !== providerFeedId);
    const feed = current || {
      id: randomUUID(), festival_id: festivalId, revision: 0, source_revision: 1, posts: [],
      last_sync_status: "never", last_attempted_at: null, last_success_at: null, last_error_code: null,
    };
    Object.assign(feed, { hashtag, enabled, provider, provider_feed_id: providerFeedId, revision: feed.revision + 1, updated_at: new Date() });
    if (sourceChanged) Object.assign(feed, { source_revision: feed.source_revision + 1, last_sync_status: "never", last_attempted_at: null, last_success_at: null, last_error_code: null });
    seedPendingPosts(feed);
    state().feeds.set(festivalId, feed);
    const { posts: _posts, ...adminFeed } = feed;
    return clone(adminFeed);
  },
  async listPosts(festivalId, { status, page, limit }) {
    const feed = feedForFestival(festivalId);
    if (!feed) throw new SocialFeedNotFoundError();
    const matching = feed.posts.filter((post) => post.source_revision === feed.source_revision && (!status || post.moderation_status === status));
    return { posts: clone(matching.slice((page - 1) * limit, page * limit)), pagination: { page, limit, total: matching.length, pages: Math.ceil(matching.length / limit) } };
  },
  async moderatePost({ festivalId, postId, expectedRevision, status, reason, actorUserId, now }) {
    const feed = state().feeds.get(festivalId);
    const post = feed?.posts.find((item) => item.id === postId);
    if (!post) throw new SocialFeedNotFoundError("Social post not found.");
    if (post.moderation_revision !== expectedRevision || post.moderation_status === status) throw new SocialFeedConflictError("Social post moderation changed. Reload and try again.");
    const fromStatus = post.moderation_status;
    Object.assign(post, { moderation_status: status, moderation_revision: post.moderation_revision + 1, reviewed_by_user_id: actorUserId, reviewed_at: now });
    state().transitions.push({ id: randomUUID(), social_post_id: post.id, actor_user_id: actorUserId, from_status: fromStatus, to_status: status, revision: post.moderation_revision, reason: reason || null, created_at: now });
    return clone(post);
  },
  async getPublicFeed(festivalId) {
    const feed = feedForFestival(festivalId);
    if (!feed) return toPublicSocialFeedDto(null);
    return toPublicSocialFeedDto({ ...feed, posts: feed.posts.filter((post) => post.source_revision === feed.source_revision && post.moderation_status === "approved") });
  },
};

export function socialFeedE2ERepository() {
  return producerE2EFixtureEnabled() ? repository : null;
}

export async function socialFeedE2EDependencies() {
  if (!producerE2EFixtureEnabled() || await producerE2ESelectedIdentity() !== "admin") return null;
  return {
    getSession: async () => ({ user: { id: EDITORIAL_E2E_USER.id } }),
    userRepository: repository,
    repository,
    nodeEnv: process.env.NODE_ENV,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    edgeRateLimitVerified: true,
  };
}
