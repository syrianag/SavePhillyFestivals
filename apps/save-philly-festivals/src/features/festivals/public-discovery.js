import { cache } from "react";

import {
  buildDateOverlapFilter,
  festivalOverlapsRange,
  getDiscoveryDateRange,
  paginatePublicResults,
  parseDiscoveryParams,
  publicPageResult,
  resolvePublicPageWindow,
  sortFestivalRecords,
} from "@/features/festivals/discovery";
import { publishedDiscoveryWhere } from "@/features/editorial-workflow/publication-policy";
import { DISCOVERY_E2E_FESTIVALS } from "@/features/festivals/discovery-e2e-fixture";

/* Upper bound on rows scored for application-side relevance ranking. Keeps a text search
 * from loading an unbounded result set while comfortably covering the public catalog. */
const RELEVANCE_CANDIDATE_LIMIT = 500;

export const PUBLIC_DISCOVERY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  location: true,
  city: true,
  start_date: true,
  end_date: true,
  /* All-day festivals (every CSV import) carry their dates here. Selected so date rendering and
   * day-key derivation can tell an all-day calendar date from a timed instant — without these,
   * imported festivals render as "Dates TBD". */
  calendar_date_type: true,
  all_day_start: true,
  all_day_end: true,
  time_zone: true,
  created_at: true,
  image_url: true,
  categories: { select: { category: { select: { name: true, slug: true } } } },
};

function searchFilter(q) {
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { categories: { some: { category: { name: { contains: q, mode: "insensitive" } } } } },
    ],
  };
}

export function buildApprovedDiscoveryWhere(filters, now = new Date()) {
  const and = [];
  if (filters.q) and.push(searchFilter(filters.q));
  if (filters.category) {
    and.push({
      categories: {
        some: {
          category: {
            OR: [
              { name: { equals: filters.category, mode: "insensitive" } },
              { slug: { equals: filters.category, mode: "insensitive" } },
            ],
          },
        },
      },
    });
  }
  if (filters.location) {
    and.push({
      OR: [
        { location: { contains: filters.location, mode: "insensitive" } },
        { city: { contains: filters.location, mode: "insensitive" } },
      ],
    });
  }
  const dateFilter = buildDateOverlapFilter(getDiscoveryDateRange(filters, now));
  if (dateFilter) and.push(dateFilter);

  return { ...publishedDiscoveryWhere, ...(and.length ? { AND: and } : {}) };
}

function databaseOrder(sort) {
  if (sort === "newest") return [{ created_at: "desc" }, { name: "asc" }, { id: "asc" }];
  if (sort === "name") return [{ name: "asc" }, { id: "asc" }];
  return [{ start_date: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }];
}

/**
 * Whether one fixture festival satisfies the active filters.
 *
 * Exported so the map's fixture branch and the discovery list's fixture branch apply exactly
 * the same rules. Two hand-written copies drifting apart is the class of bug the fixture exists
 * to catch, so it must not be the bug the fixture introduces.
 */
export function matchesDiscoveryFilters(festival, filters, now = new Date()) {
  const range = getDiscoveryDateRange(filters, now);
  const q = (filters.q || "").toLocaleLowerCase("en-US");
  const category = (filters.category || "").toLocaleLowerCase("en-US");
  const location = (filters.location || "").toLocaleLowerCase("en-US");

  const searchable = [
    festival.name,
    festival.description,
    festival.location,
    festival.city,
    ...festival.categories.map(({ category: item }) => item.name),
  ].join(" ").toLocaleLowerCase("en-US");
  const categoryNames = festival.categories
    .map(({ category: item }) => [item.name, item.slug])
    .flat()
    .map((item) => item.toLocaleLowerCase("en-US"));
  const place = `${festival.location} ${festival.city}`.toLocaleLowerCase("en-US");

  return (!q || searchable.includes(q))
    && (!category || categoryNames.includes(category))
    && (!location || place.includes(location))
    && ((!range.start && !range.end) || festivalOverlapsRange(festival, range));
}

