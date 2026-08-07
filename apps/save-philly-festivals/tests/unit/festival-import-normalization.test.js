import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import {
  mapFestivalCategory,
  normalizeFestivalImportRecord,
  parseFestivalImportDate,
} from "@/features/festival-import/festival-import-normalization";

let categoryMap;
beforeAll(async () => {
  categoryMap = JSON.parse(await readFile(new URL("../../../../tools/data/festival-category-map.json", import.meta.url), "utf8"));
});

function record(overrides = {}) {
  return {
    recordNumber: 2,
    startLine: 2,
    values: {
      "Festival Name": "Philadelphia Music Fest",
      "Start Date": "2/28/2028",
      "End Date": "",
      "2027 Dates (if applicable)": "",
      Location: " Philadelphia ",
      Type: "Music",
      Website: "https://EXAMPLE.com/fest",
      "Organiser/Contact": "Jane Doe",
      "Contact email": "JANE@EXAMPLE.COM",
      "Contact Phone": "215-555-0100 ext. 2",
      "Email sent?": "FALSE",
      ...overrides,
    },
  };
}

describe("festival import normalization", () => {
  it("accepts only exact possible M/D/YYYY dates, including Gregorian leap years", () => {
    expect(parseFestivalImportDate("2/29/2028")).toBe("2028-02-29");
    expect(parseFestivalImportDate("2/29/2027")).toBeNull();
    expect(parseFestivalImportDate("2/29/2100")).toBeNull();
    expect(parseFestivalImportDate("2/29/2000")).toBe("2000-02-29");
    expect(parseFestivalImportDate("02/03/26")).toBeNull();
    expect(parseFestivalImportDate("2026-02-03")).toBeNull();
    expect(parseFestivalImportDate("6/37/2026")).toBeNull();
  });

  it("produces an inclusive all-day interval and defaults a blank end to start", () => {
    const normalized = normalizeFestivalImportRecord(record(), { categoryMap });

    expect(normalized.disposition).toBe("ready");
    expect(normalized.applyPayload).toMatchObject({
      calendar_date_type: "all_day",
      time_zone: "America/New_York",
      all_day_start: "2028-02-28",
      all_day_end: "2028-02-28",
      category_slug: "music",
      website_url: "https://example.com/fest",
      contact_email: "jane@example.com",
    });
    expect(normalizeFestivalImportRecord(record({ "End Date": "2/29/2028" }), { categoryMap }).applyPayload.all_day_end).toBe("2028-02-29");
  });

  it("quarantines blank, recurring, impossible, and reversed primary dates", () => {
    for (const values of [
      { "Start Date": "" },
      { "Start Date": "Every Thursday" },
      { "Start Date": "2/30/2028" },
      { "Start Date": "3/2/2028", "End Date": "3/1/2028" },
    ]) {
      expect(normalizeFestivalImportRecord(record(values), { categoryMap }).disposition).toBe("quarantined");
    }
  });

  it("warns and nulls unsafe URLs and ambiguous email while retaining private contact only in memory", () => {
    const normalized = normalizeFestivalImportRecord(record({
      Website: "https://user:secret@example.com/private",
      "Contact email": "one@example.com, two@example.com",
    }), { categoryMap });

    expect(normalized.applyPayload.website_url).toBeNull();
    expect(normalized.applyPayload.contact_email).toBeNull();
    expect(normalized.warnings.map(({ code }) => code)).toEqual(expect.arrayContaining(["invalid_url", "invalid_or_multiple_email"]));
    expect(normalized.applyPayload.contact_name).toBe("Jane Doe");
    expect(normalized.applyPayload.contact_phone).toBe("215-555-0100 ext. 2");
    expect(normalized.redactedPayload).not.toHaveProperty("contact_name");
    expect(normalized.redactedPayload).not.toHaveProperty("contact_email");
    expect(normalized.redactedPayload).not.toHaveProperty("contact_phone");
  });

  it("collapses normalized quoted line breaks while rejecting unsafe controls", () => {
    const multiline = normalizeFestivalImportRecord(record({ Location: "First Hall\r\nSecond Floor\nRoom 3" }), { categoryMap });
    expect(multiline.disposition).toBe("ready");
    expect(multiline.applyPayload.location).toBe("First Hall Second Floor Room 3");
    expect(multiline.errors).not.toContainEqual(expect.objectContaining({ code: "control_character" }));
  });

  it("rejects controls and over-limit text", () => {
    const controlled = normalizeFestivalImportRecord(record({ Location: "unsafe\u0000place" }), { categoryMap });
    const overlong = normalizeFestivalImportRecord(record({ "Festival Name": "x".repeat(201) }), { categoryMap });
    expect(controlled.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "control_character", field: "location" })]));
    expect(overlong.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "text_too_long", field: "name" })]));
  });

  it("maps only reviewed aliases to the seeded category slugs", () => {
    // Pins the reviewed taxonomy. Every slug here must also exist as a Category row, or
    // the importer aborts an apply with category_not_found.
    expect(categoryMap.categories.map(({ slug }) => slug)).toEqual([
      "uncategorized", "music", "food", "art", "cultural", "community", "caribbean",
      "street-fair", "seasonal", "family",
    ]);
    expect(mapFestivalCategory("  FOOD & DRINK ", categoryMap)).toBe("food");
    expect(mapFestivalCategory("Caribbean", categoryMap)).toBe("caribbean");
    expect(mapFestivalCategory("Street Fairs", categoryMap)).toBe("street-fair");
    expect(mapFestivalCategory("food", categoryMap)).toBeNull();
    const unknown = normalizeFestivalImportRecord(record({ Type: "Rodeo" }), { categoryMap });
    expect(unknown.applyPayload.category_slug).toBeNull();
    expect(unknown.disposition).toBe("quarantined");
    expect(unknown.errors).toContainEqual(expect.objectContaining({ code: "unmapped_category" }));
  });

  it("absorbs a blank source type into the declared default category, still warning", () => {
    const blank = normalizeFestivalImportRecord(record({ Type: "" }), { categoryMap });
    expect(blank.applyPayload.category_slug).toBe("uncategorized");
    expect(blank.warnings).toContainEqual(expect.objectContaining({ code: "blank_category" }));
    expect(blank.disposition).toBe("ready");
  });

  it("leaves a blank type uncategorized when no default is declared", () => {
    const withoutDefault = { version: 1, categories: categoryMap.categories };
    const blank = normalizeFestivalImportRecord(record({ Type: "" }), { categoryMap: withoutDefault });
    expect(blank.applyPayload.category_slug).toBeNull();
    expect(blank.warnings).toContainEqual(expect.objectContaining({ code: "blank_category" }));
  });

  it("rejects a default category slug that is not a declared category", () => {
    const invalid = { version: 1, defaultCategorySlug: "not-a-category", categories: categoryMap.categories };
    expect(() => normalizeFestivalImportRecord(record(), { categoryMap: invalid })).toThrowError(TypeError);
  });

  it("creates deterministic identity hashes and collision-safe slugs", () => {
    const first = normalizeFestivalImportRecord(record(), { categoryMap });
    const replay = normalizeFestivalImportRecord(record(), { categoryMap });
    const conflict = normalizeFestivalImportRecord(record({ Location: "Elsewhere" }), { categoryMap });

    expect(replay.canonicalRowHash).toBe(first.canonicalRowHash);
    expect(replay.slug).toBe(first.slug);
    expect(first.slug).toMatch(/^philadelphia-music-fest-[a-f0-9]{8}$/u);
    expect(conflict.duplicateCandidateHash).toBe(first.duplicateCandidateHash);
    expect(conflict.canonicalRowHash).not.toBe(first.canonicalRowHash);
    expect(conflict.slug).not.toBe(first.slug);
  });
});
