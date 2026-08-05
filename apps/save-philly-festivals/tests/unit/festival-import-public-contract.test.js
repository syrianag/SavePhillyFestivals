import { describe, expect, it } from "vitest";

import * as festivalImport from "@/features/festival-import";

const requiredExports = [
  "CONFIRMED_FESTIVAL_CSV_SHA256",
  "createFestivalImportRepository",
  "createFestivalImportService",
  "createFestivalImportReport",
  "formatFestivalImportReport",
  "festivalCategoryMapChecksum",
  "festivalCsvChecksum",
  "parseFestivalCsv",
  "profileFestivalCsv",
];

describe("festival import public contract", () => {
  it("exports the complete parser, service, repository, and report surface", () => {
    for (const name of requiredExports) expect(festivalImport[name], name).toBeDefined();
  });

  it("does not expose private-contact helper names or external side-effect integrations", () => {
    const names = Object.keys(festivalImport);
    expect(names.some((name) => /notify|consent|schedule|asset|integration|external/iu.test(name))).toBe(false);
    expect(names.some((name) => /rawContact|contactEmail|contactPhone/iu.test(name))).toBe(false);
  });
});
