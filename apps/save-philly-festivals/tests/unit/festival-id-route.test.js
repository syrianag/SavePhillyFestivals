import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApprovedFestivalById: vi.fn() }));

vi.mock("@/features/festivals/festival-queries", () => ({
  getApprovedFestivalById: mocks.getApprovedFestivalById,
}));
vi.mock("@/lib/db", () => ({ prisma: { festival: {} } }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET } from "@/app/api/festivals/[id]/route";

beforeEach(() => vi.clearAllMocks());

describe("legacy festival ID GET", () => {
  it("returns only the approved public presenter DTO", async () => {
    const publicFestival = {
      id: "approved-id",
      name: "Approved Festival",
      slug: "approved-festival",
      description: "Public description",
      schedules: [],
      socialLinks: [],
    };
    mocks.getApprovedFestivalById.mockResolvedValue(publicFestival);
    const response = await GET(new Request("https://festivals.example/api/festivals/approved-id"), {
      params: Promise.resolve({ id: "approved-id" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(publicFestival);
    expect(mocks.getApprovedFestivalById).toHaveBeenCalledWith("approved-id");
    const serialized = JSON.stringify(publicFestival);
    for (const forbidden of ["contact_email", "contact_phone", "contact_name", "owner_user_id", "submitted_by", "submission_key", "workflow_state", "revision"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it.each(["draft-id", "pending-id"])("returns 404 for private %s", async (id) => {
    mocks.getApprovedFestivalById.mockResolvedValue(null);
    const response = await GET(new Request(`https://festivals.example/api/festivals/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});
