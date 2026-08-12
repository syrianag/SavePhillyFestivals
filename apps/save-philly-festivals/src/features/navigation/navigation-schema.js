import { z } from "zod";

export const NAVIGATION_JSON_BODY_LIMIT = 16 * 1024;

export const navigationPlacementSchema = z.enum(["header", "footer"]);

/**
 * Routes that must never appear in public navigation.
 *
 * `/admin` covers the whole portal. `/producer/` — with the trailing slash — covers the producer
 * portal while leaving `/producer`, the public marketing page, reachable. That one character is
 * the entire distinction, which is why it gets its own test.
 *
 * This guard used to live in a source-text contract test that read the hardcoded arrays. Once
 * links became editable that test could no longer see them, so the rule moved here, where it
 * applies to whatever an admin types rather than only to what a developer committed.
 */
export function isPrivateHref(href) {
  const value = String(href ?? "").trim();
  return value === "/admin" || value.startsWith("/admin/") || value.startsWith("/producer/");
}

/* Same-origin paths, or https. The CSP forbids external script and style origins and the site is
 * https-only, so an `http://` or `javascript:` destination is either broken or hostile. */
const hrefSchema = z.string().trim().min(1).max(2000)
  .refine((value) => value.startsWith("/") || value.startsWith("https://"), "Use a site path starting with / or an https:// URL")
  .refine((value) => !isPrivateHref(value), "Private admin and producer portal links cannot appear in public navigation");

/* Declared without `.default()` so the update variant can tell "field omitted" from "field set to
 * its default" — the bug that let an empty PATCH silently reset a sponsor's status and order. */
const navigationLinkFields = {
  placement: navigationPlacementSchema,
  section: z.string().trim().max(80).nullable().optional(),
  label: z.string().trim().min(1).max(80),
  href: hrefSchema,
  sort_order: z.number().int().min(0).max(9999),
  visible: z.boolean(),
};

export const createNavigationLinkSchema = z.object({
  ...navigationLinkFields,
  sort_order: z.number().int().min(0).max(9999).default(0),
  visible: z.boolean().default(true),
}).strict();

export const updateNavigationLinkSchema = z.object(
  Object.fromEntries(Object.entries(navigationLinkFields).map(([key, schema]) => [key, schema.optional()])),
).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field is required",
});

export const listNavigationLinksQuerySchema = z.object({
  placement: navigationPlacementSchema.optional(),
}).strict();

/* Reordering submits the whole visible ordering at once. Per-item PATCHes can interleave and
 * settle into an order the admin never chose. */
export const reorderNavigationLinksSchema = z.object({
  order: z.array(z.uuid()).min(1).max(200).refine(
    (ids) => new Set(ids).size === ids.length,
    "Each link may appear only once in the ordering",
  ),
}).strict();

export const navigationLinkIdSchema = z.uuid();
