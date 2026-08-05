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

  it("confirms and reproduces the attached source profile", async () => {
    const source = await readFile(new URL("../../../../docs/Festivals_Postgres_Export.csv", import.meta.url));
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
    expect(profile.errorCounts).toEqual({
      blank_start_date: 8,
      invalid_start_date: 18,
      unmapped_category: 156,
    });
    const classified = classifyFestivalImportRecords(profile.normalizedRecords);
    expect(classified.reduce((counts, record) => ({ ...counts, [record.disposition]: counts[record.disposition] + 1 }), {
      ready: 0, duplicate: 0, quarantined: 0,
    })).toEqual({ ready: 102, duplicate: 0, quarantined: 332 });
  });

  it("fails closed on a checksum mismatch", async () => {
    const source = await fixture("profile-small.csv");
    expect(() => assertFestivalCsvChecksum(source)).toThrowError(FestivalImportChecksumError);
    expect(() => profileFestivalCsv(source, { categoryMap, expectedChecksum: CONFIRMED_FESTIVAL_CSV_SHA256 })).toThrowError(expect.objectContaining({ code: "checksum_mismatch" }));
  });
});
