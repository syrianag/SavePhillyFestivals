const SITE_PROTOCOLS = new Set(["http:", "https:"]);

export class InvalidCalendarSiteOriginError extends Error {
  constructor() {
    super("Calendar export site origin is not configured correctly.");
    this.name = "InvalidCalendarSiteOriginError";
  }
}

export function validateCalendarSiteOrigin(value) {
  try {
    const url = new URL(value);
    if (!SITE_PROTOCOLS.has(url.protocol) || url.username || url.password) throw new Error();
    return url.origin;
  } catch {
    throw new InvalidCalendarSiteOriginError();
  }
}

export function festivalCanonicalUrl(siteOrigin, slug) {
  if (typeof slug !== "string" || !slug) {
    throw new TypeError("A server-owned festival slug is required.");
  }
  return new URL(`/festivals/${encodeURIComponent(slug)}`, `${siteOrigin}/`).toString();
}

function baseCalendarFields(record) {
  return {
    dateType: record.calendar_date_type,
    timeZone: record.time_zone,
    allDayStart: record.all_day_start,
    allDayEnd: record.all_day_end,
    calendarStatus: record.calendar_status,
    sequence: record.calendar_sequence,
    publishedAt: record.calendar_published_at,
    updatedAt: record.updated_at,
    createdAt: record.created_at,
  };
}

export function normalizeFestivalCalendarRecord(record, siteOrigin) {
  const occurrence = record.occurrences?.[0];
  const calendarRecord = occurrence ? {
    ...record,
    calendar_date_type: occurrence.calendar_date_type,
    time_zone: occurrence.time_zone,
    start_date: occurrence.start_at,
    end_date: occurrence.end_at,
    all_day_start: occurrence.all_day_start,
    all_day_end: occurrence.all_day_end,
    calendar_status: occurrence.calendar_status,
    calendar_sequence: occurrence.calendar_sequence,
    calendar_published_at: occurrence.calendar_published_at,
    created_at: occurrence.created_at,
    updated_at: occurrence.updated_at,
  } : record;
  return {
    type: "festival",
    id: record.id,
    title: record.name,
    description: record.description,
    location: record.location,
    start: calendarRecord.start_date,
    end: calendarRecord.end_date,
    canonicalUrl: festivalCanonicalUrl(siteOrigin, record.slug),
    ...baseCalendarFields(calendarRecord),
  };
}

export function normalizeEventCalendarRecord(record, siteOrigin) {
  const eventFields = baseCalendarFields(record);
  const eventUpdatedAt = new Date(record.updated_at).getTime();
  const parentUpdatedAt = new Date(record.festival.updated_at).getTime();
  const effectiveUpdatedAt = Number.isFinite(parentUpdatedAt) && parentUpdatedAt > eventUpdatedAt
    ? record.festival.updated_at
    : record.updated_at;

  return {
    type: "event",
    id: record.id,
    title: record.title,
    description: record.description,
    location: record.location || record.festival.location,
    start: record.start_time,
    end: record.end_time,
    canonicalUrl: festivalCanonicalUrl(siteOrigin, record.festival.slug),
    ...eventFields,
    calendarStatus: record.festival.calendar_status === "canceled"
      ? "canceled"
      : eventFields.calendarStatus,
    sequence: eventFields.sequence,
    publishedAt: eventFields.publishedAt || record.festival.calendar_published_at,
    updatedAt: effectiveUpdatedAt,
  };
}

export function mapCalendarSelections(items, { festivals = [], events = [] }, siteOrigin) {
  const festivalById = new Map(festivals.map((record) => [record.id, record]));
  const eventById = new Map(events.map((record) => [record.id, record]));
  const records = [];
  const omitted = [];

  for (const item of items) {
    const record = item.type === "festival"
      ? festivalById.get(item.id)
      : eventById.get(item.id);
    if (!record) {
      omitted.push(item);
      continue;
    }
    records.push(item.type === "festival"
      ? normalizeFestivalCalendarRecord(record, siteOrigin)
      : normalizeEventCalendarRecord(record, siteOrigin));
  }

  return { records, omitted, omittedCount: omitted.length };
}
