import Link from "next/link";

import { FestivalCard } from "@/components/shared/FestivalCard";
import { formatFestivalDate } from "@/features/festivals/discovery";
import { discoverApprovedFestivals } from "@/features/festivals/public-discovery";
import { PaginationLink } from "@/features/festivals/PaginationLink";

const CARD_COLORS = ["#1E7BF6", "#206C4E", "#F6C847", "#FE7D0C", "#FF8577", "#FB439B"];
const GRID = "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

function displayLocation(festival) {
  return festival.location || festival.city || "Philadelphia";
}

function pageHref(filters, page) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) {
    if (value && !(key === "sort" && value === (filters.q ? "relevance" : "soonest"))) {
      params.set(key, String(value));
    }
  }
  return `/?${params.toString()}#festival-results`;
}

/**
 * Placeholder shown while a page of results is being fetched.
 *
 * Matches the real grid's shape so the surrounding layout does not shift when results arrive —
 * a skeleton that changes the page height is its own kind of jank.
 */
export function FestivalResultsSkeleton() {
  return (
    <div className={`mt-8 ${GRID}`} aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="h-[140px] w-full animate-pulse bg-slate-100" />
          <div className="flex min-h-[128px] flex-col gap-2 px-4 py-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-auto h-5 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The discovery result grid and its pagination.
 *
 * Split out of the page and rendered inside a Suspense boundary so paginating swaps only this
 * subtree. Previously the whole page — hero, search controls, featured row — awaited the same
 * query, so every "Next" click blanked and re-rendered the entire route and read as a full
 * page reload.
 */
export async function FestivalResults({ filters }) {
  let discovery;
  try {
    discovery = await discoverApprovedFestivals(filters);
  } catch (error) {
    console.error("Public festival discovery failed", error);
    return (
      <div role="alert" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <h3 className="font-heading text-2xl font-bold text-slate-800">Festival listings are temporarily unavailable</h3>
        <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">We couldn&apos;t load approved festivals right now. Please try again shortly.</p>
      </div>
    );
  }

  const { items, pagination } = discovery;
  const resultLabel = `${pagination.total} ${pagination.total === 1 ? "festival" : "festivals"} found`;

  return (
    <>
      <p aria-live="polite" className="mt-2 w-fit rounded-full bg-slate-100 px-3 py-1 font-ui text-sm font-bold text-slate-500">
        {resultLabel}
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-12 text-center">
          <h3 className="font-heading text-2xl font-bold text-slate-800">No festivals match your search</h3>
          <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">Try a different keyword, date range, category, or location.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 font-ui text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className={`mt-8 ${GRID}`}>
          {items.map((festival, index) => (
            <FestivalCard
              key={festival.id}
              variant="compact"
              id={festival.id}
              slug={festival.slug}
              image={festival.image_url}
              title={festival.name}
              date={formatFestivalDate(festival.start_date, festival.end_date)}
              location={displayLocation(festival)}
              category={festival.categories?.[0]?.category?.name}
              bgColor={CARD_COLORS[index % CARD_COLORS.length]}
            />
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <nav aria-label="Festival result pages" className="mt-12 flex items-center justify-center gap-3 border-t border-slate-100 pt-8">
          {pagination.page > 1 && (
            <PaginationLink
              href={pageHref(filters, pagination.page - 1)}
              className="rounded-full border border-slate-300 px-4 py-2 font-ui text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Previous
            </PaginationLink>
          )}
          <span className="font-ui text-sm font-bold text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          {pagination.page < pagination.pages && (
            <PaginationLink
              href={pageHref(filters, pagination.page + 1)}
              className="rounded-full bg-slate-900 px-5 py-2 font-ui text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800"
            >
              Next
            </PaginationLink>
          )}
        </nav>
      )}
    </>
  );
}
