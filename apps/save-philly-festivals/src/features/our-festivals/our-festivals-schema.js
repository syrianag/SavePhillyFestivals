import { z } from "zod";

export const OUR_FESTIVALS_JSON_BODY_LIMIT = 16 * 1024;

/* Recommended source dimensions, surfaced in the admin editor so curators size artwork before
 * upload rather than discovering the crop after publishing. Exported so the UI hint and the
 * validation bounds can never drift apart. */
export const OUR_FESTIVALS_IMAGE_GUIDANCE = Object.freeze({
  aspectRatio: "3:2",
  minWidth: 1200,
  minHeight: 800,
  displayHint: "Best results: 3:2 landscape images, at least 1200×800. Wider or taller images are center-cropped.",
});

export const ourFestivalItemIdSchema = z.uuid();
export const ourFestivalItemStatusSchema = z.enum(["draft", "published", "archived"]);

/* Two accepted image sources, matching what the CSP actually permits (`img-src https:` plus
 * same-origin). A relative path lets a curator reuse an already-approved festival asset served
 * by /api/public/assets/[id] instead of re-hosting it somewhere public. */
const imageUrl = z.string().trim().min(1).max(2000).refine(
  (value) => value.startsWith("https://") || value.startsWith("/api/public/assets/"),
  "Use an https:// URL or an existing /api/public/assets/ path",
);

/* Declared without `.default()` so the update variant can distinguish "field omitted" from
 * "field set to its default". Defaults are applied only by the create schema below — an update
 * that inherited them would parse `{}` into `{status, sort_order}` and silently reset both. */
const ourFestivalItemFields = {
  title: z.string().trim().min(1).max(200),
  caption: z.string().trim().max(2000).nullable().optional(),
  festival_id: z.uuid().nullable().optional(),
  image_url: imageUrl,
  image_width: z.number().int().min(1).max(10000).nullable().optional(),
  image_height: z.number().int().min(1).max(10000).nullable().optional(),
  alt_text: z.string().trim().min(1, "Alt text is required so the gallery works with a screen reader").max(500),
  status: ourFestivalItemStatusSchema,
  sort_order: z.number().int().min(0).max(9999),
};

export const createOurFestivalItemSchema = z.object({
  ...ourFestivalItemFields,
  status: ourFestivalItemStatusSchema.default("draft"),
  sort_order: z.number().int().min(0).max(9999).default(0),
}).strict();

export const updateOurFestivalItemSchema = z.object(
  Object.fromEntries(Object.entries(ourFestivalItemFields).map(([key, schema]) => [key, schema.optional()])),
).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field is required",
});

export const listOurFestivalItemsQuerySchema = z.object({
  status: ourFestivalItemStatusSchema.optional(),
}).strict();

/* Drag-and-drop reordering submits the whole visible ordering in one request. Sending the full
 * list rather than a single moved item keeps the result deterministic: a per-item PATCH storm
 * can interleave and settle into an order the curator never chose. */
export const reorderOurFestivalItemsSchema = z.object({
  order: z.array(z.uuid()).min(1).max(500).refine(
    (ids) => new Set(ids).size === ids.length,
    "Each item may appear only once in the ordering",
  ),
}).strict();
