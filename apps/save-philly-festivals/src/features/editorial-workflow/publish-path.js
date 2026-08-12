/**
 * The workflow hops a festival must take to reach `published`.
 *
 * Extracted from the bulk scripts so it can be tested directly: those scripts call `main()` at
 * module scope, so importing one to test its internals would run it.
 */

/** The ordered walk from `draft`. `draft` itself is the entry point, not a member. */
export const PUBLISH_PATH = Object.freeze(["pending_review", "approved", "published"]);

/**
 * Hops needed to reach `published`, `[]` when already there, or `null` when this state must not
 * be touched by a bulk job.
 *
 * `unpublished` gets its own single-hop branch rather than being folded into `PUBLISH_PATH`. It
 * is not on that path at all, so index arithmetic against it yields -1 and silently produces the
 * wrong walk — the original resume logic would have attempted `unpublished -> pending_review`,
 * which the workflow graph rejects.
 *
 * `rejected` returns null deliberately: a human declined it, and a bulk job must not overrule
 * that. Same reasoning as `unpublished`, except there is no opt-in for it.
 */
export function pathToPublished(state, { includeUnpublished = false } = {}) {
  if (state === "published") return [];
  if (state === "unpublished") return includeUnpublished ? ["published"] : null;
  if (state === "draft") return [...PUBLISH_PATH];
  const index = PUBLISH_PATH.indexOf(state);
  return index === -1 ? null : PUBLISH_PATH.slice(index + 1);
}
