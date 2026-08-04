import { z } from "zod";

export const CALENDAR_EXPORT_SELECTION_VERSION = 1;
export const MAX_CALENDAR_EXPORT_ITEMS = 100;

const calendarExportItemSchema = z
  .object({
    type: z.enum(["festival", "event"]),
    id: z
      .string()
      .trim()
      .min(1, "Selection ID is required")
      .max(128, "Selection ID is too long")
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Selection ID contains invalid characters"),
  })
  .strict();

export const calendarExportRequestSchema = z
  .object({
    selection: z
      .object({
        version: z.literal(CALENDAR_EXPORT_SELECTION_VERSION),
        items: z.array(calendarExportItemSchema).min(1).max(MAX_CALENDAR_EXPORT_ITEMS),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ selection }, context) => {
    const seen = new Set();
    selection.items.forEach((item, index) => {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["selection", "items", index],
          message: "Duplicate calendar selection",
        });
      }
      seen.add(key);
    });
  });

export { calendarExportItemSchema };
