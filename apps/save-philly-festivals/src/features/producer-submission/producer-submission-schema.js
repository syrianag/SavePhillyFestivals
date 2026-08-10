import { z } from "zod";

import { allDayTimedMirror } from "@/features/festivals/discovery";

export const PRODUCER_TERMS_VERSION = 1;
export const ASSET_RIGHTS_VERSION = 1;
export const PRODUCER_JSON_BODY_LIMIT = 32 * 1024;
export const PRODUCER_ASSET_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCER_MULTIPART_MAX_BYTES = PRODUCER_ASSET_MAX_BYTES + 64 * 1024;
export const PRODUCER_TIME_ZONE = "America/New_York";

const boundedText = (max) => z.string().trim().max(max);
const requiredText = (max) => boundedText(max).min(1);
const nullableText = (max) => boundedText(max).nullable();
const nullableEmail = z.string().trim().max(254).email().transform((value) => value.toLowerCase()).nullable();
const nullableUrl = z.string().trim().max(2048).url().nullable();

function newYorkOffset(date) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: PRODUCER_TIME_ZONE,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
  return name?.replace("GMT", "") || null;
}

export function isExplicitNewYorkDateTime(value) {
  if (typeof value !== "string") return false;
  const suffix = value.match(/(Z|[+-]\d{2}:\d{2})$/)?.[1];
  const date = new Date(value);
  if (!suffix || Number.isNaN(date.valueOf())) return false;
  const suppliedOffset = suffix === "Z" ? "+00:00" : suffix;
  if (suppliedOffset !== newYorkOffset(date)) return false;
  const wallFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRODUCER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const wall = (instant) => Object.fromEntries(wallFormatter.formatToParts(instant)
    .filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const current = wall(date);
  const key = (parts) => `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return ![-60, 60].some((minutes) => key(wall(new Date(date.getTime() + minutes * 60000))) === key(current));
}

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const nullableNewYorkDateTime = z.string().refine(isExplicitNewYorkDateTime, {
  message: "Use an unambiguous ISO timestamp with the correct America/New_York UTC offset",
}).nullable();
const nullableCalendarDate = z.string().refine(isCalendarDate, { message: "Use a valid YYYY-MM-DD date" }).nullable();

export const producerFestivalIdSchema = z.uuid();

export const createProducerDraftSchema = z.object({
  submission_key: z.uuid(),
}).strict();

export const patchProducerFestivalSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  name: boundedText(200).optional(),
  description: nullableText(10000).optional(),
  location: nullableText(500).optional(),
  city: nullableText(100).optional(),
  state: nullableText(2).refine((value) => value === null || /^[A-Za-z]{2}$/.test(value), "Use a two-letter state code").transform((value) => value?.toUpperCase() ?? null).optional(),
  zip_code: nullableText(10).refine((value) => value === null || /^\d{5}(?:-\d{4})?$/.test(value), "Use a valid ZIP code").optional(),
  contact_name: nullableText(200).optional(),
  contact_email: nullableEmail.optional(),
  contact_phone: nullableText(40).optional(),
  website_url: nullableUrl.optional(),
  calendar_date_type: z.enum(["timed", "all_day"]).optional(),
  time_zone: z.literal(PRODUCER_TIME_ZONE).optional(),
  start_date: nullableNewYorkDateTime.optional(),
  end_date: nullableNewYorkDateTime.optional(),
  all_day_start: nullableCalendarDate.optional(),
  all_day_end: nullableCalendarDate.optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== "expected_revision"), {
  message: "At least one editable field is required",
});

export const submitProducerFestivalSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  representation_acknowledged: z.literal(true),
  accuracy_acknowledged: z.literal(true),
  terms_acknowledged: z.literal(true),
  terms_version: z.literal(PRODUCER_TERMS_VERSION),
}).strict();

export const assetMetadataSchema = z.object({
  purpose: z.enum(["logo", "hero_image", "gallery_image"]),
  alt_text: requiredText(500),
  rights_acknowledged: z.literal("true"),
  rights_version: z.literal(String(ASSET_RIGHTS_VERSION)),
}).strict();

export const completeFestivalSchema = z.object({
  name: requiredText(200),
  description: requiredText(10000).min(20),
  location: requiredText(500),
  city: requiredText(100),
  state: requiredText(2).regex(/^[A-Z]{2}$/),
  zip_code: requiredText(10).regex(/^\d{5}(?:-\d{4})?$/),
  contact_name: requiredText(200),
  contact_email: z.string().trim().max(254).email(),
  calendar_date_type: z.enum(["timed", "all_day"]),
  time_zone: z.literal(PRODUCER_TIME_ZONE),
  start_date: z.date().nullable(),
  end_date: z.date().nullable(),
  all_day_start: z.date().nullable(),
  all_day_end: z.date().nullable(),
}).superRefine((festival, context) => {
  if (festival.calendar_date_type === "timed") {
    if (!festival.start_date || !festival.end_date || festival.end_date <= festival.start_date) {
      context.addIssue({ code: "custom", path: ["end_date"], message: "Timed festivals require an end after the start" });
    }
    if (festival.all_day_start || festival.all_day_end) {
      context.addIssue({ code: "custom", path: ["all_day_start"], message: "Timed festivals cannot include all-day dates" });
    }
  } else {
    if (!festival.all_day_start || !festival.all_day_end || festival.all_day_end < festival.all_day_start) {
      context.addIssue({ code: "custom", path: ["all_day_end"], message: "All-day festivals require a valid inclusive date range" });
    }
    /* Timed values are permitted on an all-day festival only as the derived mirror of its
     * all-day range. Public discovery sorts and filters on `start_date`, so all-day festivals
     * must carry one — but it may not disagree with the all-day dates it is derived from. */
    const mirror = allDayTimedMirror(festival.all_day_start, festival.all_day_end);
    const mismatched = (value, expected) =>
      Boolean(value) && (!expected || new Date(value).getTime() !== expected.getTime());
    if (mismatched(festival.start_date, mirror.start_date) || mismatched(festival.end_date, mirror.end_date)) {
      context.addIssue({
        code: "custom",
        path: ["start_date"],
        message: "All-day festivals may only carry timed dates derived from their all-day range",
      });
    }
  }
});