function fixtureDiscovery(filters, now) {
  const records = DISCOVERY_E2E_FESTIVALS.filter((festival) => matchesDiscoveryFilters(festival, filters, now));
  const sorted = sortFestivalRecords(records, filters);
  return {
    ...paginatePublicResults(sorted, filters.page, sorted.length),
    categories: ["Art", "Food"],
    locations: ["Penn's Landing", "South Philadelphia"],
  };
}

/**
 * Editor-curated homepage promotions.
 *
 * Returns an empty array when nothing is flagged so the caller can fall back to the leading
 * discovery results — that keeps the homepage populated while promotions are still being set up
 * rather than emptying the featured row the moment this ships.
 */
export async function getFeaturedFestivals(limit = 2, { now = new Date() } = {}) {
  const defaults = parseDiscoveryParams({});
  if (process.env.DISCOVERY_E2E_FIXTURE === "1") {
    return fixtureDiscovery(defaults, now).items.slice(0, limit);
  }

  const { prisma } = await import("@/lib/db");
  const dateFilter = buildDateOverlapFilter(getDiscoveryDateRange({ date: "" }, now));
  const curated = await prisma.festival.findMany({
    where: {
      AND: [publishedDiscoveryWhere, { featured: true }, ...(dateFilter ? [dateFilter] : [])],
    },
    select: PUBLIC_DISCOVERY_SELECT,
    orderBy: [{ featured_rank: { sort: "asc", nulls: "last" } }, { start_date: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    take: limit,
  });
  if (curated.length) return curated;

  /* Nothing flagged yet: fall back to the soonest upcoming festivals so the row is never empty.
   * The fallback lives here rather than in the page so a second caller cannot forget it. */
  const { items } = await discoverApprovedFestivals({ ...defaults, page: 1 }, { now });
  return items.slice(0, limit);
}

/**
 * Filter facets for the discovery controls.
 *
 * Deliberately separate from the result query: these depend only on what is published, not on
 * the page or the active filters, so paginating should not re-derive them. Wrapped in `cache()`
 * so the page and the suspended result list share one lookup per request.
 */
export const getDiscoveryFacets = cache(async () => {
  if (process.env.DISCOVERY_E2E_FIXTURE === "1") {
    return { categories: ["Art", "Cultural", "Food"], locations: ["Germantown", "Penn's Landing", "South Philadelphia"] };
  }
  const { prisma } = await import("@/lib/db");
  const [categoryRows, locationRows] = await Promise.all([
    prisma.category.findMany({
      where: { festivals: { some: { festival: publishedDiscoveryWhere } } },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.festival.findMany({
      where: { ...publishedDiscoveryWhere, location: { not: null } },
      distinct: ["location"],
      orderBy: { location: "asc" },
      select: { location: true },
    }),
  ]);
  return {
    categories: categoryRows.map(({ name }) => name),
    locations: locationRows.map(({ location }) => location).filter(Boolean),
  };
});

export async function discoverApprovedFestivals(filters, { now = new Date() } = {}) {
  if (process.env.DISCOVERY_E2E_FIXTURE === "1") return fixtureDiscovery(filters, now);

  const { prisma } = await import("@/lib/db");
  const where = buildApprovedDiscoveryWhere(filters, now);
  /* Relevance ranking is computed in the application, so it still needs a candidate set.
   * Every other sort is fully expressible in SQL and is paginated by the database. */
  const usesRelevanceRanking = filters.sort === "relevance" && Boolean(filters.q);
  const total = await prisma.festival.count({ where });
  const window = resolvePublicPageWindow(filters.page, total);
  const pageQuery = usesRelevanceRanking
    ? { where, select: PUBLIC_DISCOVERY_SELECT, orderBy: databaseOrder(filters.sort), take: RELEVANCE_CANDIDATE_LIMIT }
    : { where, select: PUBLIC_DISCOVERY_SELECT, orderBy: databaseOrder(filters.sort), skip: window.offset, take: window.take };
  const [records, facets] = await Promise.all([
    prisma.festival.findMany(pageQuery),
    getDiscoveryFacets(),
  ]);

  const paged = usesRelevanceRanking
    ? paginatePublicResults(sortFestivalRecords(records, filters), filters.page, total)
    : publicPageResult(records, filters.page, total);
  return { ...paged, ...facets };
}
