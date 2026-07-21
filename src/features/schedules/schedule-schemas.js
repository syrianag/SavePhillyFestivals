import { z } from "zod";

export const createScheduleSchema = z.object({
  festival_id: z.string().uuid("Invalid festival ID"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  start_time: z.string().datetime("Invalid start time"),
  end_time: z.string().datetime("Invalid end time"),
  performer: z.string().optional(),
  genre: z.string().optional(),
  is_headliner: z.boolean().optional().default(false),
});

export const updateScheduleSchema = createScheduleSchema.partial().omit({
  festival_id: true,
});

export const savedScheduleSchema = z.object({
  email: z.string().email("Invalid email"),
  schedule_id: z.string().uuid("Invalid schedule ID"),
});
