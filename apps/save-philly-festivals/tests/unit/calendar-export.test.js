import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CalendarGenerationError,
  generateCalendarIcs,
} from "@/features/calendar-export/calendar-export-generator";
import { createCalendarExportRepository } from "@/features/calendar-export/calendar-export-repository";
import {
  mapCalendarSelections,
  validateCalendarSiteOrigin,
} from "@/features/calendar-export/calendar-export-resolution";
import {
  MAX_CALENDAR_EXPORT_ITEMS,
  calendarExportRequestSchema,
} from "@/features/calendar-export/calendar-export-schema";
import {
  NoCalendarExportItemsError,
  exportCalendar,
} from "@/features/calendar-export/calendar-export-service";

const updatedAt = new Date("2026-01-15T12:34:56.000Z");

function timed(overrides = {}) {
  return {
    type: "event",
    id: "event-1",
    title: "Community Parade",
    description: "Neighborhood celebration",
    location: "Market Street",
    dateType: "timed",
    timeZone: "America/New_York",
    allDayStart: null,
    allDayEnd: null,
    start: new Date("2026-07-04T16:00:00.000Z"),
    end: new Date("2026-07-04T17:30:00.000Z"),
    calendarStatus: "confirmed",
    sequence: 2,
    publishedAt: new Date("2026-01-10T10:00:45.000Z"),
    updatedAt,
    canonicalUrl: "https://festivals.example/festivals/community-fest",
    ...overrides,
  };
}

function allDay(overrides = {}) {
  return timed({
    type: "festival",
    id: "festival-1",
    title: "All-day Festival",
    dateType: "all_day",
    allDayStart: new Date("2026-07-04T00:00:00.000Z"),
    allDayEnd: new Date("2026-07-04T00:00:00.000Z"),
    start: null,
    end: null,
    ...overrides,
  });
}

function selection(items = [{ type: "festival", id: "festival-1" }]) {
  return { selection: { version: 1, items } };
}

describe("calendar export request schema", () => {
  it("accepts only strict version 1 ID selections", () => {
    expect(calendarExportRequestSchema.parse(selection())).toEqual(selection());
    expect(calendarExportRequestSchema.safeParse({ ...selection(), email: "private@example.com" }).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse({ selection: { version: 2, items: selection().selection.items } }).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([{ type: "festival", id: "f", title: "untrusted" }])).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([{ type: "schedule", id: "f" }])).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([{ type: "festival", id: "../private" }])).success).toBe(false);
  });

  it("requires 1..100 bounded IDs and rejects only exact type/ID duplicates", () => {
    expect(calendarExportRequestSchema.safeParse(selection([])).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection(Array.from(
      { length: MAX_CALENDAR_EXPORT_ITEMS + 1 },
      (_, i) => ({ type: "event", id: `event-${i}` })
    ))).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([{ type: "event", id: "x".repeat(129) }])).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([
      { type: "festival", id: "same" },
      { type: "festival", id: "same" },
    ])).success).toBe(false);
    expect(calendarExportRequestSchema.safeParse(selection([
      { type: "festival", id: "same" },
      { type: "event", id: "same" },
    ])).success).toBe(true);
  });
});

