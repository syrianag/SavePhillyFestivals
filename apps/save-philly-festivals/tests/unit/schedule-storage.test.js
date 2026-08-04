import { describe, expect, it } from "vitest";
import {
  addScheduleItem,
  containsScheduleItem,
  dedupeScheduleItems,
  findOverlappingEvents,
  parseScheduleStorage,
  removeScheduleItem,
  serializeScheduleItems,
  toggleScheduleItem,
} from "@/features/schedule/schedule-storage";

describe("schedule storage", () => {
  it("treats missing storage as an empty schedule", () => {
    expect(parseScheduleStorage(null)).toEqual({ status: "empty", items: [] });
  });

  it("parses and serializes the versioned non-sensitive schema", () => {
    const raw = serializeScheduleItems([
      { type: "festival", id: "festival-1", title: "must not persist", email: "nope@example.com" },
      { type: "event", id: "event-1", start_time: "2026-01-01" },
    ]);

    expect(JSON.parse(raw)).toEqual({
      version: 1,
      items: [
        { type: "festival", id: "festival-1" },
        { type: "event", id: "event-1" },
      ],
    });
    expect(parseScheduleStorage(raw)).toEqual({
      status: "current",
      items: [
        { type: "festival", id: "festival-1" },
        { type: "event", id: "event-1" },
      ],
    });
  });

  it.each([
    ['["festival-1","festival-1",2]', [
      { type: "festival", id: "festival-1" },
      { type: "festival", id: 2 },
    ]],
    ['{"festivalIds":["festival-1","festival-1"]}', [
      { type: "festival", id: "festival-1" },
    ]],
  ])("migrates a legacy festival-ID payload", (raw, items) => {
    expect(parseScheduleStorage(raw)).toEqual({ status: "migrated", items });
  });

  it.each([
    "not json",
    "null",
    "{}",
    '{"version":2,"items":[]}',
    '{"version":1,"items":"nope"}',
    '{"version":1,"items":[{"type":"other","id":"1"}]}',
    '{"version":1,"items":[{"type":"festival","id":"1","email":"nope@example.com"}]}',
  ])("resets malformed, corrupt, or unknown data without throwing: %s", (raw) => {
    expect(() => parseScheduleStorage(raw)).not.toThrow();
    expect(parseScheduleStorage(raw)).toEqual({ status: "reset", items: [] });
  });

  it("deduplicates exact items while parsing a current payload", () => {
    expect(parseScheduleStorage(JSON.stringify({
      version: 1,
      items: [
        { type: "event", id: "event-1" },
        { type: "event", id: "event-1" },
      ],
    }))).toEqual({
      status: "deduplicated",
      items: [{ type: "event", id: "event-1" }],
    });
  });

  it("keeps mixed parent festival and child event selections distinct", () => {
    const items = dedupeScheduleItems([
      { type: "festival", id: "shared-id" },
      { type: "event", id: "shared-id" },
      { type: "festival", id: "shared-id" },
    ]);

    expect(items).toEqual([
      { type: "festival", id: "shared-id" },
      { type: "event", id: "shared-id" },
    ]);
    expect(containsScheduleItem(items, { type: "festival", id: "shared-id" })).toBe(true);
    expect(containsScheduleItem(items, { type: "event", id: "shared-id" })).toBe(true);
  });

  it("adds, toggles, and removes exact selections without duplicates", () => {
    const festival = { type: "festival", id: "festival-1" };
    const event = { type: "event", id: "event-1" };
    const once = addScheduleItem([], festival);

    expect(addScheduleItem(once, festival)).toBe(once);
    expect(toggleScheduleItem(once, event)).toEqual([festival, event]);
    expect(removeScheduleItem([festival, event], festival)).toEqual([event]);
  });

  it("defaults primitive IDs to festivals for backwards compatibility", () => {
    const items = addScheduleItem([], "legacy-festival");
    expect(items).toEqual([{ type: "festival", id: "legacy-festival" }]);
    expect(containsScheduleItem(items, "legacy-festival")).toBe(true);
  });
});

describe("schedule overlap warnings", () => {
  it("finds overlapping timed events without removing or blocking either event", () => {
    const events = [
      {
        id: "one",
        title: "One",
        start_time: "2026-09-12T16:00:00.000Z",
        end_time: "2026-09-12T17:00:00.000Z",
      },
      {
        id: "two",
        title: "Two",
        start_time: "2026-09-12T16:30:00.000Z",
        end_time: "2026-09-12T18:00:00.000Z",
      },
      {
        id: "three",
        title: "Three",
        start_time: "2026-09-12T18:00:00.000Z",
        end_time: "2026-09-12T19:00:00.000Z",
      },
    ];

    expect(findOverlappingEvents(events)).toEqual([[events[0], events[1]]]);
    expect(events).toHaveLength(3);
  });

  it("ignores untimed, invalid, and boundary-touching events", () => {
    expect(findOverlappingEvents([
      { id: "untimed" },
      { id: "invalid", start_time: "bad", end_time: "also bad" },
      { id: "one", start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" },
      { id: "two", start_time: "2026-01-01T11:00:00Z", end_time: "2026-01-01T12:00:00Z" },
    ])).toEqual([]);
  });
});
