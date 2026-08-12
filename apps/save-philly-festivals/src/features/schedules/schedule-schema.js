import { z } from "zod";

export const SCHEDULE_JSON_BODY_LIMIT = 16 * 1024;

export const scheduleIdSchema = z.uuid();
export const scheduleDateTypeSchema = z.enum(["timed", "all_day"]);
export const scheduleStatusSchema = z.enum(["confirmed", "tentative", "postponed", "canceled"]);

const isoDateTime = z.iso.datetime();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

/* Declared without `.default()` so the update variant can tell "field omitted" from "field set
 * to its default" — the bug that let an empty PATCH reset a sponsor's status and order. */
const scheduleFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  performer: z.string().trim().max(200).nullable().optional(),
  genre: z.string().trim().max(120).nullable().optional(),
  is_headliner: z.boolean(),
  calendar_date_type: scheduleDateTypeSchema,
  calendar_status: scheduleStatusSchema,
  start_time: isoDateTime.nullable().optional(),
  end_time: isoDateTime.nullable().optional(),
  all_day_start: isoDate.nullable().optional(),
  all_day_end: isoDate.nullable().optional(),
  /* Optional link to a specific occurrence of a multi-date festival. The service checks the
   * occurrence belongs to the same festival; the compound foreign key enforces it again. */
  occurrence_id: z.uuid().nullable().optional(),
};

/**
 * The interval rules.
 *
 * The database CHECK constraints are looser than this on purpose — they permit a `timed` row
 * with a null `end_time`. But `calendar-export-repository.js` only exports an event with both
 * bounds, so such a row renders on the festival page and then silently vanishes from every ICS
 * subscription. Requiring both here is what stops an editor creating an entry that appears to
 * work and doesn't.
 *
 * `time_zone` is deliberately absent: a CHECK constraint pins it to America/New_York, so
 * exposing it as a field would only offer a choice the database rejects.
 */
function assertInterval(value, context) {
  if (value.calendar_date_type === "timed") {
    if (!value.start_time || !value.end_time) {
      context.addIssue({
        code: "custom",
        path: ["end_time"],
        message: "A timed entry needs both a start and an end, or it will not appear in calendar exports",
      });
      return;
    }
    if (new Date(value.end_time) <= new Date(value.start_time)) {
      context.addIssue({ code: "custom", path: ["end_time"], message: "The end time must fall after the start time" });
    }
    return;
  }
  if (!value.all_day_start || !value.all_day_end) {
    context.addIssue({ code: "custom", path: ["all_day_end"], message: "An all-day entry needs both a first and a last day" });
    return;
  }
  if (value.all_day_end < value.all_day_start) {
    context.addIssue({ code: "custom", path: ["all_day_end"], message: "The last day must fall on or after the first day" });
  }
}

export const createScheduleSchema = z.object({
  ...scheduleFields,
  is_headliner: z.boolean().default(false),
  calendar_date_type: scheduleDateTypeSchema.default("timed"),
  calendar_status: scheduleStatusSchema.default("confirmed"),
}).strict().superRefine(assertInterval);

/**
 * Updates are validated whole, not field by field.
 *
 * The interval rules span several fields, so a partial patch cannot be checked in isolation —
 * clearing `end_time` alone is invalid only in combination with `calendar_date_type: "timed"`.
 * The service merges the patch over the stored row and validates the result with
 * `createScheduleSchema`, so this shape only checks types and that something was sent.
 */
export const updateScheduleSchema = z.object(
  Object.fromEntries(Object.entries(scheduleFields).map(([key, schema]) => [key, schema.optional()])),
).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field is required",
});
