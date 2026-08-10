import { describe, expect, it, vi } from "vitest";

import {
  allDayTimedMirror,
  buildDateOverlapFilter,
  expandFestivalDayKeys,
  festivalDayKey,
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

  it("builds the equivalent Prisma overlap predicate for timed and all-day festivals", () => {
    const start = new Date("2026-06-10T04:00:00.000Z");
    const end = new Date("2026-06-12T04:00:00.000Z");
    const startDay = new Date("2026-06-10T00:00:00.000Z");
    const endDay = new Date("2026-06-12T00:00:00.000Z");
    expect(buildDateOverlapFilter({ start, end, startDay, endDay })).toEqual({
      OR: [
        {
          AND: [
            { start_date: { not: null } },
            { start_date: { lt: end } },
            { OR: [{ end_date: { gte: start } }, { end_date: null, start_date: { gte: start } }] },
          ],
        },
        {
          AND: [
            { start_date: null },
            { all_day_start: { not: null } },
            { all_day_start: { lt: endDay } },
            { OR: [{ all_day_end: { gte: startDay } }, { all_day_end: null, all_day_start: { gte: startDay } }] },
          ],
        },
      ],
    });
  });

  /* All-day columns are `@db.Date`, so they must be compared against a UTC date part. Passing
   * the zoned instant would shift the boundary by a day. */
  it("carries separate zoned and calendar-day bounds", () => {
    const range = getDiscoveryDateRange(parseDiscoveryParams({}), new Date("2026-08-10T12:00:00.000Z"));
    expect(range.start.toISOString()).toBe("2026-08-01T04:00:00.000Z");
    expect(range.startDay.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(range.end).toBeNull();
  });

  it("defaults to the current month forward and opts out with date=all", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    expect(getDiscoveryDateRange(parseDiscoveryParams({}), now).startDay.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(getDiscoveryDateRange(parseDiscoveryParams({ date: "all" }), now)).toEqual({
      start: null, end: null, startDay: null, endDay: null,
    });
    expect(buildDateOverlapFilter(getDiscoveryDateRange(parseDiscoveryParams({ date: "all" }), now))).toBeNull();
  });

  it("matches all-day festivals that carry no timed start", () => {
    const range = { start: new Date("2026-06-10T04:00:00.000Z"), end: new Date("2026-06-12T04:00:00.000Z") };
    expect(festivalOverlapsRange(
      { start_date: null, all_day_start: "2026-06-11T00:00:00.000Z", all_day_end: "2026-06-11T00:00:00.000Z" },
      range
    )).toBe(true);
    expect(festivalOverlapsRange({ start_date: null, all_day_start: null }, range)).toBe(false);
  });
});

/* The defect these cover: all-day dates round-trip as UTC midnight, so zoning them lands on the
 * previous evening in Philadelphia. That put every calendar dot one day away from the festival
 * it represented, making all-day festivals unreachable by clicking their own dot. */
describe("calendar day keys", () => {
  const allDay = {
    calendar_date_type: "all_day",
    start_date: null,
    all_day_start: new Date("2026-08-15T00:00:00.000Z"),
    all_day_end: new Date("2026-08-17T00:00:00.000Z"),
  };

  it("reads all-day dates as calendar days, not zoned instants", () => {
    expect(festivalDayKey(allDay)).toBe("2026-08-15");
  });

  it("zones timed dates into the festival's own time zone", () => {
    expect(festivalDayKey({
      calendar_date_type: "timed",
      start_date: new Date("2026-09-13T02:00:00.000Z"),
      time_zone: "America/New_York",
    })).toBe("2026-09-12");
  });

  it("expands a multi-day festival to every day it spans", () => {
    expect(expandFestivalDayKeys(allDay)).toEqual(["2026-08-15", "2026-08-16", "2026-08-17"]);
  });

  it("expands a single-day festival to exactly one key", () => {
    expect(expandFestivalDayKeys({ ...allDay, all_day_end: allDay.all_day_start })).toEqual(["2026-08-15"]);
  });

  it("returns no keys when a festival has no date at all", () => {
    expect(expandFestivalDayKeys({ calendar_date_type: "all_day", start_date: null, all_day_start: null })).toEqual([]);
  });
});

/* Guards the invariant the 20260810120000 backfill established: an all-day festival must carry
 * a timed mirror, or it drops out of every date filter and renders as "Dates TBD". */
describe("all-day timed mirror", () => {
  it("mirrors midnight in Philadelphia for both ends of the range", () => {
    expect(allDayTimedMirror(new Date("2026-08-15T00:00:00.000Z"), new Date("2026-08-17T00:00:00.000Z"))).toEqual({
      start_date: new Date("2026-08-15T04:00:00.000Z"),
      end_date: new Date("2026-08-17T04:00:00.000Z"),
    });
  });

  it("collapses a missing end onto the start", () => {
    expect(allDayTimedMirror(new Date("2025-12-06T00:00:00.000Z"), null)).toEqual({
      start_date: new Date("2025-12-06T05:00:00.000Z"),
      end_date: new Date("2025-12-06T05:00:00.000Z"),
    });
  });
});

describe("approved discovery predicates", () => {
  it("always pins public collection queries to published", () => {
    const where = buildApprovedDiscoveryWhere(parseDiscoveryParams({ q: "food", location: "South" }));
    expect(where.workflow_state).toBe("published");
    /* search + location + the default current-month-forward date bound */
    expect(where.AND).toHaveLength(3);
  });

  it("drops the date bound only when the caller opts into past festivals", () => {
    const upcoming = buildApprovedDiscoveryWhere(parseDiscoveryParams({ q: "food" }));
    expect(upcoming.AND).toHaveLength(2);
    const all = buildApprovedDiscoveryWhere(parseDiscoveryParams({ q: "food", date: "all" }));
    expect(all.AND).toHaveLength(1);
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
  it("uses approved-only predicates and a public field allowlist", async () => {
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

    const result = await discoverApprovedFestivals(parseDiscoveryParams({ date: "all" }));

    expect(prismaMock.festival.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { workflow_state: "published" },
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