describe("calendar repository resolution", () => {
  it("preserves mixed request order, uses parent location fallback, and omits misses", () => {
    const festivalRecord = {
      id: "festival-1", name: "Festival", slug: "server-slug", description: "Public",
      location: "Parent Place", start_date: updatedAt, end_date: new Date(updatedAt.getTime() + 3600000),
      calendar_date_type: "timed", time_zone: "America/New_York", all_day_start: null,
      all_day_end: null, calendar_status: "confirmed", calendar_sequence: 0,
      calendar_published_at: updatedAt, created_at: updatedAt, updated_at: updatedAt,
    };
    const eventRecord = {
      id: "event-1", title: "Event", description: null, location: null,
      start_time: updatedAt, end_time: new Date(updatedAt.getTime() + 3600000),
      calendar_date_type: "timed", time_zone: "America/New_York", all_day_start: null,
      all_day_end: null, calendar_status: "confirmed", calendar_sequence: 0,
      calendar_published_at: updatedAt, created_at: updatedAt, updated_at: updatedAt,
      festival: { slug: "server-slug", location: "Parent Place" },
    };
    const result = mapCalendarSelections([
      { type: "event", id: "event-1" },
      { type: "festival", id: "missing" },
      { type: "festival", id: "festival-1" },
    ], { festivals: [festivalRecord], events: [eventRecord] }, "https://festivals.example");

    expect(result.records.map(({ type, id }) => ({ type, id }))).toEqual([
      { type: "event", id: "event-1" },
      { type: "festival", id: "festival-1" },
    ]);
    expect(result.records[0].location).toBe("Parent Place");
    expect(result.records[0].canonicalUrl).toBe("https://festivals.example/festivals/server-slug");
    expect(result.omittedCount).toBe(1);
  });

  it("inherits parent cancellation and parent-derived last-modified metadata for child events", () => {
    const parentUpdatedAt = new Date("2026-02-01T00:00:00.000Z");
    const eventRecord = {
      id: "event-1", title: "Event", description: null, location: null,
      start_time: updatedAt, end_time: new Date(updatedAt.getTime() + 3600000),
      calendar_date_type: "timed", time_zone: "America/New_York", all_day_start: null,
      all_day_end: null, calendar_status: "confirmed", calendar_sequence: 2,
      calendar_published_at: updatedAt, created_at: updatedAt, updated_at: updatedAt,
      festival: {
        slug: "new-server-slug", location: "Updated Parent Place", calendar_status: "canceled",
        calendar_sequence: 3, calendar_published_at: updatedAt, updated_at: parentUpdatedAt,
      },
    };

    const result = mapCalendarSelections(
      [{ type: "event", id: "event-1" }],
      { events: [eventRecord] },
      "https://festivals.example"
    );

    expect(result.records[0]).toMatchObject({
      calendarStatus: "canceled",
      sequence: 2,
      updatedAt: parentUpdatedAt,
      location: "Updated Parent Place",
      canonicalUrl: "https://festivals.example/festivals/new-server-slug",
    });
  });

  it("queries approved/current or previously-published canceled records with safe selects", async () => {
    const prisma = {
      festival: { findMany: vi.fn(async () => []) },
      schedule: { findMany: vi.fn(async () => []) },
    };
    const repository = createCalendarExportRepository({ prisma });
    await repository.resolveSelection([
      { type: "festival", id: "f" }, { type: "event", id: "e" },
    ], { siteOrigin: "https://festivals.example" });

    const festivalQuery = prisma.festival.findMany.mock.calls[0][0];
    const eventQuery = prisma.schedule.findMany.mock.calls[0][0];
    expect(JSON.stringify(festivalQuery.where)).toContain('"workflow_state":"published"');
    expect(JSON.stringify(festivalQuery.where)).toContain('"workflow_state":"canceled"');
    expect(JSON.stringify(festivalQuery.where)).toContain('"first_published_at":{"not":null}');
    expect(JSON.stringify(eventQuery.where)).toContain('"festival"');
    expect(JSON.stringify(festivalQuery.where)).toContain('"start_date":{"not":null}');
    expect(JSON.stringify(festivalQuery.where)).toContain('"all_day_start":{"not":null}');
    expect(JSON.stringify(eventQuery.where)).toContain('"start_time":{"not":null}');
    expect(JSON.stringify(eventQuery.where)).toContain('"all_day_start":{"not":null}');
    expect(festivalQuery.select).not.toHaveProperty("contact_email");
    expect(eventQuery.select.festival.select).not.toHaveProperty("contact_email");
  });
});

