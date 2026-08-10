export const DISCOVERY_TIME_ZONE = "America/New_York";
export const DISCOVERY_PAGE_SIZE = 24;
export const DISCOVERY_MAX_PAGE_SIZE = 48;

/* "all" opts out of the default current-month-forward bound so past festivals stay reachable
 * from discovery, not just from their detail page. */
const DATE_PRESETS = new Set(["this-week", "this-month", "next-month", "custom", "all"]);
const SORTS = new Set(["soonest", "relevance", "newest", "name"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value, maxLength = 100) {
  const stringValue = firstValue(value);
  return typeof stringValue === "string" ? stringValue.trim().slice(0, maxLength) : "";
}

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value
    : "";
}

export function parseDiscoveryParams(input = {}) {
  const q = clean(input.q || input.search, 120);
  const requestedDate = clean(input.date, 20);
  const date = DATE_PRESETS.has(requestedDate) ? requestedDate : "";
  let start = validDate(clean(input.start || input.from, 10));
  let end = validDate(clean(input.end || input.to, 10));

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  const requestedSort = clean(input.sort, 20);
  const sort = SORTS.has(requestedSort)
    ? requestedSort === "relevance" && !q
      ? "soonest"
      : requestedSort
    : q
      ? "relevance"
      : "soonest";
  const requestedPage = Number.parseInt(clean(input.page, 4), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  return {
    q,
    date,
    start,
    end,
    category: clean(input.category, 80),
    location: clean(input.location || input.neighborhood, 100),
    sort,
    page,
  };
}

export function datePartsInTimeZone(date, timeZone = DISCOVERY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
}

function timeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

export function zonedStartOfDay(year, month, day, timeZone = DISCOVERY_TIME_ZONE) {
  const localAsUtc = Date.UTC(year, month - 1, day);
  let instant = localAsUtc - timeZoneOffset(new Date(localAsUtc), timeZone);
  instant = localAsUtc - timeZoneOffset(new Date(instant), timeZone);
  return new Date(instant);
}

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function parseCalendarDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/* Calendar-day counterpart to zonedStartOfDay. `all_day_start`/`all_day_end` are `@db.Date`
 * columns, so Prisma compares them against a UTC date part — passing a zoned instant such as
 * 2026-08-01T04:00:00Z at a `date` column silently shifts the boundary by a day. Every range
 * therefore carries both forms: `start`/`end` for the timed columns, `startDay`/`endDay` for
 * the all-day ones. */
function utcDayBoundary(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function rangeFor(startParts, endParts) {
  return {
    start: startParts ? zonedStartOfDay(startParts.year, startParts.month, startParts.day) : null,
    end: endParts ? zonedStartOfDay(endParts.year, endParts.month, endParts.day) : null,
    startDay: startParts ? utcDayBoundary(startParts.year, startParts.month, startParts.day) : null,
    endDay: endParts ? utcDayBoundary(endParts.year, endParts.month, endParts.day) : null,
  };
}

export const EMPTY_DISCOVERY_RANGE = Object.freeze({ start: null, end: null, startDay: null, endDay: null });

/**
 * The query string that reproduces a filtered view, with optional overrides.
 *
 * Shared by discovery pagination and the map's tab links so switching between Featured, Map,
 * and Calendar preserves what the visitor was looking at. Defaults are omitted rather than
 * spelled out, which keeps a plain URL clean.
 */
export function discoveryQueryString(filters, overrides = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (!value) continue;
    if (key === "page" && Number(value) <= 1) continue;
    if (key === "sort" && value === (merged.q ? "relevance" : "soonest")) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export function getDiscoveryDateRange(filters, now = new Date()) {
  if (filters.date === "custom" || filters.start || filters.end) {
    return rangeFor(
      filters.start ? parseCalendarDate(filters.start) : null,
      filters.end ? addCalendarDays(parseCalendarDate(filters.end), 1) : null
    );
  }

  /* Explicit opt-out: the only way to see festivals that have already happened. */
  if (filters.date === "all") return EMPTY_DISCOVERY_RANGE;

  const today = datePartsInTimeZone(now);
  if (filters.date === "this-week") return rangeFor(today, addCalendarDays(today, 7));
  if (filters.date === "this-month") return rangeFor({ ...today, day: 1 }, monthStart(today, 1));
  if (filters.date === "next-month") return rangeFor(monthStart(today, 1), monthStart(today, 2));

  /* Default: current month forward, with no upper bound. Public views lead with what is still
   * ahead; past festivals remain reachable by direct link and via `date=all`. */
  return rangeFor({ ...today, day: 1 }, null);
}

function monthStart(parts, monthsAhead) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + monthsAhead, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: 1 };
}

/* Matches a festival stored either way: timed festivals carry `start_date`/`end_date`, all-day
 * ones carry `all_day_start`/`all_day_end`. The backfill migration mirrors all-day dates onto
 * the timed columns, so today the first branch alone would suffice — the second branch is the
 * guard against importer runs that land rows before the mirror is written. */
export function buildDateOverlapFilter(range) {
  if (!range.start && !range.end && !range.startDay && !range.endDay) return null;

  const timed = [{ start_date: { not: null } }];
  if (range.end) timed.push({ start_date: { lt: range.end } });
  if (range.start) {
    timed.push({
      OR: [
        { end_date: { gte: range.start } },
        { end_date: null, start_date: { gte: range.start } },
      ],
    });
  }

  const allDay = [{ start_date: null }, { all_day_start: { not: null } }];
  if (range.endDay) allDay.push({ all_day_start: { lt: range.endDay } });
  if (range.startDay) {
    allDay.push({
      OR: [
        { all_day_end: { gte: range.startDay } },
        { all_day_end: null, all_day_start: { gte: range.startDay } },
      ],
    });
  }

  return { OR: [{ AND: timed }, { AND: allDay }] };
}

export function festivalOverlapsRange(festival, range) {
  const rawStart = festival.start_date ?? festival.all_day_start;
  if (!rawStart) return false;
  const start = new Date(rawStart);
  const rawEnd = festival.start_date ? festival.end_date : festival.all_day_end;
  const end = rawEnd ? new Date(rawEnd) : start;
  return (!range.end || start < range.end) && (!range.start || end >= range.start);
}

/* All-day dates are `@db.Date`, which round-trips as UTC midnight — so its UTC parts ARE the
 * intended calendar day and must not be re-zoned. Timed dates are instants and do need zoning.
 * Mixing the two conventions is what put calendar dots one day off from the filter they drive. */
export function festivalDayKey(record) {
  const isAllDay = record?.calendar_date_type === "all_day"
    || (!record?.start_date && Boolean(record?.all_day_start));
  const value = isAllDay ? record?.all_day_start : record?.start_date;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = isAllDay
    ? { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
    : datePartsInTimeZone(date, record?.time_zone || DISCOVERY_TIME_ZONE);
  return toDayKey(parts);
}

function toDayKey({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MAX_EXPANDED_DAYS = 366;

/* Every calendar day a festival occupies, so a multi-day festival is reachable by clicking any
 * of its days rather than only its first. Capped so a corrupt end date cannot hang a render. */
export function expandFestivalDayKeys(record) {
  const startKey = festivalDayKey(record);
  if (!startKey) return [];
  const isAllDay = record?.calendar_date_type === "all_day"
    || (!record?.start_date && Boolean(record?.all_day_start));
  const endValue = isAllDay ? record?.all_day_end : record?.end_date;
  const endKey = endValue ? festivalDayKey({ ...record, start_date: isAllDay ? null : endValue, all_day_start: isAllDay ? endValue : null }) : null;
  if (!endKey || endKey <= startKey) return [startKey];

  const keys = [];
  let cursor = parseCalendarDate(startKey);
  for (let index = 0; index < MAX_EXPANDED_DAYS; index += 1) {
    const key = toDayKey(cursor);
    keys.push(key);
    if (key >= endKey) break;
    cursor = addCalendarDays(cursor, 1);
  }
  return keys;
}

/* The timed mirror of an all-day range, matching the backfill migration exactly: midnight in
 * America/New_York on the inclusive first and last day. Shared so the producer write path
 * cannot reintroduce the null `start_date` the migration just repaired. */
export function allDayTimedMirror(allDayStart, allDayEnd) {
  if (!allDayStart) return { start_date: null, end_date: null };
  const startDate = new Date(allDayStart);
  if (Number.isNaN(startDate.getTime())) return { start_date: null, end_date: null };
  const endSource = allDayEnd ? new Date(allDayEnd) : startDate;
  const end = Number.isNaN(endSource.getTime()) ? startDate : endSource;
  return {
    start_date: zonedStartOfDay(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate()),
    end_date: zonedStartOfDay(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
  };
}

function relevanceScore(festival, query) {
  const q = query.toLocaleLowerCase("en-US");
  const name = festival.name?.toLocaleLowerCase("en-US") || "";
  const categories = festival.categories?.map(({ category }) => category?.name || "").join(" ").toLocaleLowerCase("en-US") || "";
  const location = `${festival.location || ""} ${festival.city || ""}`.toLocaleLowerCase("en-US");
  const description = festival.description?.toLocaleLowerCase("en-US") || "";
  if (name === q) return 500;
  if (name.startsWith(q)) return 400;
  if (name.includes(q)) return 300;
  if (categories.includes(q)) return 200;
  if (location.includes(q)) return 100;
  if (description.includes(q)) return 50;
  return 0;
}

function compareDates(left, right, direction = 1) {
  const a = left ? new Date(left).getTime() : Number.POSITIVE_INFINITY;
  const b = right ? new Date(right).getTime() : Number.POSITIVE_INFINITY;
  return (a - b) * direction;
}

function stableFestivalCompare(a, b) {
  return (a.name || "").localeCompare(b.name || "", "en-US", { sensitivity: "base" }) || String(a.id).localeCompare(String(b.id));
}

export function sortFestivalRecords(records, filters) {
  return [...records].sort((a, b) => {
    if (filters.sort === "relevance" && filters.q) {
      const relevance = relevanceScore(b, filters.q) - relevanceScore(a, filters.q);
      if (relevance) return relevance;
      return compareDates(a.start_date, b.start_date) || stableFestivalCompare(a, b);
    }
    if (filters.sort === "newest") {
      const newest = compareDates(a.created_at, b.created_at, -1);
      return newest || stableFestivalCompare(a, b);
    }
    if (filters.sort === "name") return stableFestivalCompare(a, b);
    return compareDates(a.start_date, b.start_date) || stableFestivalCompare(a, b);
  });
}

/* Resolves the clamped page window before querying so callers can bound the database read
 * instead of loading every matching festival into memory. */
export function resolvePublicPageWindow(requestedPage = 1, total = 0) {
  const pages = Math.max(1, Math.ceil(total / DISCOVERY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const offset = (page - 1) * DISCOVERY_PAGE_SIZE;
  return { page, pages, offset, take: DISCOVERY_PAGE_SIZE, pageSize: DISCOVERY_PAGE_SIZE, total };
}

/* Wraps an already database-paginated page of records. */
export function publicPageResult(items, requestedPage, total) {
  const { page, pages, offset } = resolvePublicPageWindow(requestedPage, total);
  return { items, pagination: { page, pageSize: DISCOVERY_PAGE_SIZE, total, pages, offset } };
}

export function paginatePublicResults(records, requestedPage = 1, total = records.length) {
  const { page, pages, offset } = resolvePublicPageWindow(requestedPage, total);
  return {
    items: records.slice(offset, offset + DISCOVERY_PAGE_SIZE),
    pagination: { page, pageSize: DISCOVERY_PAGE_SIZE, total, pages, offset },
  };
}

export function formatFestivalDate(startDate, endDate) {
  if (!startDate) return "Dates TBD";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: DISCOVERY_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  return end && formatter.format(end) !== formatter.format(start)
    ? `${formatter.format(start)} – ${formatter.format(end)}`
    : formatter.format(start);
}
