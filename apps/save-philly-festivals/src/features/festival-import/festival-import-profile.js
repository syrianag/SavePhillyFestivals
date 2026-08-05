import { createHash } from "node:crypto";

import { parseFestivalCsv } from "./festival-import-csv";
import { normalizeFestivalImportRecord, parseFestivalImportDate } from "./festival-import-normalization";

export const CONFIRMED_FESTIVAL_CSV_SHA256 = "9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757";

export class FestivalImportChecksumError extends Error {
  constructor(expected, actual) {
    super(`Festival CSV checksum mismatch: expected ${expected}, received ${actual}`);
    this.name = "FestivalImportChecksumError";
    this.code = "checksum_mismatch";
    this.expected = expected;
    this.actual = actual;
  }
}

export function festivalCsvChecksum(input) {
  if (!(input instanceof Uint8Array)) throw new TypeError("CSV input must be a Buffer or Uint8Array");
  return createHash("sha256").update(input).digest("hex");
}

export function assertFestivalCsvChecksum(input, expectedChecksum = CONFIRMED_FESTIVAL_CSV_SHA256) {
  if (!/^[a-f0-9]{64}$/u.test(expectedChecksum)) throw new TypeError("Expected checksum must be a lowercase SHA-256 hex digest");
  const actual = festivalCsvChecksum(input);
  if (actual !== expectedChecksum) throw new FestivalImportChecksumError(expectedChecksum, actual);
  return actual;
}

function countByCode(records, property) {
  const counts = {};
  for (const record of records) {
    for (const issue of record[property]) counts[issue.code] = (counts[issue.code] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicateProfile(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.duplicateCandidateHash) ?? [];
    group.push(record);
    groups.set(record.duplicateCandidateHash, group);
  }

  let candidatesBeyondFirst = 0;
  let exactDuplicatesBeyondFirst = 0;
  let conflictingCandidatesBeyondFirst = 0;
  const candidateGroups = [];
  for (const [duplicateCandidateHash, group] of groups) {
    if (group.length < 2) continue;
    candidatesBeyondFirst += group.length - 1;
    const firstHash = group[0].canonicalRowHash;
    const exact = group.slice(1).filter((record) => record.canonicalRowHash === firstHash).length;
    exactDuplicatesBeyondFirst += exact;
    conflictingCandidatesBeyondFirst += group.length - 1 - exact;
    candidateGroups.push(Object.freeze({
      duplicateCandidateHash,
      recordNumbers: Object.freeze(group.map((record) => record.recordNumber)),
      exactDuplicatesBeyondFirst: exact,
      conflictingCandidatesBeyondFirst: group.length - 1 - exact,
    }));
  }

  return Object.freeze({
    candidatesBeyondFirst,
    exactDuplicatesBeyondFirst,
    conflictingCandidatesBeyondFirst,
    groups: Object.freeze(candidateGroups),
  });
}

export function profileFestivalCsv(input, { categoryMap, expectedChecksum = null, csvLimits } = {}) {
  const checksum = expectedChecksum
    ? assertFestivalCsvChecksum(input, expectedChecksum)
    : festivalCsvChecksum(input);
  const parsed = parseFestivalCsv(input, csvLimits);
  const normalizedRecords = parsed.records.map((record) => normalizeFestivalImportRecord(record, { categoryMap }));
  const sourceRecords = parsed.records;

  const startValues = sourceRecords.map((record) => record.values["Start Date"].trim());
  const standardStartDates = startValues.filter((value) => parseFestivalImportDate(value) !== null).length;
  const blankStartDates = startValues.filter((value) => value === "").length;
  const nonstandardOrRecurringStartDates = startValues.length - standardStartDates - blankStartDates;
  const dispositions = normalizedRecords.reduce((counts, record) => {
    counts[record.disposition] += 1;
    return counts;
  }, { ready: 0, quarantined: 0 });

  const counts = Object.freeze({
    records: sourceRecords.length,
    blankFestivalNames: sourceRecords.filter((record) => !record.values["Festival Name"].trim()).length,
    standardStartDates,
    nonstandardOrRecurringStartDates,
    blankStartDates,
    blankLocations: sourceRecords.filter((record) => !record.values.Location.trim()).length,
    blankTypes: sourceRecords.filter((record) => !record.values.Type.trim()).length,
    blankWebsites: sourceRecords.filter((record) => !record.values.Website.trim()).length,
    blankContactEmails: sourceRecords.filter((record) => !record.values["Contact email"].trim()).length,
    structurallyOverWideRows: 0,
  });

  return Object.freeze({
    source: Object.freeze({
      checksum,
      checksumConfirmed: checksum === CONFIRMED_FESTIVAL_CSV_SHA256,
      byteCount: input.byteLength,
      headers: parsed.headers,
      records: sourceRecords.length,
    }),
    counts,
    dispositions: Object.freeze(dispositions),
    errorCounts: Object.freeze(countByCode(normalizedRecords, "errors")),
    warningCounts: Object.freeze(countByCode(normalizedRecords, "warnings")),
    duplicates: duplicateProfile(normalizedRecords),
    normalizedRecords: Object.freeze(normalizedRecords),
  });
}