describe("server ICS generation", () => {
  it.each([
    ["summer", "2026-07-04T16:00:00.000Z", "20260704T160000Z", "20260704T170000Z"],
    ["winter", "2026-01-04T17:00:00.000Z", "20260104T170000Z", "20260104T180000Z"],
    ["spring DST transition", "2026-03-08T07:30:00.000Z", "20260308T073000Z", "20260308T083000Z"],
    ["fall DST transition", "2026-11-01T06:30:00.000Z", "20261101T063000Z", "20261101T073000Z"],
  ])("writes %s timed instants in UTC", (_label, start, expectedStart, expectedEnd) => {
    const calendar = generateCalendarIcs([timed({ start: new Date(start), end: new Date(new Date(start).getTime() + 3600000) })]);
    expect(calendar).toContain(`DTSTART:${expectedStart}`);
    expect(calendar).toContain(`DTEND:${expectedEnd}`);
  });

  it("keeps a timed span across UTC midnight as instants", () => {
    const calendar = generateCalendarIcs([timed({
      start: new Date("2026-07-04T23:30:00.000Z"),
      end: new Date("2026-07-05T00:30:00.000Z"),
    })]);
    expect(calendar).toContain("DTSTART:20260704T233000Z");
    expect(calendar).toContain("DTEND:20260705T003000Z");
  });

  it("turns inclusive one-day and multi-day civil ends into exclusive DTEND dates", () => {
    const oneDay = generateCalendarIcs([allDay()]);
    const multiDay = generateCalendarIcs([allDay({
      allDayStart: "2026-03-07",
      allDayEnd: "2026-03-09",
    })]);
    expect(oneDay).toContain("DTSTART;VALUE=DATE:20260704\r\nDTEND;VALUE=DATE:20260705");
    expect(multiDay).toContain("DTSTART;VALUE=DATE:20260307\r\nDTEND;VALUE=DATE:20260310");
  });

  it.each([
    ["confirmed", "CONFIRMED", "BUSY"],
    ["tentative", "TENTATIVE", "BUSY"],
    ["postponed", "TENTATIVE", "BUSY"],
    ["canceled", "CANCELLED", "FREE"],
  ])("maps %s status and metadata", (source, status, busy) => {
    const calendar = generateCalendarIcs([timed({ calendarStatus: source })]);
    expect(calendar).toContain(`STATUS:${status}`);
    expect(calendar).toContain(`X-MICROSOFT-CDO-BUSYSTATUS:${busy}`);
    expect(calendar).toContain("UID:event-event-1@savephillyfestivals.com");
    expect(calendar).toContain("DTSTAMP:20260110T100045Z");
    expect(calendar).toContain("LAST-MODIFIED:20260115T123456Z");
    expect(calendar).toContain("SEQUENCE:2");
  });

  it("preserves Unicode, escapes text, uses CRLF, and emits no private mail or alarms", () => {
    const calendar = generateCalendarIcs([timed({
      title: "Niñez, Música; Philly",
      description: "First line\nprivate@example.com is not actually supplied",
      location: "5th & Market, Philadelphia",
    })]);
    expect(calendar).toContain("SUMMARY:Niñez\\, Música\\; Philly");
    expect(calendar).toContain("LOCATION:5th & Market\\, Philadelphia");
    expect(calendar).not.toMatch(/BEGIN:VALARM|ORGANIZER|ATTENDEE/);
    expect(calendar).not.toMatch(/(?<!\r)\n/);
    expect(calendar).toContain("PRODID:-//Philly Fests//Schedule Calendar//EN");
  });

  it.each([
    { title: "" },
    { dateType: "timed", start: null },
    { dateType: "timed", end: new Date("2026-01-01") },
    { dateType: "all_day", allDayStart: "2026-04-31", allDayEnd: "2026-05-01" },
    { calendarStatus: "unknown" },
    { sequence: -1 },
    { timeZone: "Not/A_Zone" },
  ])("throws a controlled error for malformed normalized records %#", (override) => {
    expect(() => generateCalendarIcs([timed(override)])).toThrow(CalendarGenerationError);
  });
});

describe("calendar export service and origin validation", () => {
  it("returns ICS and omitted count", async () => {
    const repository = { resolveSelection: vi.fn(async () => ({ records: [timed()], omittedCount: 3 })) };
    const result = await exportCalendar(selection(), { repository, siteUrl: "https://festivals.example/path" });
    expect(result.ics).toContain("BEGIN:VCALENDAR");
    expect(result.omittedCount).toBe(3);
    expect(repository.resolveSelection).toHaveBeenCalledWith(selection().selection.items, {
      siteOrigin: "https://festivals.example",
    });
  });

  it("throws typed 422 when no records resolve", async () => {
    const repository = { resolveSelection: vi.fn(async () => ({ records: [], omittedCount: 1 })) };
    await expect(exportCalendar(selection(), { repository, siteUrl: "https://festivals.example" }))
      .rejects.toBeInstanceOf(NoCalendarExportItemsError);
  });

  it("rejects non-http, credentialed, or malformed site origins", () => {
    expect(validateCalendarSiteOrigin("https://festivals.example/path")).toBe("https://festivals.example");
    expect(() => validateCalendarSiteOrigin("javascript:alert(1)")).toThrow();
    expect(() => validateCalendarSiteOrigin("https://user:pass@festivals.example")).toThrow();
    expect(() => validateCalendarSiteOrigin(undefined)).toThrow();
  });
});

afterEach(() => vi.restoreAllMocks());
