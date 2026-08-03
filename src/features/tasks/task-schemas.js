import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().optional().nullable(),
  assignee_email: z.string().email().optional().nullable().or(z.literal("")),
  festival_id: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();
