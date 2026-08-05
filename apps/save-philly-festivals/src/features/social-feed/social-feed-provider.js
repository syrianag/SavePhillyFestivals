import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  providerFeedIdSchema,
  SOCIAL_FEED_MAX_ITEMS,
  SOCIAL_FEED_MAX_RESPONSE_BYTES,
} from "./social-feed-schema";

const NETWORKS = Object.freeze({
  instagram: { value: "instagram", hosts: ["instagram.com"] },
  twitter: { value: "x", hosts: ["twitter.com", "x.com"] },
  x: { value: "x", hosts: ["twitter.com", "x.com"] },
  facebook: { value: "facebook", hosts: ["facebook.com", "fb.com"] },
  tiktok: { value: "tiktok", hosts: ["tiktok.com"] },
  youtube: { value: "youtube", hosts: ["youtube.com", "youtu.be"] },
});

const authorSchema = z.object({ name: z.string().max(200).nullable().optional(), handle: z.string().max(200).nullable().optional() }).strict();
const curatorItemSchema = z.object({
  id: z.string().min(1).max(300), network: z.string().min(1).max(30), url: z.string().max(2048),
  text: z.string().min(1).max(5000), author: authorSchema.optional(), published_at: z.string().max(50).nullable().optional(),
}).strict();
const curatorResponseSchema = z.object({ posts: z.array(curatorItemSchema).max(SOCIAL_FEED_MAX_ITEMS), next_cursor: z.string().max(1000).nullable().optional() }).strict();
const flocklerItemSchema = z.object({
  id: z.string().min(1).max(300), network: z.string().min(1).max(30), url: z.string().max(2048),
  text: z.string().min(1).max(5000), author_name: z.string().max(200).nullable().optional(),
  author_handle: z.string().max(200).nullable().optional(), published_at: z.string().max(50).nullable().optional(),
}).strict();
const flocklerResponseSchema = z.object({ articles: z.array(flocklerItemSchema).max(SOCIAL_FEED_MAX_ITEMS), next_cursor: z.string().max(1000).nullable().optional() }).strict();

export class SocialFeedProviderError extends Error {
  constructor(code = "provider_error") {
    super("Social feed provider is unavailable.");
    this.name = "SocialFeedProviderError";
    this.code = code;
  }
}

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function exactHost(hostname, allowed) {
  return allowed.some((host) => hostname === host || hostname === `www.${host}` || hostname.endsWith(`.${host}`));
}

function canonicalPostUrl(value, network) {
  const definition = NETWORKS[String(network).toLowerCase()];
  if (!definition) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !exactHost(url.hostname.toLowerCase(), definition.hosts)) return null;
    url.hash = "";
    return { url: url.toString(), network: definition.value };
  } catch {
    return null;
  }
}

function plainText(value) {
  if (/<\/?[a-z][^>]*>/i.test(value)) return null;
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 1000) : null;
}

function optionalText(value, max) {
  if (!configured(value) || /<\/?[a-z][^>]*>/i.test(value)) return null;
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, max) || null;
}

function publishedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeItem(item, authorName, authorHandle) {
  const link = canonicalPostUrl(item.url, item.network);
  const textExcerpt = plainText(item.text);
  if (!link || !textExcerpt) return null;
  return Object.freeze({
    providerItemId: item.id,
    network: link.network,
    canonicalUrl: link.url,
    authorName: optionalText(authorName, 200),
    authorHandle: optionalText(authorHandle, 200),
    textExcerpt,
    sourcePublishedAt: publishedDate(item.published_at),
  });
}

function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal && typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : timeout;
}

async function boundedResponseText(response) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text().catch(() => null);
    if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > SOCIAL_FEED_MAX_RESPONSE_BYTES) throw new SocialFeedProviderError("provider_response_too_large");
    return text;
  }
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > SOCIAL_FEED_MAX_RESPONSE_BYTES) throw new SocialFeedProviderError("provider_response_too_large");
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks, byteLength).toString("utf8");
}

async function requestJson({ fetchImpl, url, token, signal, timeoutMs }) {
  if (typeof fetchImpl !== "function" || !configured(token)) throw new SocialFeedProviderError("provider_unconfigured");
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: requestSignal(signal, timeoutMs),
  }).catch(() => null);
  if (!response?.ok) throw new SocialFeedProviderError(response?.status === 429 ? "provider_rate_limited" : "provider_error");
  const declared = response.headers?.get?.("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > SOCIAL_FEED_MAX_RESPONSE_BYTES)) throw new SocialFeedProviderError("provider_response_too_large");
  const text = await boundedResponseText(response);
  try { return JSON.parse(text); } catch { throw new SocialFeedProviderError("provider_invalid_response"); }
}

function createAdapter({ provider, origin, pathForFeed, token, fetchImpl, timeoutMs = 10_000, parse }) {
  const providerFetch = fetchImpl || (process.env.NODE_ENV === "test" ? null : globalThis.fetch);
  return Object.freeze({
    provider,
    async fetchPosts({ feedId, cursor, signal } = {}) {
      const parsedFeedId = providerFeedIdSchema.safeParse(feedId);
      if (!parsedFeedId.success) throw new SocialFeedProviderError("provider_unconfigured");
      const url = new URL(pathForFeed(encodeURIComponent(parsedFeedId.data)), origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", String(SOCIAL_FEED_MAX_ITEMS));
      const body = await requestJson({ fetchImpl: providerFetch, url, token, signal, timeoutMs });
      const parsed = parse(body);
      if (!parsed.success) throw new SocialFeedProviderError("provider_invalid_response");
      return Object.freeze({ items: parsed.items.flatMap((item) => item ? [item] : []), nextCursor: parsed.nextCursor || null });
    },
  });
}

export function createCuratorProvider({ token = process.env.CURATOR_SOCIAL_FEED_TOKEN, fetchImpl, timeoutMs } = {}) {
  return createAdapter({
    provider: "curator", origin: "https://api.curator.io", pathForFeed: (id) => `/v1/feeds/${id}/posts`, token, fetchImpl, timeoutMs,
    parse(body) {
      const result = curatorResponseSchema.safeParse(body);
      return result.success ? { success: true, items: result.data.posts.map((item) => normalizeItem(item, item.author?.name, item.author?.handle)), nextCursor: result.data.next_cursor } : { success: false };
    },
  });
}

export function createFlocklerProvider({ token = process.env.FLOCKLER_SOCIAL_FEED_TOKEN, fetchImpl, timeoutMs } = {}) {
  return createAdapter({
    provider: "flockler", origin: "https://api.flockler.com", pathForFeed: (id) => `/v2/sites/${id}/articles`, token, fetchImpl, timeoutMs,
    parse(body) {
      const result = flocklerResponseSchema.safeParse(body);
      return result.success ? { success: true, items: result.data.articles.map((item) => normalizeItem(item, item.author_name, item.author_handle)), nextCursor: result.data.next_cursor } : { success: false };
    },
  });
}

export function createSocialFeedProviderRegistry(options = {}) {
  return Object.freeze({
    curator: createCuratorProvider(options.curator),
    flockler: createFlocklerProvider(options.flockler),
  });
}
