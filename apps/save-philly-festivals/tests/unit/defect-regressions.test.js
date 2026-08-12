import { describe, expect, it, vi } from "vitest";

import { createSponsorSchema, updateSponsorSchema } from "@/features/sponsors/sponsor-schema";
import { handleRegister } from "@/features/producer-access/producer-access-http";

describe("sponsor update no longer resets status and order", () => {
  /**
   * `.default(x).optional()` still supplies `x` for an absent key, so while the defaults lived on
   * the shared field definitions an empty PATCH parsed as `{status:"draft", sort_order:0}`. That
   * silently unpublished an active sponsor and reset its position, and it made the
   * "at least one field" guard unreachable because the parsed object was never empty.
   */
  it("rejects an empty update instead of resetting the sponsor", () => {
    const parsed = updateSponsorSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("does not inject status or sort_order into a partial update", () => {
    const parsed = updateSponsorSchema.safeParse({ alt_text: "New alt text" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ alt_text: "New alt text" });
    expect(parsed.data).not.toHaveProperty("status");
    expect(parsed.data).not.toHaveProperty("sort_order");
  });

  /* Creation must still get its defaults — that half was correct and has to stay. */
  it("still defaults a new sponsor to draft at position zero", () => {
    const parsed = createSponsorSchema.safeParse({
      name: "Rowhouse Print Co.", slot: "footer", pill_color: "#1E7BF6",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data.status).toBe("draft");
    expect(parsed.data.sort_order).toBe(0);
  });
});

describe("registration does not reveal whether an email is known", () => {
  function request(body) {
    return new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin" },
      body: JSON.stringify(body),
    });
  }
  const credentials = { name: "Ama Bright", email: "ama@example.com", password: "a-sufficiently-long-password" };

  /**
   * `registerAccount` is deliberately duplicate-tolerant so the endpoint cannot be used to probe
   * which addresses hold accounts on a site that also hosts the admin portal. The HTTP layer used
   * to return its `created` flag verbatim, handing back exactly that oracle.
   */
  it("returns an identical body for a new and an existing address", async () => {
    const fresh = await handleRegister(request(credentials), {
      repository: { findUserByEmail: vi.fn().mockResolvedValue(null), createPublicAccount: vi.fn().mockResolvedValue({}) },
    });
    const existing = await handleRegister(request(credentials), {
      repository: { findUserByEmail: vi.fn().mockResolvedValue({ id: "u1" }), createPublicAccount: vi.fn() },
    });

    expect(fresh.status).toBe(existing.status);
    expect(await fresh.json()).toEqual(await existing.json());
  });

  it("never exposes the created flag", async () => {
    const response = await handleRegister(request(credentials), {
      repository: { findUserByEmail: vi.fn().mockResolvedValue(null), createPublicAccount: vi.fn().mockResolvedValue({}) },
    });
    expect(await response.json()).not.toHaveProperty("created");
  });
});
