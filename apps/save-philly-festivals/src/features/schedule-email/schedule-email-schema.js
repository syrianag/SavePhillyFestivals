import { z } from "zod";

export const SCHEDULE_EMAIL_VERSION = 1;
export const MAX_SCHEDULE_EMAIL_ITEMS = 100;

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address")
  .max(254, "Email address is too long")
  .email("Enter a valid email address")
  .transform((email) => email.toLowerCase());

const scheduleEmailItemSchema = z
  .object({
    type: z.enum(["festival", "event"]),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

export const scheduleEmailRequestSchema = z
  .object({
    email: emailSchema,
    idempotency_key: z.uuid(),
    selection: z
      .object({
        version: z.literal(SCHEDULE_EMAIL_VERSION),
        items: z.array(scheduleEmailItemSchema).min(1).max(MAX_SCHEDULE_EMAIL_ITEMS),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ selection }, context) => {
    const keys = new Set();
    selection.items.forEach((item, index) => {
      const key = `${item.type}:${item.id}`;
      if (keys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["selection", "items", index],
          message: "Duplicate schedule selection",
        });
      }
      keys.add(key);
    });
  });
