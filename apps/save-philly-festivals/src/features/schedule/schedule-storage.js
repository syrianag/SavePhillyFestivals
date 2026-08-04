export const SCHEDULE_STORAGE_KEY = "savePhillySchedule";
export const SCHEDULE_STORAGE_VERSION = 1;

const VALID_TYPES = new Set(["festival", "event"]);

function isValidId(id) {
  return (typeof id === "string" && id.length > 0) ||
    (typeof id === "number" && Number.isFinite(id));
}

export function asScheduleItem(value, fallbackType = "festival") {
  if (isValidId(value)) return { type: fallbackType, id: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!VALID_TYPES.has(value.type) || !isValidId(value.id)) return null;
  return { type: value.type, id: value.id };
}

function itemKey(item) {
  return `${item.type}:${typeof item.id}:${String(item.id)}`;
}

export function containsScheduleItem(items, value, fallbackType = "festival") {
  const item = asScheduleItem(value, fallbackType);
  if (!item) return false;
  const key = itemKey(item);
  return items.some((candidate) => itemKey(candidate) === key);
}

export function addScheduleItem(items, value, fallbackType = "festival") {
  const item = asScheduleItem(value, fallbackType);
  if (!item || containsScheduleItem(items, item)) return items;
  return [...items, item];
}

export function removeScheduleItem(items, value, fallbackType = "festival") {
  const item = asScheduleItem(value, fallbackType);
  if (!item) return items;
  const key = itemKey(item);
  return items.filter((candidate) => itemKey(candidate) !== key);
}

export function toggleScheduleItem(items, value, fallbackType = "festival") {
  return containsScheduleItem(items, value, fallbackType)
    ? removeScheduleItem(items, value, fallbackType)
    : addScheduleItem(items, value, fallbackType);
}

export function dedupeScheduleItems(items) {
  if (!Array.isArray(items)) return [];
  return items.reduce((result, item) => addScheduleItem(result, item), []);
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isStrictStoredItem(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      hasOnlyKeys(value, ["type", "id"]) &&
      asScheduleItem(value)
  );
}

function migrateLegacy(value) {
  const ids = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray(value.festivalIds)
      ? value.festivalIds
      : null;

  if (!ids || !ids.every(isValidId)) return null;
  return dedupeScheduleItems(ids.map((id) => ({ type: "festival", id })));
}

export function parseScheduleStorage(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { items: [], status: "empty" };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], status: "reset" };
  }

  const legacyItems = migrateLegacy(parsed);
  if (legacyItems) return { items: legacyItems, status: "migrated" };

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !hasOnlyKeys(parsed, ["version", "items"]) ||
    parsed.version !== SCHEDULE_STORAGE_VERSION ||
    !Array.isArray(parsed.items) ||
    !parsed.items.every(isStrictStoredItem)
  ) {
    return { items: [], status: "reset" };
  }

  const items = dedupeScheduleItems(parsed.items);
  return {
    items,
    status: items.length === parsed.items.length ? "current" : "deduplicated",
  };
}

export function serializeScheduleItems(items) {
  const safeItems = dedupeScheduleItems(items).map(({ type, id }) => ({ type, id }));
  return JSON.stringify({ version: SCHEDULE_STORAGE_VERSION, items: safeItems });
}

function timedRange(event) {
  if (!event?.start_time || !event?.end_time) return null;
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

export function findOverlappingEvents(events) {
  const timedEvents = (Array.isArray(events) ? events : [])
    .map((event) => ({ event, range: timedRange(event) }))
    .filter(({ range }) => range);
  const overlaps = [];

  for (let leftIndex = 0; leftIndex < timedEvents.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < timedEvents.length; rightIndex += 1) {
      const left = timedEvents[leftIndex];
      const right = timedEvents[rightIndex];
      if (left.range.start < right.range.end && right.range.start < left.range.end) {
        overlaps.push([left.event, right.event]);
      }
    }
  }

  return overlaps;
}
