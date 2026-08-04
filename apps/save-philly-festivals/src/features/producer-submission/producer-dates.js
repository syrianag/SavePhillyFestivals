const TIME_ZONE = "America/New_York";

function partsInNewYork(date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function offsetAt(date) {
  const parts = partsInNewYork(date);
  const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((representedAsUtc - date.getTime()) / 60000);
}

function offsetText(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

export function newYorkLocalToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) throw new Error("Enter a valid local date and time.");
  const [, year, month, day, hour, minute] = match;
  const wallClockUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = new Date(wallClockUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    instant = new Date(wallClockUtc - offsetAt(instant) * 60000);
  }
  const parts = partsInNewYork(instant);
  const roundTrip = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  if (roundTrip !== value) throw new Error("That local time does not exist in America/New_York because of daylight saving time.");
  const alternateMatches = [-60, 60].some((minutes) => {
    const alternate = partsInNewYork(new Date(instant.getTime() + minutes * 60000));
    return `${alternate.year}-${alternate.month}-${alternate.day}T${alternate.hour}:${alternate.minute}` === value;
  });
  if (alternateMatches) throw new Error("That local time is ambiguous in America/New_York because clocks fall back. Choose a different time.");
  return `${value}:00${offsetText(offsetAt(instant))}`;
}

export function isoToNewYorkLocal(value) {
  if (!value) return "";
  const parts = partsInNewYork(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}
