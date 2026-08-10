import { describe, expect, it, vi } from "vitest";

import {
  buildDateOverlapFilter,
  festivalOverlapsRange,
  getDiscoveryDateRange,
  paginatePublicResults,
  parseDiscoveryParams,
  sortFestivalRecords,
} from "@/features/festivals/discovery";
import {
  PUBLIC_DISCOVERY_SELECT,
  buildApprovedDiscoveryWhere,
  discoverApprovedFestivals,
} from "@/features/festivals/public-discovery";

const prismaMock = vi.hoisted(() => ({
  category: { findMany: vi.fn() },
  festival: { count: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

describe("parseDiscoveryParams", () => {
  it("supports public aliases, relevance defaults, and normalized custom ranges", () => {
    expect(parseDiscoveryParams({
      search: "  jazz  ",
      date: "custom",
      from: "2026-09-20",
      to: "2026-09-10",
      category: "Music",
      neighborhood: "West Philly",
    })).toEqual({
      q: "jazz",
      date: "custom",
      start: "2026-09-10",
      end: "2026-09-20",
      category: "Music",
      location: "West Philly",
      sort: "relevance",
      page: 1,
    });
  });

  it("rejects invalid options while preserving valid positive page requests", () => {
    expect(parseDiscoveryParams({ date: "yesterday", start: "2026-02-30", sort: "random", page: "99" })).toMatchObject({
      date: "",
      start: "",
      sort: "soonest",
      page: 99,
    });
    expect(parseDiscoveryParams({ sort: "relevance" }).sort).toBe("soonest");
  });
});

describe("New York date ranges and interval overlap", () => {
  it("creates DST-aware, end-exclusive custom day boundaries", () => {
    const range = getDiscoveryDateRange(parseDiscoveryParams({
      date: "custom",
      start: "2026-03-08",
      end: "2026-03-08",
    }));
    expect(range.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("includes festivals spanning into a range and excludes those ending before it", () => {
    const range = {
      start: new Date("2026-06-10T04:00:00.000Z"),
      end: new Date("2026-06-12T04:00:00.000Z"),
    };
    expect(festivalOverlapsRange({ start_date: "2026-06-01T12:00:00Z", end_date: "2026-06-10T04:00:00Z" }, range)).toBe(true);
    expect(festivalOverlapsRange({ start_date: "2026-06-09T12:00:00Z", end_date: "2026-06-10T03:59:59Z" }, range)).toBe(false);
    expect(festivalOverlapsRange({ start_date: "2026-06-12T04:00:00Z", end_date: null }, range)).toBe(false);
  });

  it("builds the equivalent Prisma overlap predicate", () => {
    const start = new Date("2026-06-10T04:00:00.000Z");
    const end = new Date("2026-06-12T04:00:00.000Z");
    expect(buildDateOverlapFilter({ start, end })).toEqual({
      AND: [
        { start_date: { not: null } },
        { start_date: { lt: end } },
        { OR: [{ end_date: { gte: start } }, { end_date: null, start_date: { gte: start } }] },
      ],
    });
  });
});

describe("approved discovery predicates", () => {
  it("always pins public collection queries to approved or published", () => {
    const where = buildApprovedDiscoveryWhere(parseDiscoveryParams({ q: "food", location: "South" }));
    expect(where.status).toEqual({ in: ["approved", "published"] });
    expect(where.AND).toHaveLength(2);
  });

  it("allowlists public card fields without producer contact metadata", () => {
    expect(PUBLIC_DISCOVERY_SELECT).toMatchObject({
      id: true,
      slug: true,
      name: true,
      categories: expect.any(Object),
    });
    expect(PUBLIC_DISCOVERY_SELECT).not.toHaveProperty("contact_email");
    expect(PUBLIC_DISCOVERY_SELECT).not.toHaveProperty("contact_phone");
    expect(PUBLIC_DISCOVERY_SELECT).not.toHaveProperty("submitted_by");
    expect(PUBLIC_DISCOVERY_SELECT).not.toHaveProperty("rejection_reason");
  });
});

describe("production discovery query", () => {
  it("uses approved-or-published predicates and a public field allowlist", async () => {
    const festival = {
      id: "approved-1",
      slug: "approved-festival",
      name: "Approved Festival",
      description: null,
      location: "Philadelphia",
      city: "Philadelphia",
      start_date: new Date("2026-09-01T16:00:00.000Z"),
      end_date: null,
      created_at: new Date("2026-08-01T16:00:00.000Z"),
      image_url: null,
      categories: [],
    };
    prismaMock.festival.findMany
      .mockResolvedValueOnce([festival])
      .mockResolvedValueOnce([{ location: "Philadelphia" }]);
    prismaMock.festival.count.mockResolvedValueOnce(1);
    prismaMock.category.findMany.mockResolvedValueOnce([]);

    const result = await discoverApprovedFestivals(parseDiscoveryParams({}));

    expect(prismaMock.festival.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { status: { in: ["approved", "published"] } },
        select: PUBLIC_DISCOVERY_SELECT,
      })
    );
    expect(result.items).toEqual([festival]);
    expect(result.pagination).toMatchObject({ total: 1, page: 1 });
    expect(result.locations).toEqual(["Philadelphia"]);
  });
});

describe("discovery sorting", () => {
  const records = [
    { id: "b", name: "Jazz in the Park", description: "Music", location: "North", start_date: "2026-08-20", created_at: "2026-01-01", categories: [] },
    { id: "c", name: "Community Day", description: "Live jazz", location: "West", start_date: "2026-08-10", created_at: "2026-03-01", categories: [] },
    { id: "a", name: "Jazz", description: "Annual festival", location: "South", start_date: "2026-09-01", created_at: "2026-02-01", categories: [] },
  ];

  it("uses meaningful relevance tiers with deterministic date tie-breaks", () => {
    expect(sortFestivalRecords(records, { sort: "relevance", q: "jazz" }).map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("supports soonest, newest, and name ordering", () => {
    expect(sortFestivalRecords(records, { sort: "soonest", q: "" }).map(({ id }) => id)).toEqual(["c", "b", "a"]);
    expect(sortFestivalRecords(records, { sort: "newest", q: "" }).map(({ id }) => id)).toEqual(["c", "a", "b"]);
    expect(sortFestivalRecords(records, { sort: "name", q: "" }).map(({ id }) => id)).toEqual(["c", "a", "b"]);
  });
});

describe("public offset pagination", () => {
  it("returns 24 records per page without hiding results after page two", () => {
    const records = Array.from({ length: 60 }, (_, id) => ({ id }));
    const result = paginatePublicResults(records, 3, 60);
    expect(result.items).toHaveLength(12);
    expect(result.items[0].id).toBe(48);
    expect(result.items[11].id).toBe(59);
    expect(result.pagination).toEqual({ page: 3, pageSize: 24, total: 60, pages: 3, offset: 48 });
  });

  it("clamps requests beyond the last page to the final available page", () => {
    const records = Array.from({ length: 30 }, (_, id) => ({ id }));
    expect(paginatePublicResults(records, 99).pagination).toMatchObject({
      page: 2,
      total: 30,
      pages: 2,
      offset: 24,
    });
  });
});
