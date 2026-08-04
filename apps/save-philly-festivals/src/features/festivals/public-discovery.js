import {
  buildDateOverlapFilter,
  festivalOverlapsRange,
  getDiscoveryDateRange,
  paginatePublicResults,
  sortFestivalRecords,
} from "@/features/festivals/discovery";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { DISCOVERY_E2E_FESTIVALS } from "@/features/festivals/discovery-e2e-fixture";

export const PUBLIC_DISCOVERY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  location: true,
  city: true,
  start_date: true,
  end_date: true,
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

  return { status: FESTIVAL_STATUS.APPROVED, ...(and.length ? { AND: and } : {}) };
}

function databaseOrder(sort) {
  if (sort === "newest") return [{ created_at: "desc" }, { name: "asc" }, { id: "asc" }];
  if (sort === "name") return [{ name: "asc" }, { id: "asc" }];
  return [{ start_date: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }];
}

function fixtureDiscovery(filters, now) {
  const range = getDiscoveryDateRange(filters, now);
  const q = filters.q.toLocaleLowerCase("en-US");
  const category = filters.category.toLocaleLowerCase("en-US");
  const location = filters.location.toLocaleLowerCase("en-US");
  const records = DISCOVERY_E2E_FESTIVALS.filter((festival) => {
    const searchable = [
      festival.name,
      festival.description,
      festival.location,
      festival.city,
      ...festival.categories.map(({ category: item }) => item.name),
    ].join(" ").toLocaleLowerCase("en-US");
    const categoryNames = festival.categories.map(({ category: item }) => [item.name, item.slug]).flat().map((item) => item.toLocaleLowerCase("en-US"));
    const place = `${festival.location} ${festival.city}`.toLocaleLowerCase("en-US");
    return (!q || searchable.includes(q))
      && (!category || categoryNames.includes(category))
      && (!location || place.includes(location))
      && ((!range.start && !range.end) || festivalOverlapsRange(festival, range));
  });
  const sorted = sortFestivalRecords(records, filters);
  return {
    ...paginatePublicResults(sorted, filters.page, sorted.length),
    categories: ["Art", "Food"],
    locations: ["Penn's Landing", "South Philadelphia"],
  };
}

export async function discoverApprovedFestivals(filters, { now = new Date() } = {}) {
  if (process.env.DISCOVERY_E2E_FIXTURE === "1") return fixtureDiscovery(filters, now);

  const { prisma } = await import("@/lib/db");
  const where = buildApprovedDiscoveryWhere(filters, now);
  const [records, total, categoryRows, locationRows] = await Promise.all([
    prisma.festival.findMany({
      where,
      select: PUBLIC_DISCOVERY_SELECT,
      orderBy: databaseOrder(filters.sort),
    }),
    prisma.festival.count({ where }),
    prisma.category.findMany({
      where: { festivals: { some: { festival: { status: FESTIVAL_STATUS.APPROVED } } } },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.festival.findMany({
      where: { status: FESTIVAL_STATUS.APPROVED, location: { not: null } },
      distinct: ["location"],
      orderBy: { location: "asc" },
      select: { location: true },
    }),
  ]);

  const sorted = sortFestivalRecords(records, filters);
  return {
    ...paginatePublicResults(sorted, filters.page, total),
    categories: categoryRows.map(({ name }) => name),
    locations: locationRows.map(({ location }) => location).filter(Boolean),
  };
}
