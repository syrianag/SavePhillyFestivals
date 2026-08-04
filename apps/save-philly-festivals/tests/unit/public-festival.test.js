import { afterEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { festival: { findFirst } },
}));

import {
  getApprovedFestivalById,
  getPublicFestivalBySlug,
} from "@/features/festivals/festival-queries";
import {
  formatPhiladelphiaDateTime,
  getOfficialSocialLinks,
  mapPublicFestival,
  PUBLIC_FESTIVAL_SELECT,
  validateOfficialSocialUrl,
  validatePublicImageUrl,
} from "@/features/festivals/public-festival";

const rawFestival = (overrides = {}) => ({
  id: "festival-1",
  name: "Public Festival",
  slug: "public-festival",
  description: "Public description",
  location: "City Hall",
  city: "Philadelphia",
  state: "PA",
  zip_code: "19107",
  website_url: "https://example.com/festival",
  image_url: null,
  logo_url: null,
  social_instagram: null,
  social_facebook: null,
  social_twitter: null,
  social_tiktok: null,
  social_youtube: null,
  story: null,
  mission: null,
  history: null,
  start_date: new Date("2026-07-04T16:00:00.000Z"),
  end_date: null,
  schedules: [],
  categories: [],
  tags: [],
  ...overrides,
});

afterEach(() => {
  delete process.env.DISCOVERY_E2E_FIXTURE;
  findFirst.mockReset();
});

describe("public festival field contract", () => {
  it("uses an explicit allowlist that excludes private and integration fields", () => {
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("submitted_by");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("rejection_reason");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("contact_email");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("contact_phone");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("files");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("created_at");
    expect(PUBLIC_FESTIVAL_SELECT).not.toHaveProperty("updated_at");

    const dto = mapPublicFestival(
      rawFestival({
        submitted_by: "private@example.com",
        rejection_reason: "private",
        contact_email: "private@example.com",
        contact_phone: "215-555-0100",
        integration_id: "external-123",
      })
    );
    expect(dto).not.toHaveProperty("submitted_by");
    expect(dto).not.toHaveProperty("rejection_reason");
    expect(dto).not.toHaveProperty("contact_email");
    expect(dto).not.toHaveProperty("contact_phone");
    expect(dto).not.toHaveProperty("integration_id");
    expect(dto.addressLabel).toBe("Philadelphia, PA 19107");
  });
});

describe("public image URL validation", () => {
  it("allows site-relative and web images while rejecting executable or credentialed URLs", () => {
    expect(validatePublicImageUrl("/uploads/festival.jpg")).toBe("/uploads/festival.jpg");
    expect(validatePublicImageUrl("https://cdn.example.com/festival.jpg")).toBe(
      "https://cdn.example.com/festival.jpg"
    );
    expect(validatePublicImageUrl("javascript:alert(1)")).toBeNull();
    expect(validatePublicImageUrl("https://user:secret@example.com/festival.jpg")).toBeNull();
    expect(validatePublicImageUrl("//example.com/festival.jpg")).toBeNull();
  });
});

describe("official social URL validation", () => {
  it("allows only secure URLs on the requested official network", () => {
    expect(validateOfficialSocialUrl("https://www.instagram.com/phillyfest/", ["instagram.com"]))
      .toBe("https://www.instagram.com/phillyfest/");
    expect(validateOfficialSocialUrl("https://x.com/phillyfest", ["x.com", "twitter.com"]))
      .toBe("https://x.com/phillyfest");
    expect(validateOfficialSocialUrl("http://instagram.com/phillyfest", ["instagram.com"]))
      .toBeNull();
    expect(validateOfficialSocialUrl("https://instagram.com.evil.test/phillyfest", ["instagram.com"]))
      .toBeNull();
    expect(validateOfficialSocialUrl("not a url", ["instagram.com"])).toBeNull();
  });

  it("drops malformed and unsupported values from labeled social links", () => {
    expect(
      getOfficialSocialLinks({
        social_instagram: "https://instagram.com/phillyfest",
        social_facebook: "javascript:alert(1)",
        social_twitter: "https://example.com/phillyfest",
        social_tiktok: "https://www.tiktok.com/@phillyfest",
        social_youtube: "https://youtu.be/example",
      })
    ).toEqual([
      { label: "Instagram", url: "https://instagram.com/phillyfest" },
      { label: "TikTok", url: "https://www.tiktok.com/@phillyfest" },
      { label: "YouTube", url: "https://youtu.be/example" },
    ]);
  });
});

describe("Philadelphia-aware formatting", () => {
  it("uses Eastern daylight and standard time across DST", () => {
    expect(formatPhiladelphiaDateTime("2026-07-04T16:00:00.000Z")).toBe(
      "Saturday, July 4, 2026 at 12:00 PM EDT"
    );
    expect(formatPhiladelphiaDateTime("2026-01-10T16:00:00.000Z")).toBe(
      "Saturday, January 10, 2026 at 11:00 AM EST"
    );
    expect(formatPhiladelphiaDateTime("invalid")).toBeNull();
  });
});

describe("public festival fallback mapping", () => {
  it("provides safe display values, validates the website, and sorts program items", () => {
    const dto = mapPublicFestival(
      rawFestival({
        description: " ",
        location: null,
        city: null,
        state: null,
        zip_code: null,
        website_url: "javascript:alert(1)",
        image_url: "javascript:alert(1)",
        logo_url: "data:image/svg+xml,unsafe",
        start_date: null,
        schedules: [
          { id: "late", title: "Late", start_time: "2026-06-01T20:00:00Z" },
          { id: "early", title: "Early", start_time: "2026-06-01T14:00:00Z" },
        ],
      })
    );

    expect(dto).toMatchObject({
      description: "Festival details are coming soon.",
      image_url: null,
      website_url: null,
      dateLabel: "Dates and times to be announced",
      locationLabel: "Location to be announced",
      addressLabel: "Address details to be announced",
    });
    expect(dto.schedules.map(({ id }) => id)).toEqual(["early", "late"]);
  });
});

describe("approved-only public Prisma lookup", () => {
  it("queries by slug and approved status with only the public select", async () => {
    findFirst.mockResolvedValue(rawFestival());

    const result = await getPublicFestivalBySlug("public-festival");

    expect(findFirst).toHaveBeenCalledWith({
      where: { slug: "public-festival", status: "approved" },
      select: PUBLIC_FESTIVAL_SELECT,
    });
    expect(result).toMatchObject({ name: "Public Festival", slug: "public-festival" });
  });

  it("uses the same approved public DTO contract for ID lookups", async () => {
    findFirst.mockResolvedValue(rawFestival());

    const result = await getApprovedFestivalById("festival-1");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "festival-1", status: "approved" },
      select: PUBLIC_FESTIVAL_SELECT,
    });
    expect(result).not.toHaveProperty("contact_email");
  });

  it("returns null when Prisma cannot find an approved festival", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getPublicFestivalBySlug("pending-festival")).resolves.toBeNull();
  });
});
