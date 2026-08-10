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

export async function getPublicFestivalCatalog() {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) return [...fixture, ...editorialE2EPublicCatalog()].map(mapPublicFestival);

  const festivals = await prisma.festival.findMany({
    where: publishedDiscoveryWhere,
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
export async function getPublicFestivalMapPins() {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) {
    return [...fixture, ...editorialE2EPublicCatalog()]
      .filter((festival) => festival.latitude != null && festival.longitude != null)
      .map((festival) => ({
        id: festival.id,
        slug: festival.slug,
        name: festival.name,
        location: festival.location || null,
        latitude: festival.latitude,
        longitude: festival.longitude,
        image_url: festival.image_url || null,
      }));
  }

  return prisma.festival.findMany({
    where: { ...publishedDiscoveryWhere, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, slug: true, name: true, location: true, latitude: true, longitude: true, image_url: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Published festivals that are officially featured on the homepage and the digital
 * exhibit. Falls back to the most recently published festivals when none are marked
 * featured yet, so the carousel never renders empty during rollout.
 */
export async function getFeaturedFestivals({ limit = 4 } = {}) {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) {
    return (fixture.length ? [...fixture, ...editorialE2EPublicCatalog()] : [])
      .map(mapPublicFestival)
      .slice(0, limit);
  }

  const featured = await prisma.festival.findMany({
    where: { ...publishedDiscoveryWhere, featured: true },
    select: PUBLIC_FESTIVAL_SELECT,
    orderBy: [{ published_at: "desc" }, { start_date: "asc" }],
    take: limit,
  });

  if (featured.length) return featured.map(mapPublicFestival);

  const fallback = await prisma.festival.findMany({
    where: publishedDiscoveryWhere,
    select: PUBLIC_FESTIVAL_SELECT,
    orderBy: [{ published_at: "desc" }, { start_date: "asc" }],
    take: limit,
  });
  return fallback.map(mapPublicFestival);
}

/**
 * Published festivals that carry a public photo, for the digital exhibit. Only
 * published festivals appear, and only when a public image URL exists — imported
 * festivals and pre-publication drafts are excluded until they gain one.
 */
export async function getPublicFestivalGallery({ limit = 60 } = {}) {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) {
    return [...fixture, ...editorialE2EPublicCatalog()]
      .map(mapPublicFestival)
      .filter((festival) => festival.image_url)
      .slice(0, limit);
  }

  const festivals = await prisma.festival.findMany({
    where: publishedDiscoveryWhere,
    select: { ...PUBLIC_FESTIVAL_SELECT, featured: true },
    orderBy: [{ featured: "desc" }, { published_at: "desc" }, { start_date: "asc" }],
    take: limit,
  });
  return festivals.map(mapPublicFestival).filter((festival) => festival.image_url);
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
