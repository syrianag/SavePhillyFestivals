import { prisma } from "@/lib/db";
import { publicDetailWhere, publishedDiscoveryWhere } from "@/features/editorial-workflow/publication-policy";
import { editorialE2EPublicCatalog, editorialE2EPublicFestival } from "@/features/editorial-workflow/editorial-e2e-fixture";
import {
  getDiscoveryE2eFestival,
  getDiscoveryE2eFestivalCatalog,
} from "@/features/festivals/discovery-e2e-fixture";
import {
  mapPublicFestival,
  PUBLIC_FESTIVAL_SELECT,
} from "@/features/festivals/public-festival";
import { buildDateOverlapFilter, getDiscoveryDateRange } from "@/features/festivals/discovery";



export async function getFestivals({
  status,
  page = 1,
  limit = 20,
  search,
} = {}) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [festivals, total] = await Promise.all([
    prisma.festival.findMany({
      where,
      include: {
        schedules: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.festival.count({ where }),
  ]);

  return {
    festivals,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getFestivalById(id) {
  return prisma.festival.findUnique({
    where: { id },
    include: {
      schedules: { orderBy: { start_time: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
    },
  });
}

export async function getApprovedFestivalById(id) {
  const fixtureCatalog = getDiscoveryE2eFestivalCatalog();
  if (fixtureCatalog !== undefined) {
    return mapPublicFestival(fixtureCatalog.find((festival) => festival.id === id) || editorialE2EPublicFestival({ id }));
  }

  const festival = await prisma.festival.findFirst({
    where: { id, ...publicDetailWhere },
    select: PUBLIC_FESTIVAL_SELECT,
  });

  return mapPublicFestival(festival);
}

export async function getPublicFestivalBySlug(slug) {
  const fixture = getDiscoveryE2eFestival(slug);
  if (fixture !== undefined) return mapPublicFestival(fixture || editorialE2EPublicFestival({ slug }));

  const festival = await prisma.festival.findFirst({
    where: { slug, ...publicDetailWhere },
    select: PUBLIC_FESTIVAL_SELECT,
  });

  return mapPublicFestival(festival);
}

/**
 * The calendar catalog, bounded to the current month forward by default.
 *
 * Without a bound this loads every published festival — with its schedules and primary
 * occurrence — on every request, and the calendar opens on the oldest historical date rather
 * than on what is coming up. Pass `{ date: "all" }` to include past festivals.
 */
export async function getPublicFestivalCatalog(filters = {}) {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) return [...fixture, ...editorialE2EPublicCatalog()].map(mapPublicFestival);

  const dateFilter = buildDateOverlapFilter(getDiscoveryDateRange(filters));
  const festivals = await prisma.festival.findMany({
    where: dateFilter ? { AND: [publishedDiscoveryWhere, dateFilter] } : publishedDiscoveryWhere,
    select: PUBLIC_FESTIVAL_SELECT,
    orderBy: { start_date: "asc" },
  });

  return festivals.map(mapPublicFestival);
}

/**
 * Map pins for published festivals that have been geocoded.
 *
 * Deliberately a narrow select rather than reusing PUBLIC_FESTIVAL_SELECT: a pin needs five
 * fields, and this runs for the whole catalog at once. Festivals without coordinates are
 * excluded by the query, so an ungeocoded festival is simply absent from the map rather
 * than rendering at (0, 0) in the Atlantic.
 */
/* Deliberately narrower than PUBLIC_DISCOVERY_SELECT: that carries `description`, which is
 * capped at 10,000 characters and would be megabytes across a few hundred pins for a card that
 * never renders it. */
const MAP_PIN_SELECT = Object.freeze({
  id: true,
  slug: true,
  name: true,
  location: true,
  city: true,
  latitude: true,
  longitude: true,
  image_url: true,
  start_date: true,
  end_date: true,
  calendar_date_type: true,
  all_day_start: true,
  all_day_end: true,
  time_zone: true,
  categories: { select: { category: { select: { name: true, slug: true } } } },
});

/* A safety cap rather than pagination: the map is a single view, and past this many pins the
 * browser is the bottleneck regardless of what the database returns. */
const MAP_PIN_LIMIT = 500;

export async function getPublicFestivalMapPins(filters = {}) {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) {
    const { matchesDiscoveryFilters } = await import("@/features/festivals/public-discovery");
    return [...fixture, ...editorialE2EPublicCatalog()]
      .filter((festival) => festival.latitude != null && festival.longitude != null)
      .filter((festival) => matchesDiscoveryFilters(festival, filters))
      .map((festival) => ({
        id: festival.id,
        slug: festival.slug,
        name: festival.name,
        location: festival.location || null,
        city: festival.city || null,
        latitude: festival.latitude,
        longitude: festival.longitude,
        image_url: festival.image_url ?? null,
        start_date: festival.start_date ?? null,
        end_date: festival.end_date ?? null,
        categories: festival.categories ?? [],
      }));
  }

  const { buildApprovedDiscoveryWhere } = await import("@/features/festivals/public-discovery");
  return prisma.festival.findMany({
    where: {
      AND: [
        buildApprovedDiscoveryWhere(filters),
        { latitude: { not: null }, longitude: { not: null } },
      ],
    },
    select: MAP_PIN_SELECT,
    orderBy: { name: "asc" },
    take: MAP_PIN_LIMIT,
  });
}

// Public callers must use the approved-only DTO. Private admin lookups remain ID-based.
export const getFestivalBySlug = getPublicFestivalBySlug;

/* Legacy server mutation helpers are intentionally disabled by F-08. Use the producer
 * submission and editorial workflow services so ownership, revisions, history, and
 * immutable snapshots cannot be bypassed. */
export async function createFestival() {
  throw new Error("Legacy festival creation is disabled.");
}

export async function updateFestival() {
  throw new Error("Legacy festival update is disabled.");
}

export async function deleteFestival() {
  throw new Error("Festival hard-delete is disabled; use an archival transition.");
}
