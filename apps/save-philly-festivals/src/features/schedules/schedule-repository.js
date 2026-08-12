import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";

export class ScheduleNotFoundError extends Error {
  constructor() { super("Programme entry not found."); this.statusCode = 404; this.code = "not_found"; }
}

/**
 * `calendar_sequence` and `calendar_published_at` are absent on purpose.
 *
 * `set_schedule_calendar_metadata()` owns both: it assigns the sequence on insert, bumps it when
 * a materially-changed row is updated, and freezes `calendar_published_at` once set. Selecting
 * them would invite a round-trip that writes them back, and any client value is overwritten
 * anyway. `time_zone` is likewise pinned by a CHECK constraint.
 */
const scheduleSelect = {
  id: true,
  festival_id: true,
  occurrence_id: true,
  title: true,
  description: true,
  location: true,
  performer: true,
  genre: true,
  is_headliner: true,
  calendar_date_type: true,
  calendar_status: true,
  start_time: true,
  end_time: true,
  all_day_start: true,
  all_day_end: true,
  created_at: true,
  updated_at: true,
};

/* Headliners first within a slot, then chronological. Nulls last so an undated entry does not
 * lead the programme. */
const scheduleOrderBy = [
  { start_time: { sort: "asc", nulls: "last" } },
  { all_day_start: { sort: "asc", nulls: "last" } },
  { is_headliner: "desc" },
  { title: "asc" },
];

export const scheduleRepository = {
  listForFestival(festivalId) {
    return prisma.schedule.findMany({ where: { festival_id: festivalId }, select: scheduleSelect, orderBy: scheduleOrderBy });
  },

  findById(festivalId, id) {
    return prisma.schedule.findFirst({ where: { id, festival_id: festivalId }, select: scheduleSelect });
  },

  create(festivalId, data) {
    return prisma.schedule.create({ data: { id: randomUUID(), festival_id: festivalId, ...data }, select: scheduleSelect });
  },

  /* Scoped by festival as well as id, so a mis-addressed request cannot edit another festival's
   * programme. */
  async update(festivalId, id, data) {
    const updated = await prisma.schedule.updateMany({ where: { id, festival_id: festivalId }, data });
    if (updated.count !== 1) throw new ScheduleNotFoundError();
    return prisma.schedule.findUnique({ where: { id }, select: scheduleSelect });
  },

  async remove(festivalId, id) {
    const deleted = await prisma.schedule.deleteMany({ where: { id, festival_id: festivalId } });
    if (deleted.count !== 1) throw new ScheduleNotFoundError();
    return { id };
  },

  /** Occurrences an entry may be attached to. Scoped per festival: the compound foreign key
   * `(occurrence_id, festival_id)` rejects a pairing from a different festival. */
  listOccurrences(festivalId) {
    return prisma.festivalOccurrence.findMany({
      where: { festival_id: festivalId },
      select: { id: true, is_primary: true, start_at: true, end_at: true, all_day_start: true, all_day_end: true },
      orderBy: [{ is_primary: "desc" }, { start_at: "asc" }],
    });
  },

  /** The admin overview: every festival that has a programme, with its entries counted. */
  listFestivalsWithSchedules(limit = 100) {
    return prisma.festival.findMany({
      where: { schedules: { some: {} } },
      select: {
        id: true,
        name: true,
        slug: true,
        workflow_state: true,
        start_date: true,
        _count: { select: { schedules: true } },
      },
      orderBy: [{ start_date: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: limit,
    });
  },
};
