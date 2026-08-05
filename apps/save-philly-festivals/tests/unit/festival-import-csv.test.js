import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { FESTIVAL_IMPORT_HEADERS, FestivalImportCsvError, parseFestivalCsv } from "@/features/festival-import/festival-import-csv";

const fixture = (name) => readFile(new URL(`../fixtures/festival-import/${name}`, import.meta.url));

function csv(body, headers = "Festival Name,Start Date,End Date,2027 Dates (if applicable),Location,Type,Website,Organiser/Contact ,Contact email ,Contact Phone,Email sent?") {
  return Buffer.from(`${headers}\n${body}`, "utf8");
}

describe("festival import RFC4180 parser", () => {
  it("decodes fatal UTF-8, strips an initial BOM, safely trims source header spaces, and preserves record metadata", async () => {
    const parsed = parseFestivalCsv(await fixture("quoted.csv"));

    expect(parsed.headers).toEqual(FESTIVAL_IMPORT_HEADERS);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]).toMatchObject({ recordNumber: 2, startLine: 2 });
    expect(parsed.records[0].values["Festival Name"]).toBe('Arts, Food "and"\nMusic Fest');
    expect(parsed.records[0].values.Location).toBe("Philadelphia, PA");
    expect(parsed.records[0].values["Organiser/Contact"]).toBe("Jane Doe");
  });

  it("rejects invalid UTF-8 and malformed quoting", async () => {
    const unclosed = await fixture("malformed-unclosed.csv");
    expect(() => parseFestivalCsv(Buffer.from([0xff]))).toThrowError(expect.objectContaining({ code: "invalid_utf8" }));
    expect(() => parseFestivalCsv(unclosed)).toThrowError(expect.objectContaining({ code: "unclosed_quote", startLine: 2 }));
    expect(() => parseFestivalCsv(csv('bad"quote,1/1/2026,,,,,,,,,'))).toThrowError(expect.objectContaining({ code: "quote_in_unquoted_field" }));
    expect(() => parseFestivalCsv(csv('"closed"oops,1/1/2026,,,,,,,,,'))).toThrowError(expect.objectContaining({ code: "characters_after_quote" }));
  });

  it("requires the exact 11 headers and exact field width", () => {
    expect(() => parseFestivalCsv(csv("Fest,1/1/2026,,,,,,,,,"))).not.toThrow();
    expect(() => parseFestivalCsv(csv("Fest,1/1/2026,,,,,,,,,,extra"))).toThrowError(expect.objectContaining({ code: "wrong_field_count", recordNumber: 2 }));
    expect(() => parseFestivalCsv(csv("", "Festival Name,Start Date"))).toThrowError(expect.objectContaining({ code: "invalid_headers" }));
    expect(() => parseFestivalCsv(csv("", "Festival Name,Festival Name,End Date,2027 Dates (if applicable),Location,Type,Website,Organiser/Contact,Contact email,Contact Phone,Email sent?"))).toThrowError(expect.objectContaining({ code: "duplicate_header" }));
  });

  it("enforces byte, record, and field bounds", () => {
    const input = csv("Festival,1/1/2026,,,,,,,,,");
    expect(() => parseFestivalCsv(input, { maxBytes: input.byteLength - 1 })).toThrowError(expect.objectContaining({ code: "file_too_large" }));
    expect(() => parseFestivalCsv(input, { maxRecords: 1, maxFieldCharacters: 3 })).toThrowError(expect.objectContaining({ code: "field_too_large" }));
    expect(() => parseFestivalCsv(Buffer.concat([input, Buffer.from("\nSecond,1/2/2026,,,,,,,,,\n")]), { maxRecords: 1 })).toThrowError(expect.objectContaining({ code: "too_many_records" }));
  });

  it("exposes typed parser failures", () => {
    try {
      parseFestivalCsv(Buffer.alloc(0));
      throw new Error("expected parser failure");
    } catch (error) {
      expect(error).toBeInstanceOf(FestivalImportCsvError);
      expect(error.code).toBe("empty_file");
    }
  });
});
