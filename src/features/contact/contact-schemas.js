import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email address").max(254),
  message: z.string().min(1, "Message is required").max(4000),
});
