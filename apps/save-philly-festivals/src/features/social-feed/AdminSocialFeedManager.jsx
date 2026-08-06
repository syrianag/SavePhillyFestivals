"use client";

import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Settings2, 
  CheckCircle, 
  XCircle, 
  EyeOff, 
  MessageSquare, 
  Link2, 
  ExternalLink, 
  AlertTriangle,
  Sparkles,
  User,
  Clock,
  Compass
} from "lucide-react";

const label = (value) => value?.replaceAll("_", " ") || "—";

const moderationBadgeMap = {
  pending: { variant: "outline", className: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  approved: { variant: "default", className: "bg-green-600 text-white", label: "Approved" },
  hidden: { variant: "secondary", className: "bg-slate-100 text-slate-500 border-slate-200", label: "Hidden" },
  rejected: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", label: "Rejected" },
};

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
      setStatus({ 
        pending: false, 
        error: response.status === 409 ? "Feed configuration changed. Reload and try again." : body.error || "Feed configuration could not be saved.", 
        notice: "" 
      });
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
      setStatus({ 
        pending: false, 
        error: response.status === 409 ? "This post changed. Reload before moderating it." : body.error || "Post moderation failed.", 
        notice: "" 
      });
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
    <section aria-labelledby="social-moderation-heading" className="space-y-6">
      {/* Title */}
      <div className="border-t border-slate-200 pt-8">
        <h2 id="social-moderation-heading" className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2">
          <Compass className="size-6 text-slate-700" />
          Moderated social feed
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Sync and moderate external posts gathered from social feeds. Posts remain private until explicitly approved below.
        </p>
      </div>

      {/* Notifications */}
      {status.error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="font-semibold">{status.error}</div>
        </div>
      )}
      {status.notice && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-xs">
          <CheckCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
          <div className="font-semibold">{status.notice}</div>
        </div>
      )}

      {/* Feed configuration Form */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="size-5 text-slate-500" />
            Feed configuration
          </CardTitle>
          <CardDescription>Configure search parameters and public availability</CardDescription>
        </CardHeader>
        
        <form onSubmit={saveFeed}>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="social-hashtag" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Festival hashtag
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold">#</span>
                <input 
                  id="social-hashtag"
                  required 
                  maxLength={100} 
                  pattern="[A-Za-z0-9_]+" 
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" 
                  value={form.hashtag} 
                  onChange={(event) => setForm((current) => ({ ...current, hashtag: event.target.value.replace(/^#+/, "") }))} 
                  placeholder="PhillyFestival" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="social-provider-feed-id" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Provider feed ID
              </label>
              <input 
                id="social-provider-feed-id"
                required 
                maxLength={200} 
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" 
                value={form.provider_feed_id} 
                onChange={(event) => setForm((current) => ({ ...current, provider_feed_id: event.target.value }))} 
                placeholder="Feed ID or UUID"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="social-provider" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Aggregation provider
              </label>
              <select 
                id="social-provider"
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" 
                value={form.provider} 
                onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
              >
                <option value="curator">Curator.io</option>
                <option value="flockler">Flockler</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 self-end p-2.5 border border-slate-100 bg-slate-50/50 rounded-lg">
              <input 
                type="checkbox" 
                id="social-enable-public"
                className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={form.enabled} 
                onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} 
              />
              <label htmlFor="social-enable-public" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                Enable approved posts publicly
              </label>
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button type="submit" disabled={status.pending} className="font-semibold shadow-xs">
              {status.pending ? "Saving…" : "Save social feed"}
            </Button>
            <div className="text-xs text-slate-500">
              Revision {feed?.revision || 0} · Last sync: <span className="font-semibold text-slate-700 capitalize">{label(feed?.last_sync_status || "never")}</span>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Moderated Posts Queue */}
      <div className="space-y-4">
        
        {/* Subtitle & Filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Cached Posts</h3>
            <p className="text-xs text-slate-500">{pagination.total} posts in this queue</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="social-moderation-queue" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Moderation queue</label>
            <select 
              id="social-moderation-queue"
              className="rounded-lg border border-slate-200 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold" 
              value={moderationFilter} 
              onChange={(event) => { 
                const nextFilter = event.target.value; 
                setModerationFilter(nextFilter); 
                loadPage(1, nextFilter); 
              }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
              <option value="rejected">Rejected</option>
              <option value="all">All posts</option>
            </select>
          </div>
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.length ? (
            posts.map((post) => {
              const badge = moderationBadgeMap[post.moderation_status] || { variant: "outline", label: post.moderation_status };
              return (
                <article key={post.id} className="rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <User className="size-4 text-slate-400" />
                        {post.author_name || post.author_handle || "Unknown Author"}
                      </div>
                      {post.author_handle && (
                        <span className="text-xs text-slate-400 font-mono">@{post.author_handle}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={badge.variant} className={`font-semibold border text-[10px] ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {post.moderation_status} · revision {post.moderation_revision}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4 flex-1">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {post.text_excerpt}
                    </p>
                    {post.canonical_url && (
                      <a 
                        className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline" 
                        href={post.canonical_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Review original post <ExternalLink className="size-3" />
                      </a>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                      <label htmlFor={`reason-${post.id}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                        Moderation reason
                      </label>
                      <textarea 
                        id={`reason-${post.id}`}
                        aria-label={`Moderation reason for ${post.author_name || post.author_handle || post.id}`} 
                        maxLength={1000} 
                        placeholder="Log reason (Required to hide/reject)..."
                        className="w-full min-h-15 rounded-lg border border-slate-200 p-2 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" 
                        value={reasons[post.id] || ""} 
                        onChange={(event) => setReasons((current) => ({ ...current, [post.id]: event.target.value }))} 
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 bg-slate-50/50 pt-3 flex flex-wrap gap-2">
                    {post.moderation_status !== "approved" && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={status.pending} 
                        onClick={() => moderate(post, "approved")} 
                        className="font-semibold text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                      >
                        <CheckCircle className="size-3.5 mr-1" /> Approve post
                      </Button>
                    )}
                    {post.moderation_status !== "hidden" && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={status.pending} 
                        onClick={() => moderate(post, "hidden")} 
                        className="font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                      >
                        <EyeOff className="size-3.5 mr-1" /> Hide post
                      </Button>
                    )}
                    {post.moderation_status !== "rejected" && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={status.pending} 
                        onClick={() => moderate(post, "rejected")} 
                        className="font-semibold text-red-700 bg-red-50 border-red-200 hover:bg-red-100"
                      >
                        <XCircle className="size-3.5 mr-1" /> Reject post
                      </Button>
                    )}
                  </CardFooter>
                </article>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-2 p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-white">
              <Compass className="size-8 text-slate-300 mx-auto mb-2" />
              <div className="text-base font-semibold text-slate-700">No posts in this queue</div>
              <p className="text-sm max-w-md mx-auto mt-1">Configure feed properties, run sync, or adjust your moderation status filter.</p>
            </div>
          )}
        </div>

        {/* Social Feed pagination controls */}
        {pagination.pages > 1 && (
          <nav aria-label="Social post pages" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <Button 
              type="button" 
              variant="outline"
              disabled={status.pending || pagination.page <= 1} 
              onClick={() => loadPage(pagination.page - 1)} 
              className="font-semibold"
            >
              Previous posts
            </Button>
            <span className="text-sm font-semibold text-slate-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button 
              type="button" 
              variant="outline"
              disabled={status.pending || pagination.page >= pagination.pages} 
              onClick={() => loadPage(pagination.page + 1)} 
              className="font-semibold"
            >
              Next posts
            </Button>
          </nav>
        )}

      </div>
    </section>
  );
}
