import { z } from "zod";

export const PRODUCER_APPLICATION_JSON_BODY_LIMIT = 32 * 1024;

/* One public, unauthenticated endpoint creates a user *and* a festival, so every field is
 * bounded and the object is strict. The limits mirror `registrationSchema` and the festival
 * columns they land in. */

const optionalText = (max) => z.string().trim().max(max).optional();

export const producerApplicationSchema = z.object({
  /* Applicant account. Mirrors `registrationSchema` exactly — length over composition rules,
   * capped at bcrypt's 72-byte truncation point. */
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(72),

  /* Producer profile. */
  organization: optionalText(200),
  bio: optionalText(2000),
  contact_phone: optionalText(50),

  /* Proposed festival. Only the name is required — an applicant should not be blocked from
   * applying because they have not fixed a date yet. */
  festival_name: z.string().trim().min(1).max(200),
  festival_description: optionalText(5000),
  festival_location: optionalText(300),
  festival_city: optionalText(120),
  festival_zip_code: optionalText(20),
  festival_website_url: z.string().trim().url().max(2000).refine(
    (value) => value.startsWith("https://"),
    "Use an https:// URL",
  ).optional(),
  festival_start_date: z.iso.datetime().optional(),
  festival_end_date: z.iso.datetime().optional(),

  /* Explicit consent, matching the acknowledgements the producer submission flow already
   * records. An application is a representation that the applicant may speak for the event. */
  representation_acknowledged: z.literal(true),
  accuracy_acknowledged: z.literal(true),
  terms_acknowledged: z.literal(true),
}).strict().superRefine((value, context) => {
  if (
    value.festival_start_date && value.festival_end_date
    && new Date(value.festival_end_date) < new Date(value.festival_start_date)
  ) {
    context.addIssue({
      code: "custom",
      path: ["festival_end_date"],
      message: "The end date must fall on or after the start date",
    });
  }
});
