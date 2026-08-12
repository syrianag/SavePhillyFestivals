import { describe, expect, it, vi } from "vitest";

import { createScheduleSchema, updateScheduleSchema } from "@/features/schedules/schedule-schema";
import { createFestivalSchedule, updateFestivalSchedule } from "@/features/schedules/schedule-service";

const timed = {
  title: "Sun Ra Arkestra",
  calendar_date_type: "timed",
  start_time: "2026-09-05T18:00:00.000Z",
  end_time: "2026-09-05T20:00:00.000Z",
};

describe("programme entry validation", () => {
  it("accepts a timed entry with both bounds", () => {
    expect(createScheduleSchema.safeParse(timed).success).toBe(true);
  });

  /**
   * The database CHECK constraints permit a timed row with no end time, but
   * `calendar-export-repository.js` only exports events carrying both — such a row shows on the
   * festival page and then silently vanishes from every ICS subscription. Rejecting it here is
   * the whole point of validating above the database.
   */
  it("rejects a timed entry with no end time", () => {
    const { end_time: _omitted, ...withoutEnd } = timed;
    const parsed = createScheduleSchema.safeParse(withoutEnd);
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error.issues)).toContain("calendar exports");
  });

  it("rejects an end that precedes the start", () => {
    expect(createScheduleSchema.safeParse({ ...timed, end_time: "2026-09-05T17:00:00.000Z" }).success).toBe(false);
  });

  it("requires both days on an all-day entry", () => {
    expect(createScheduleSchema.safeParse({
      title: "Craft market", calendar_date_type: "all_day", all_day_start: "2026-09-05",
    }).success).toBe(false);
    expect(createScheduleSchema.safeParse({
      title: "Craft market", calendar_date_type: "all_day", all_day_start: "2026-09-05", all_day_end: "2026-09-07",
    }).success).toBe(true);
  });

  /* `calendar_sequence`, `calendar_published_at` and `time_zone` are owned by
   * `set_schedule_calendar_metadata()` and a CHECK constraint. Accepting them would offer a
   * choice the database overwrites or rejects. */
  it.each(["calendar_sequence", "calendar_published_at", "time_zone"])("refuses the trigger-owned field %s", (field) => {
    expect(createScheduleSchema.safeParse({ ...timed, [field]: 1 }).success).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(updateScheduleSchema.safeParse({}).success).toBe(false);
  });
});

describe("programme entry service", () => {
  function repositoryStub(current) {
    return {
      findById: vi.fn().mockResolvedValue(current),
      create: vi.fn().mockImplementation((festivalId, data) => Promise.resolve({ id: "s1", festival_id: festivalId, ...data })),
      update: vi.fn().mockImplementation((festivalId, id, data) => Promise.resolve({ id, ...data })),
      listOccurrences: vi.fn().mockResolvedValue([{ id: "occ-1", is_primary: true }]),
    };
  }

  it("converts wire strings to date columns", async () => {
    const repository = repositoryStub(null);
    await createFestivalSchedule("fest-1", createScheduleSchema.parse(timed), { repository });
    const data = repository.create.mock.calls[0][1];
    expect(data.start_time).toBeInstanceOf(Date);
    expect(data.end_time).toBeInstanceOf(Date);
  });

  /* A row carrying both families would slip past the per-family CHECK constraints. */
  it("clears the unused date family", async () => {
    const repository = repositoryStub(null);
    await createFestivalSchedule("fest-1", createScheduleSchema.parse({
      title: "Craft market", calendar_date_type: "all_day", all_day_start: "2026-09-05", all_day_end: "2026-09-07",
    }), { repository });
    const data = repository.create.mock.calls[0][1];
    expect(data.start_time).toBeNull();
    expect(data.end_time).toBeNull();
    expect(data.all_day_start).toBeInstanceOf(Date);
  });

  it("refuses an occurrence belonging to another festival", async () => {
    const repository = repositoryStub(null);
    await expect(createFestivalSchedule("fest-1", { ...createScheduleSchema.parse(timed), occurrence_id: "occ-elsewhere" }, { repository }))
      .rejects.toMatchObject({ code: "invalid_request" });
  });

  /**
   * The interval rules span several fields, so a patch has to be judged against the merged row.
   * Clearing `end_time` alone is valid for an all-day entry and invalid for a timed one.
   */
  it("re-validates a partial update against the stored row", async () => {
    const stored = {
      title: "Sun Ra Arkestra", description: null, location: null, performer: null, genre: null,
      is_headliner: false, calendar_date_type: "timed", calendar_status: "confirmed",
      start_time: new Date("2026-09-05T18:00:00.000Z"), end_time: new Date("2026-09-05T20:00:00.000Z"),
      all_day_start: null, all_day_end: null, occurrence_id: null,
    };
    const repository = repositoryStub(stored);

    await expect(updateFestivalSchedule("fest-1", "s1", { end_time: null }, { repository }))
      .rejects.toMatchObject({ code: "invalid_request" });

    /* A harmless patch on the same row still succeeds. */
    await expect(updateFestivalSchedule("fest-1", "s1", { performer: "Marshall Allen" }, { repository }))
      .resolves.toBeDefined();
  });
});
