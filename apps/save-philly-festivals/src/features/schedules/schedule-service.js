import { ScheduleNotFoundError } from "./schedule-repository";
import { createScheduleSchema } from "./schedule-schema";

export class ScheduleValidationError extends Error {
  constructor(issues) {
    super("Invalid programme entry.");
    this.statusCode = 400;
    this.code = "invalid_request";
    this.issues = issues;
  }
}

/** Dates arrive as strings from the wire; the columns are timestamps and `@db.Date`. */
function toColumns(input) {
  const data = { ...input };
  for (const key of ["start_time", "end_time"]) {
    if (Object.hasOwn(data, key)) data[key] = data[key] ? new Date(data[key]) : null;
  }
  for (const key of ["all_day_start", "all_day_end"]) {
    /* `@db.Date` columns: a bare YYYY-MM-DD parses as UTC midnight, which is what the column
     * stores. Adding a zone offset here would shift the day. */
    if (Object.hasOwn(data, key)) data[key] = data[key] ? new Date(`${data[key]}T00:00:00.000Z`) : null;
  }
  /* The other date family must be cleared, or a row ends up carrying both and the CHECK
   * constraints — which are per-family — would not catch it. */
  if (data.calendar_date_type === "timed") { data.all_day_start = null; data.all_day_end = null; }
  if (data.calendar_date_type === "all_day") { data.start_time = null; data.end_time = null; }
  return data;
}

async function assertOccurrenceBelongs(festivalId, occurrenceId, repository) {
  if (!occurrenceId) return;
  const occurrences = await repository.listOccurrences(festivalId);
  if (!occurrences.some((occurrence) => occurrence.id === occurrenceId)) {
    throw new ScheduleValidationError([{ path: "occurrence_id", message: "That occurrence belongs to a different festival" }]);
  }
}

export async function listFestivalSchedules(festivalId, { repository }) {
  const [items, occurrences] = await Promise.all([
    repository.listForFestival(festivalId),
    repository.listOccurrences(festivalId),
  ]);
  return { schedules: items, occurrences };
}

export async function createFestivalSchedule(festivalId, input, { repository }) {
  await assertOccurrenceBelongs(festivalId, input.occurrence_id, repository);
  return { schedule: await repository.create(festivalId, toColumns(input)) };
}

/**
 * Updates are merged then re-validated whole.
 *
 * The interval rules span `calendar_date_type`, both time fields and both day fields, so a
 * partial patch cannot be judged on its own — clearing `end_time` is fine for an all-day entry
 * and invalid for a timed one. Merging over the stored row and running the create schema is what
 * stops a patch leaving a row the create path would have rejected.
 */
export async function updateFestivalSchedule(festivalId, id, input, { repository }) {
  const current = await repository.findById(festivalId, id);
  if (!current) throw new ScheduleNotFoundError();

  const merged = {
    title: current.title,
    description: current.description,
    location: current.location,
    performer: current.performer,
    genre: current.genre,
    is_headliner: current.is_headliner,
    calendar_date_type: current.calendar_date_type,
    calendar_status: current.calendar_status,
    start_time: current.start_time?.toISOString() ?? null,
    end_time: current.end_time?.toISOString() ?? null,
    all_day_start: current.all_day_start?.toISOString().slice(0, 10) ?? null,
    all_day_end: current.all_day_end?.toISOString().slice(0, 10) ?? null,
    occurrence_id: current.occurrence_id,
    ...input,
  };

  const parsed = createScheduleSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ScheduleValidationError(parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
  }
  await assertOccurrenceBelongs(festivalId, parsed.data.occurrence_id, repository);

  return { schedule: await repository.update(festivalId, id, toColumns(parsed.data)) };
}

export async function removeFestivalSchedule(festivalId, id, { repository }) {
  return repository.remove(festivalId, id);
}

export async function listScheduleOverview({ repository }) {
  return { festivals: await repository.listFestivalsWithSchedules() };
}
