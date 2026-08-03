import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.string().min(1, "Note is required").max(2000),
  entity_type: z.string().min(1, "entity_type is required"),
  entity_id: z.string().min(1, "entity_id is required"),
  author_email: z.string().email().optional().nullable(),
});
