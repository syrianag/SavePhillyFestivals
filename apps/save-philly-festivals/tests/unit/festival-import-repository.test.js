import { describe, expect, it, vi } from "vitest";

import { createFestivalImportRepository } from "@/features/festival-import/festival-import-repository";

const counts = { total: 1, ready: 0, imported: 1, duplicate: 0, quarantined: 0, failed: 0, warningIssues: 0, errorIssues: 0 };

describe("festival import terminal attempt fencing", () => {
  it.each(["markCompleted", "markFailed"])("rejects expired tokens in %s", async (method) => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const repository = createFestivalImportRepository({ $transaction: vi.fn(), festivalImportBatch: { updateMany } });
    const completedAt = new Date("2026-08-05T12:00:00.000Z");

    const operation = method === "markCompleted"
      ? repository.markCompleted("batch-1", counts, "attempt-1", completedAt)
      : repository.markFailed("batch-1", { code: "apply_failed" }, counts, "attempt-1", completedAt);

    await expect(operation).rejects.toMatchObject({ code: "stale_apply_attempt" });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "batch-1",
        status: "running",
        apply_attempt_token: "attempt-1",
        apply_attempt_expires_at: { gt: completedAt },
      },
    }));
  });
});
