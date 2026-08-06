export const DISCOVERY_TIME_ZONE = "America/New_York";
export const DISCOVERY_PAGE_SIZE = 24;
export const DISCOVERY_MAX_PAGE_SIZE = 48;

const DATE_PRESETS = new Set(["this-week", "this-month", "next-month", "custom"]);
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

function datePartsInTimeZone(date, timeZone = DISCOVERY_TIME_ZONE) {
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

export function getDiscoveryDateRange(filters, now = new Date()) {
  if (filters.date === "custom" || filters.start || filters.end) {
    const startParts = filters.start ? parseCalendarDate(filters.start) : null;
    const endParts = filters.end ? addCalendarDays(parseCalendarDate(filters.end), 1) : null;
    return {
      start: startParts ? zonedStartOfDay(startParts.year, startParts.month, startParts.day) : null,
      end: endParts ? zonedStartOfDay(endParts.year, endParts.month, endParts.day) : null,
    };
  }

  const today = datePartsInTimeZone(now);
  if (filters.date === "this-week") {
    return {
      start: zonedStartOfDay(today.year, today.month, today.day),
      end: (() => {
        const end = addCalendarDays(today, 7);
        return zonedStartOfDay(end.year, end.month, end.day);
      })(),
    };
  }

  if (filters.date === "this-month") {
    const nextMonth = new Date(Date.UTC(today.year, today.month, 1));
    return {
      start: zonedStartOfDay(today.year, today.month, 1),
      end: zonedStartOfDay(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1),
    };
  }

  if (filters.date === "next-month") {
    const start = new Date(Date.UTC(today.year, today.month, 1));
    const end = new Date(Date.UTC(today.year, today.month + 1, 1));
    return {
      start: zonedStartOfDay(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
      end: zonedStartOfDay(end.getUTCFullYear(), end.getUTCMonth() + 1, 1),
    };
  }

  return { start: null, end: null };
}

export function buildDateOverlapFilter(range) {
  if (!range.start && !range.end) return null;
  const clauses = [{ start_date: { not: null } }];
  if (range.end) clauses.push({ start_date: { lt: range.end } });
  if (range.start) {
    clauses.push({
      OR: [
        { end_date: { gte: range.start } },
        { end_date: null, start_date: { gte: range.start } },
      ],
    });
  }
  return { AND: clauses };
}

export function festivalOverlapsRange(festival, range) {
  if (!festival.start_date) return false;
  const start = new Date(festival.start_date);
  const end = festival.end_date ? new Date(festival.end_date) : start;
  return (!range.end || start < range.end) && (!range.start || end >= range.start);
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
