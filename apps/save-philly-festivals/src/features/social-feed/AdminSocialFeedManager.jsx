"use client";

import { useRef, useState } from "react";

const label = (value) => value?.replaceAll("_", " ") || "—";

export default function AdminSocialFeedManager({ festivalId, initialFeed, initialPosts, initialPagination }) {
  const [feed, setFeed] = useState(initialFeed);
  const [posts, setPosts] = useState(initialPosts || []);
  const [moderationFilter, setModerationFilter] = useState("pending");
  const [pagination, setPagination] = useState(initialPagination || { page: 1, limit: 24, total: 0, pages: 0 });
  const [form, setForm] = useState({
    hashtag: initialFeed?.hashtag || "",
    enabled: initialFeed?.enabled ?? false,
    provider: initialFeed?.provider || "curator",
    provider_feed_id: initialFeed?.provider_feed_id || "",
  });
  const [reasons, setReasons] = useState({});
  const [status, setStatus] = useState({ pending: false, error: "", notice: "" });
  const requestSequence = useRef(0);

  async function reloadPosts(nextPage = 1, nextFilter = moderationFilter) {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    const query = new URLSearchParams({ page: String(nextPage), limit: "24" });
    if (nextFilter !== "all") query.set("status", nextFilter);
    const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festivalId)}/social-posts?${query}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Social posts could not be loaded.");
    if (sequence !== requestSequence.current) return null;
    setPosts(body.posts || []);
    setPagination(body.pagination || { page: nextPage, limit: 24, total: 0, pages: 0 });
    return body;
  }

  async function loadPage(nextPage, nextFilter = moderationFilter) {
    setStatus({ pending: true, error: "", notice: "" });
    try {
      await reloadPosts(nextPage, nextFilter);
      setStatus({ pending: false, error: "", notice: "" });
    } catch (error) {
      setStatus({ pending: false, error: error.message, notice: "" });
    }
  }

  async function saveFeed(event) {
    event.preventDefault();
    setStatus({ pending: true, error: "", notice: "" });
    const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festivalId)}/social-feed`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expected_revision: feed?.revision || 0, ...form }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ pending: false, error: response.status === 409 ? "Feed configuration changed. Reload and try again." : body.error || "Feed configuration could not be saved.", notice: "" });
      return;
    }
    setFeed(body.feed);
    try {
      await reloadPosts(1);
      setStatus({ pending: false, error: "", notice: "Social feed configuration saved." });
    } catch (error) {
      setStatus({ pending: false, error: error.message, notice: "Feed configuration was saved." });
    }
  }

  async function moderate(post, nextStatus) {
    const reason = reasons[post.id]?.trim();
    if (["hidden", "rejected"].includes(nextStatus) && !reason) {
      setStatus({ pending: false, error: "Enter a moderation reason before hiding or rejecting a post.", notice: "" });
      return;
    }
    setStatus({ pending: true, error: "", notice: "" });
    const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festivalId)}/social-posts/${encodeURIComponent(post.id)}/moderation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expected_moderation_revision: post.moderation_revision,
        status: nextStatus,
        ...(reason ? { reason } : {}),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ pending: false, error: response.status === 409 ? "This post changed. Reload before moderating it." : body.error || "Post moderation failed.", notice: "" });
      return;
    }
    setReasons((current) => ({ ...current, [post.id]: "" }));
    try {
      const result = await reloadPosts(pagination.page);
      if (result && !(result.posts || []).length && pagination.page > 1 && (result.pagination?.pages || 0) < pagination.page) {
        await reloadPosts(Math.max(1, result.pagination?.pages || pagination.page - 1));
      }
      setStatus({ pending: false, error: "", notice: `Post marked ${label(nextStatus)}.` });
    } catch (error) {
      setStatus({ pending: false, error: error.message, notice: `Post marked ${label(nextStatus)}, but the queue could not be refreshed.` });
    }
  }

  return (
    <section aria-labelledby="social-moderation-heading" className="space-y-5">
      <div>
        <h2 id="social-moderation-heading" className="text-xl font-bold">Moderated social feed</h2>
        <p className="mt-1 text-sm text-slate-600">Provider posts are cached as first-party text cards and remain private until approved here.</p>
      </div>
      {status.error && <p role="alert" className="rounded-md bg-red-50 p-4 text-red-900">{status.error}</p>}
      {status.notice && <p role="status" className="rounded-md bg-green-50 p-4 text-green-900">{status.notice}</p>}

      <form onSubmit={saveFeed} className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <h3 className="text-lg font-bold sm:col-span-2">Feed configuration</h3>
        <label className="font-semibold">Festival hashtag
          <input required maxLength={100} pattern="[A-Za-z0-9_]+" className="mt-1 block w-full rounded-md border p-3 font-normal" value={form.hashtag} onChange={(event) => setForm((current) => ({ ...current, hashtag: event.target.value.replace(/^#+/, "") }))} placeholder="PhillyFestival" />
        </label>
        <label className="font-semibold">Provider feed ID
          <input required maxLength={200} className="mt-1 block w-full rounded-md border p-3 font-normal" value={form.provider_feed_id} onChange={(event) => setForm((current) => ({ ...current, provider_feed_id: event.target.value }))} />
        </label>
        <label className="font-semibold">Aggregation provider
          <select className="mt-1 block w-full rounded-md border p-3 font-normal" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}>
            <option value="curator">Curator.io</option>
            <option value="flockler">Flockler</option>
          </select>
        </label>
        <label className="flex items-center gap-3 self-end rounded-md border p-3 font-semibold">
          <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
          Enable approved posts publicly
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button disabled={status.pending} className="rounded-md bg-black px-5 py-3 font-semibold text-white disabled:opacity-60">{status.pending ? "Saving…" : "Save social feed"}</button>
          <span className="text-sm text-slate-500">Revision {feed?.revision || 0} · Last sync {label(feed?.last_sync_status || "never")}</span>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-bold">Cached posts</h3><p className="text-sm text-slate-600">{pagination.total} posts in this queue</p></div>
          <label className="font-semibold">Moderation queue
            <select className="ml-2 rounded-md border p-2 font-normal" value={moderationFilter} onChange={(event) => { const nextFilter = event.target.value; setModerationFilter(nextFilter); loadPage(1, nextFilter); }}>
              <option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option><option value="rejected">Rejected</option><option value="all">All current-source posts</option>
            </select>
          </label>
        </div>
        {posts.length ? posts.map((post) => (
          <article key={post.id} className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{post.author_name || post.author_handle || label(post.network)}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{label(post.moderation_status)} · revision {post.moderation_revision}</span>
            </div>
            <p className="mt-2 text-slate-700">{post.text_excerpt}</p>
            <a className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline" href={post.canonical_url} target="_blank" rel="noopener noreferrer">Review original post</a>
            <label className="mt-3 block text-sm font-semibold">Moderation reason
              <textarea aria-label={`Moderation reason for ${post.author_name || post.author_handle || post.id}`} maxLength={1000} className="mt-1 block w-full rounded-md border p-2 font-normal" value={reasons[post.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [post.id]: event.target.value }))} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.moderation_status !== "approved" && <button type="button" disabled={status.pending} onClick={() => moderate(post, "approved")} className="rounded border px-3 py-2 font-semibold disabled:opacity-60">Approve post</button>}
              {post.moderation_status !== "hidden" && <button type="button" disabled={status.pending} onClick={() => moderate(post, "hidden")} className="rounded border px-3 py-2 font-semibold disabled:opacity-60">Hide post</button>}
              {post.moderation_status !== "rejected" && <button type="button" disabled={status.pending} onClick={() => moderate(post, "rejected")} className="rounded border px-3 py-2 font-semibold disabled:opacity-60">Reject post</button>}
            </div>
          </article>
        )) : <p className="rounded-xl border bg-white p-5 text-slate-600">No posts in this moderation queue. Save the feed configuration, then run the secure provider sync.</p>}
        {pagination.pages > 1 && <nav aria-label="Social post pages" className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
          <button type="button" disabled={status.pending || pagination.page <= 1} onClick={() => loadPage(pagination.page - 1)} className="rounded border px-3 py-2 font-semibold disabled:opacity-50">Previous posts</button>
          <span className="text-sm">Page {pagination.page} of {pagination.pages}</span>
          <button type="button" disabled={status.pending || pagination.page >= pagination.pages} onClick={() => loadPage(pagination.page + 1)} className="rounded border px-3 py-2 font-semibold disabled:opacity-50">Next posts</button>
        </nav>}
      </div>
    </section>
  );
}
