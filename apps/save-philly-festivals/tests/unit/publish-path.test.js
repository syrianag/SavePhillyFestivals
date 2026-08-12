import { describe, expect, it, vi } from "vitest";

import { pathToPublished, PUBLISH_PATH } from "@/features/editorial-workflow/publish-path";
import { WORKFLOW_NOTIFICATION_SUPPRESSED_CODE } from "@/features/editorial-workflow/editorial-notifications";
import { retryWorkflowNotification } from "@/features/editorial-workflow/editorial-service";

describe("pathToPublished", () => {
  it("walks the full workflow from draft", () => {
    expect(pathToPublished("draft")).toEqual(["pending_review", "approved", "published"]);
  });

  /* Resume support: a re-run of a partially completed batch starts mid-path. */
  it("resumes from wherever a festival already is", () => {
    expect(pathToPublished("pending_review")).toEqual(["approved", "published"]);
    expect(pathToPublished("approved")).toEqual(["published"]);
  });

  it("has nothing to do for an already-published festival", () => {
    expect(pathToPublished("published")).toEqual([]);
  });

  /**
   * The bug this function exists to prevent. `unpublished` is not a member of PUBLISH_PATH, so
   * `PUBLISH_PATH.indexOf("unpublished")` is -1 and naive index arithmetic would attempt
   * `unpublished -> pending_review`, which the workflow graph trigger rejects. The real edge is
   * a single hop straight to published.
   */
  it("republishes unpublished in exactly one hop, and only when opted in", () => {
    expect(pathToPublished("unpublished")).toBeNull();
    expect(pathToPublished("unpublished", { includeUnpublished: false })).toBeNull();
    expect(pathToPublished("unpublished", { includeUnpublished: true })).toEqual(["published"]);
    expect(PUBLISH_PATH).not.toContain("unpublished");
  });

  /* A human declined these. A bulk job must not overrule that, and unlike `unpublished` there is
   * deliberately no opt-in. */
  it("never publishes a rejected festival", () => {
    expect(pathToPublished("rejected")).toBeNull();
    expect(pathToPublished("rejected", { includeUnpublished: true })).toBeNull();
  });

  it("refuses states outside the workflow", () => {
    expect(pathToPublished("archived")).toBeNull();
    expect(pathToPublished("canceled")).toBeNull();
    expect(pathToPublished("changes_requested")).toBeNull();
  });

  it("returns a fresh array so a caller cannot mutate the shared path", () => {
    const hops = pathToPublished("draft");
    hops.push("archived");
    expect(pathToPublished("draft")).toEqual(["pending_review", "approved", "published"]);
  });
});

describe("retryWorkflowNotification refuses suppressed rows", () => {
  /**
   * Bulk runs publish hundreds of imported festivals whose contact address came from the source
   * spreadsheet. Nothing sends during the run, but the admin retry button would deliver the
   * outbox rows afterwards — one click, hundreds of unsolicited emails. The rows also carry
   * `attempts` at the cap so `claimNotification` cannot lease them; this is the legible half.
   */
  it("throws rather than delivering a bulk_publish_suppressed notification", async () => {
    const repository = {
      findNotificationForRetry: vi.fn().mockResolvedValue({
        festival: { name: "Odunde" },
        transition: { to_state: "published", producer_message: null },
        recipientEmail: "organizer@example.com",
        failureCode: WORKFLOW_NOTIFICATION_SUPPRESSED_CODE,
      }),
      claimNotification: vi.fn(),
    };

    await expect(retryWorkflowNotification("festival-1", "note-1", { repository }))
      .rejects.toMatchObject({ code: "notification_suppressed" });

    /* Never reaches the delivery path at all. */
    expect(repository.claimNotification).not.toHaveBeenCalled();
  });

  it("still allows retrying an ordinary failed notification", async () => {
    const repository = {
      findNotificationForRetry: vi.fn().mockResolvedValue({
        festival: { name: "Odunde" },
        transition: { to_state: "published", producer_message: null },
        recipientEmail: "organizer@example.com",
        failureCode: "provider_unconfigured",
      }),
      claimNotification: vi.fn().mockResolvedValue(null),
    };

    await expect(retryWorkflowNotification("festival-1", "note-1", { repository })).resolves.toBeDefined();
    expect(repository.claimNotification).toHaveBeenCalled();
  });
});
