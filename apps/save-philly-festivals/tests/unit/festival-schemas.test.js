import { describe, expect, it } from "vitest";

import {
  approveFestivalSchema,
  createFestivalSchema,
  updateFestivalSchema,
} from "@/features/festivals/festival-schemas";

describe("createFestivalSchema", () => {
  it("requires a name and applies Philadelphia location defaults", () => {
    expect(createFestivalSchema.safeParse({}).success).toBe(false);

    const result = createFestivalSchema.parse({ name: "Neighborhood Arts Fest" });
    expect(result).toMatchObject({
      name: "Neighborhood Arts Fest",
      city: "Philadelphia",
      state: "PA",
    });
  });

  it("accepts blank optional contact and URL fields", () => {
    expect(
      createFestivalSchema.safeParse({
        name: "Food Fest",
        website_url: "",
        logo_url: "",
        image_url: "",
        contact_email: "",
        host_social: "",
      }).success
    ).toBe(true);
  });

  it("rejects malformed URLs, email addresses, dates, and overlong names", () => {
    const result = createFestivalSchema.safeParse({
      name: "x".repeat(201),
      website_url: "philly.example",
      contact_email: "organizer-at-example.com",
      start_date: "2026-07-04",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["name", "website_url", "contact_email", "start_date"])
    );
  });

  it("accepts ISO datetimes and absolute URLs", () => {
    expect(
      createFestivalSchema.safeParse({
        name: "Summer Fest",
        website_url: "https://example.com/festival",
        contact_email: "organizer@example.com",
        start_date: "2026-07-04T14:00:00.000Z",
        end_date: "2026-07-04T22:00:00.000Z",
      }).success
    ).toBe(true);
  });
});

describe("updateFestivalSchema", () => {
  it("allows partial updates while retaining field validation", () => {
    expect(updateFestivalSchema.safeParse({ description: "Updated details" }).success).toBe(true);
    expect(updateFestivalSchema.safeParse({ contact_email: "invalid" }).success).toBe(false);
  });
});

describe("approveFestivalSchema", () => {
  it("accepts approved or rejected statuses with an optional reason", () => {
    expect(approveFestivalSchema.parse({ status: "approved" })).toEqual({ status: "approved" });
    expect(
      approveFestivalSchema.parse({ status: "rejected", reason: "Dates are missing" })
    ).toEqual({ status: "rejected", reason: "Dates are missing" });
  });

  it("rejects statuses outside the approval workflow", () => {
    expect(approveFestivalSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});
