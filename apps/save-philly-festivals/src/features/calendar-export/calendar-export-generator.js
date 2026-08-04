import { createEvents } from "ics";

const UID_DOMAIN = "savephillyfestivals.com";
const PRODUCT_ID = "-//Philly Fests//Schedule Calendar//EN";
const CALENDAR_STATUSES = new Set(["confirmed", "tentative", "postponed", "canceled"]);
const DATE_TYPES = new Set(["timed", "all_day"]);
const STATUS_PROPERTIES = Object.freeze({
  confirmed: { status: "CONFIRMED", busyStatus: "BUSY" },
  tentative: { status: "TENTATIVE", busyStatus: "BUSY" },
  postponed: { status: "TENTATIVE", busyStatus: "BUSY" },
  canceled: { status: "CANCELLED", busyStatus: "FREE" },
});

export class CalendarGenerationError extends Error {
  constructor(message = "Calendar content could not be generated.", options) {
    super(message, options);
    this.name = "CalendarGenerationError";
  }
}

function fail() {
  throw new CalendarGenerationError("A selected calendar record is malformed.");
}

function requiredString(value) {
  if (typeof value !== "string" || !value.trim()) fail();
  return value;
}

function optionalString(value) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") fail();
  return value;
}

function validDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!value || Number.isNaN(date.getTime())) fail();
  return date;
}

function utcDateTime(value) {
  const date = validDate(value);
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

// `ics` has no input-type option for metadata fields and treats these arrays as
// local wall time before serializing them to UTC. Local components round-trip
// the original instant without changing the emitted value.
function metadataDateTime(value) {
  const date = validDate(value);
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

function exactUtcTimestamp(value) {
  return validDate(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function civilDate(value) {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
    if (match) {
      const parts = match.slice(1).map(Number);
      const check = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      if (
        check.getUTCFullYear() === parts[0] &&
        check.getUTCMonth() + 1 === parts[1] &&
        check.getUTCDate() === parts[2]
      ) return parts;
      fail();
    }
  }
  const date = validDate(value);
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

function nextCivilDay(parts) {
  const next = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()];
}

function compareCivil(a, b) {
  return Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2]);
}

function assertTimeZone(value) {
  requiredString(value);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
  } catch {
    fail();
  }
}

export function normalizedRecordToIcsEvent(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) fail();
  if (!DATE_TYPES.has(record.dateType) || !CALENDAR_STATUSES.has(record.calendarStatus)) fail();
  if (!Number.isInteger(record.sequence) || record.sequence < 0) fail();
  if (!/^(festival|event)$/.test(record.type)) fail();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(record.id || "")) fail();
  assertTimeZone(record.timeZone);

  const modified = validDate(record.updatedAt || record.publishedAt || record.createdAt);
  const timestamp = validDate(record.publishedAt || record.updatedAt || record.createdAt);
  const event = {
    uid: `${record.type}-${record.id}@${UID_DOMAIN}`,
    title: requiredString(record.title),
    description: optionalString(record.description),
    location: optionalString(record.location),
    url: requiredString(record.canonicalUrl),
    sequence: record.sequence,
    timestamp: metadataDateTime(timestamp),
    lastModified: metadataDateTime(modified),
    ...STATUS_PROPERTIES[record.calendarStatus],
  };

  try {
    const canonical = new URL(event.url);
    if (!/^https?:$/.test(canonical.protocol) || canonical.username || canonical.password) fail();
  } catch (error) {
    if (error instanceof CalendarGenerationError) throw error;
    fail();
  }

  if (record.dateType === "all_day") {
    const start = civilDate(record.allDayStart);
    const inclusiveEnd = civilDate(record.allDayEnd || record.allDayStart);
    if (compareCivil(inclusiveEnd, start) < 0) fail();
    return { ...event, start, end: nextCivilDay(inclusiveEnd) };
  }

  const startDate = validDate(record.start);
  const endDate = validDate(record.end);
  if (endDate.getTime() <= startDate.getTime()) fail();
  return {
    ...event,
    start: utcDateTime(startDate),
    end: utcDateTime(endDate),
    startInputType: "utc",
    startOutputType: "utc",
    endInputType: "utc",
    endOutputType: "utc",
  };
}

export function generateCalendarIcs(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new CalendarGenerationError("At least one normalized calendar record is required.");
  }

  let result;
  try {
    result = createEvents(records.map(normalizedRecordToIcsEvent), {
      productId: PRODUCT_ID,
      method: "PUBLISH",
      calName: "Philly Fests Schedule",
    });
  } catch (error) {
    if (error instanceof CalendarGenerationError) throw error;
    throw new CalendarGenerationError(undefined, { cause: error });
  }
  if (result.error || !result.value) {
    throw new CalendarGenerationError(undefined, { cause: result.error || undefined });
  }

  let timestampIndex = 0;
  let modifiedIndex = 0;
  const withExactMetadata = result.value
    .replace(/DTSTAMP:[^\r\n]*/g, () => {
      const record = records[timestampIndex++];
      return `DTSTAMP:${exactUtcTimestamp(record.publishedAt || record.updatedAt || record.createdAt)}`;
    })
    .replace(/LAST-MODIFIED:[^\r\n]*/g, () => {
      const record = records[modifiedIndex++];
      return `LAST-MODIFIED:${exactUtcTimestamp(record.updatedAt || record.publishedAt || record.createdAt)}`;
    });
  return withExactMetadata.replace(/(?<!\r)\n/g, "\r\n");
}

export const generateICS = generateCalendarIcs;
