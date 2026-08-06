import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  festival: { findMany: vi.fn(), count: vi.fn() },
  category: { findMany: vi.fn(async () => []) },
}));
vi.mock("@/lib/db", () => ({ prisma }));

const { discoverApprovedFestivals } = await import("@/features/festivals/public-discovery");
const { parseDiscoveryParams } = await import("@/features/festivals/discovery");

function festivalRow(index) {
  return {
    id: `festival-${index}`,
    slug: `festival-${index}`,
    name: `Festival ${index}`,
    start_date: new Date("2026-09-01T12:00:00.000Z"),
    end_date: null,
    created_at: new Date("2026-07-01T12:00:00.000Z"),
    location: "Philadelphia",
    description: "A festival",
    image_url: null,
    categories: [],
  };
}

describe("public discovery pagination is bounded by PostgreSQL", () => {
  beforeEach(() => {
    delete process.env.DISCOVERY_E2E_FIXTURE;
    prisma.festival.findMany.mockReset();
    prisma.festival.count.mockReset();
    prisma.festival.count.mockResolvedValue(434);
    prisma.festival.findMany.mockResolvedValue([]);
  });

  it("requests only the requested page window instead of the whole catalog", async () => {
    prisma.festival.findMany.mockResolvedValueOnce(
      Array.from({ length: 24 }, (_, index) => festivalRow(index)),
    );

    const result = await discoverApprovedFestivals(parseDiscoveryParams({ page: "3" }));

    const pageQuery = prisma.festival.findMany.mock.calls[0][0];
    expect(pageQuery.take).toBe(24);
    expect(pageQuery.skip).toBe(48);
    expect(result.pagination).toMatchObject({ page: 3, pageSize: 24, total: 434, pages: 19 });
    expect(result.items).toHaveLength(24);
  });

  it("clamps an out-of-range page to the last page window", async () => {
    await discoverApprovedFestivals(parseDiscoveryParams({ page: "9999" }));

    const pageQuery = prisma.festival.findMany.mock.calls[0][0];
    expect(pageQuery.skip).toBe(18 * 24);
    expect(pageQuery.take).toBe(24);
  });

  it("bounds application-ranked relevance searches with a candidate limit", async () => {
    await discoverApprovedFestivals(parseDiscoveryParams({ q: "music", sort: "relevance" }));

    const pageQuery = prisma.festival.findMany.mock.calls[0][0];
    expect(pageQuery.take).toBe(500);
    expect(pageQuery.skip).toBeUndefined();
  });
});
