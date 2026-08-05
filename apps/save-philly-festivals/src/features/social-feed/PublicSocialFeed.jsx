import { ExternalLink, MessageSquareText } from "lucide-react";

const NETWORK_LABELS = Object.freeze({
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "Social post",
});

function formatPublishedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export default function PublicSocialFeed({ feed }) {
  if (!feed?.enabled) return null;

  const unavailable = feed.state === "unavailable";
  return (
    <section aria-labelledby="social-feed-heading" data-testid="moderated-social-feed">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="social-feed-heading" className="font-heading text-xl font-semibold">
            Festival community posts
          </h2>
          {feed.hashtag && <p className="mt-1 font-ui text-sm font-medium text-[#45556C]">Posts for {feed.hashtag}</p>}
        </div>
        <p className="font-ui text-xs text-[#667085]">Reviewed by Philly Fests editors</p>
      </div>

      {feed.posts.length ? (
        <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {feed.posts.map((post) => {
            const publishedAt = formatPublishedAt(post.publishedAt);
            const author = post.authorName || post.authorHandle || NETWORK_LABELS[post.network] || "Festival community";
            return (
              <li key={post.id}>
                <article className="flex h-full flex-col rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 text-sm text-[#667085]">
                    <span className="font-ui font-semibold text-[#344054]">{NETWORK_LABELS[post.network] || "Social post"}</span>
                    {publishedAt && <time dateTime={new Date(post.publishedAt).toISOString()}>{publishedAt}</time>}
                  </div>
                  <p className="mt-3 font-body leading-relaxed text-[#344054]">{post.text}</p>
                  <div className="mt-auto pt-4">
                    <p className="font-ui text-sm font-medium text-black">{author}</p>
                    {post.authorHandle && post.authorName && <p className="font-ui text-xs text-[#667085]">{post.authorHandle}</p>}
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 font-ui text-sm font-semibold text-[#155EEF] hover:underline"
                    >
                      View original post <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] p-5 text-[#475467]">
          <MessageSquareText className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            {unavailable
              ? "Community posts are temporarily unavailable. Follow the festival’s official channels for updates."
              : "No approved community posts are available right now. Follow the festival’s official channels for updates."}
          </p>
        </div>
      )}
    </section>
  );
}
