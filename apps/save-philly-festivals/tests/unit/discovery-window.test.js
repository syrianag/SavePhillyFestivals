import { describe, expect, it } from "vitest";

import {
  DEFAULT_DISCOVERY_MONTHS,
  getDiscoveryDateRange,
  hasActiveDiscoveryFilters,
  parseDiscoveryParams,
} from "@/features/festivals/discovery";
import { getRecentlyEndedFestivals, RECENTLY_ENDED_WINDOW_DAYS } from "@/features/festivals/public-discovery";

/* Mid-month so a month-boundary bug cannot pass by coincidence. */
const NOW = new Date("2026-08-12T16:00:00Z");

describe("default discovery window", () => {
  it("covers the current month plus the next two, not everything forever", () => {
    const range = getDiscoveryDateRange(parseDiscoveryParams({}), NOW);

    expect(DEFAULT_DISCOVERY_MONTHS).toBe(3);
    /* Starts at the first of the current month, so a festival running right now is not dropped
     * halfway through its own run. */
    expect(range.startDay.toISOString().slice(0, 10)).toBe("2026-08-01");
    /* Exclusive upper bound three months on: August, September, October. */
    expect(range.endDay.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  /* The escape hatch has to keep working, or past festivals become unreachable from discovery. */
  it("leaves date=all unbounded in both directions", () => {
    const range = getDiscoveryDateRange(parseDiscoveryParams({ date: "all" }), NOW);
    expect(range.startDay).toBeNull();
    expect(range.endDay).toBeNull();
  });

  it("does not disturb the narrower presets", () => {
    const thisMonth = getDiscoveryDateRange(parseDiscoveryParams({ date: "this-month" }), NOW);
    expect(thisMonth.startDay.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(thisMonth.endDay.toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("still honours an explicit custom range beyond the default window", () => {
    const range = getDiscoveryDateRange(parseDiscoveryParams({ start: "2027-03-01", end: "2027-03-31" }), NOW);
    expect(range.startDay.toISOString().slice(0, 10)).toBe("2027-03-01");
  });
});

describe("hasActiveDiscoveryFilters", () => {
  /* Drives whether the homepage featured row renders. It must be true for every narrowing
   * input, not just `q` — a category filter produces the same "results ignored my input"
   * contradiction that made search look disconnected. */
  it("is false only when nothing is narrowed", () => {
    expect(hasActiveDiscoveryFilters(parseDiscoveryParams({}))).toBe(false);
  });

  it.each([
    ["q", { q: "caribbean" }],
    ["category", { category: "Music" }],
    ["location", { location: "Fishtown" }],
    ["date preset", { date: "this-month" }],
    ["start date", { start: "2026-09-01" }],
    ["end date", { end: "2026-09-30" }],
  ])("is true when %s is set", (_label, input) => {
    expect(hasActiveDiscoveryFilters(parseDiscoveryParams(input))).toBe(true);
  });

  /* Paging and sorting are not narrowing — suppressing the featured row on page 2 would make
   * it flicker in and out as the visitor pages through. */
  it("ignores paging and sorting", () => {
    expect(hasActiveDiscoveryFilters(parseDiscoveryParams({ page: "3", sort: "name" }))).toBe(false);
  });
});

describe("getRecentlyEndedFestivals", () => {
  const withFixture = async (fn) => {
    process.env.DISCOVERY_E2E_FIXTURE = "1";
    try { return await fn(); } finally { delete process.env.DISCOVERY_E2E_FIXTURE; }
  };

  it("defaults to a 90 day look-back", () => {
    expect(RECENTLY_ENDED_WINDOW_DAYS).toBe(90);
  });

  it("returns only festivals that have already ended, most recent first", async () => {
    const items = await withFixture(() => getRecentlyEndedFestivals({ now: NOW }));
    for (const festival of items) {
      const ended = new Date(festival.end_date ?? festival.start_date);
      expect(ended.getTime()).toBeLessThan(NOW.getTime());
      expect(ended.getTime()).toBeGreaterThanOrEqual(NOW.getTime() - RECENTLY_ENDED_WINDOW_DAYS * 86_400_000);
    }
    const ends = items.map((f) => new Date(f.end_date ?? f.start_date).getTime());
    expect([...ends].sort((a, b) => b - a)).toEqual(ends);
  });

  /* A zero-day window must return nothing rather than silently falling back to "everything". */
  it("excludes everything when the window is zero days", async () => {
    const items = await withFixture(() => getRecentlyEndedFestivals({ days: 0, now: NOW }));
    expect(items).toEqual([]);
  });
});
