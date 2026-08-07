import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import { classifyFestivalImportRecords } from "@/features/festival-import/festival-import-service";
import {
  CONFIRMED_FESTIVAL_CSV_SHA256,
  FestivalImportChecksumError,
  assertFestivalCsvChecksum,
  profileFestivalCsv,
} from "@/features/festival-import/festival-import-profile";

let categoryMap;
beforeAll(async () => {
  categoryMap = JSON.parse(await readFile(new URL("../../../../tools/data/festival-category-map.json", import.meta.url), "utf8"));
});

const fixture = (name) => readFile(new URL(`../fixtures/festival-import/${name}`, import.meta.url));

describe("festival CSV profile", () => {
  it("profiles exact duplicates separately from conflicting same-name/date candidates", async () => {
    const profile = profileFestivalCsv(await fixture("profile-small.csv"), { categoryMap });

    expect(profile.counts.records).toBe(4);
    expect(profile.duplicates).toMatchObject({
      candidatesBeyondFirst: 2,
      exactDuplicatesBeyondFirst: 1,
      conflictingCandidatesBeyondFirst: 1,
    });
    expect(profile.dispositions).toEqual({ ready: 3, quarantined: 1 });
    expect(profile.errorCounts).toMatchObject({ invalid_start_date: 1, unmapped_category: 1 });
  });

  /* The reviewed source contains organizer contact details, so it is not tracked in Git.
   * When an operator supplies the restricted copy this reproduces the confirmed profile;
   * otherwise it skips instead of coupling the suite to private data. */
  const restrictedSource = process.env.FESTIVAL_IMPORT_SOURCE_FILE
    ? new URL(process.env.FESTIVAL_IMPORT_SOURCE_FILE, "file://")
    : new URL("../../../../docs/Festivals_Postgres_Export.csv", import.meta.url);
  const hasRestrictedSource = existsSync(restrictedSource);

  it.skipIf(!hasRestrictedSource)("confirms and reproduces the attached source profile", async () => {
    const source = await readFile(restrictedSource);
    const profile = profileFestivalCsv(source, {
      categoryMap,
      expectedChecksum: CONFIRMED_FESTIVAL_CSV_SHA256,
    });

    expect(profile.source).toMatchObject({
      checksum: "9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757",
      checksumConfirmed: true,
      byteCount: 78223,
      records: 434,
    });
    expect(profile.counts).toEqual({
      records: 434,
      blankFestivalNames: 0,
      standardStartDates: 408,
      nonstandardOrRecurringStartDates: 18,
      blankStartDates: 8,
      blankLocations: 111,
      blankTypes: 168,
      blankWebsites: 155,
      blankContactEmails: 167,
      structurallyOverWideRows: 0,
    });
    expect(profile.duplicates).toMatchObject({
      candidatesBeyondFirst: 2,
      exactDuplicatesBeyondFirst: 1,
      conflictingCandidatesBeyondFirst: 1,
    });
    expect(profile.normalizedRecords).toHaveLength(434);
    /* Only date defects remain. `unmapped_category` was 156 until the reviewed map gained
     * aliases for every Type value in this file; a regression there resurfaces that code. */
    expect(profile.errorCounts).toEqual({
      blank_start_date: 8,
      invalid_start_date: 18,
    });
    /* The 168 blank Types are absorbed by `defaultCategorySlug` rather than quarantined,
     * so this warning must stay at the blankTypes count above — it is the editorial
     * worklist of festivals still needing a real category. */
    expect(profile.warningCounts).toEqual({
      blank_category: 168,
      future_dates_require_review: 12,
      invalid_or_multiple_email: 54,
      invalid_url: 2,
    });
    const classified = classifyFestivalImportRecords(profile.normalizedRecords);
    /* 28 quarantined = 26 rows with a date error + both rows of the one conflicting
     * same-name/date pair; the single exact duplicate classifies as `duplicate`. */
    expect(classified.reduce((counts, record) => ({ ...counts, [record.disposition]: counts[record.disposition] + 1 }), {
      ready: 0, duplicate: 0, quarantined: 0,
    })).toEqual({ ready: 405, duplicate: 1, quarantined: 28 });
  });

  it("fails closed on a checksum mismatch", async () => {
    const source = await fixture("profile-small.csv");
    expect(() => assertFestivalCsvChecksum(source)).toThrowError(FestivalImportChecksumError);
    expect(() => profileFestivalCsv(source, { categoryMap, expectedChecksum: CONFIRMED_FESTIVAL_CSV_SHA256 })).toThrowError(expect.objectContaining({ code: "checksum_mismatch" }));
  });
});
