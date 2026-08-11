import { z } from "zod";

/* Shared by the producer submission and editorial workflow HTTP layers so a producer's address
 * confirmation and an editor's cannot drift into two different request shapes. */
export const LOCATION_LOOKUP_JSON_BODY_LIMIT = 4 * 1024;

export const locationLookupRequestSchema = z.object({
  location: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).optional(),
}).strict();
