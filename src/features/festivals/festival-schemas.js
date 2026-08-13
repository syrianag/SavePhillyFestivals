import { z } from "zod";

export const createFestivalSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional().default("Philadelphia"),
  state: z.string().optional().default("PA"),
  zip_code: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  submitted_by: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("A valid contact email is required"),
  contact_phone: z.string().optional(),
  story: z.string().optional(),
  mission: z.string().optional(),
  history: z.string().optional(),
  host_name: z.string().optional(),
  host_title: z.string().optional(),
  host_about: z.string().optional(),
  host_social: z.string().url().optional().or(z.literal("")),
  social_instagram: z.string().optional(),
  social_facebook: z.string().optional(),
  social_twitter: z.string().optional(),
  social_tiktok: z.string().optional(),
  social_youtube: z.string().optional(),
  festival_age: z.string().optional(),
  festival_age_details: z.string().optional(),
  org_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const updateFestivalSchema = createFestivalSchema.partial();

export const approveFestivalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});
