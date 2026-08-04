import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationUpdateMany: vi.fn(),
  notificationFindUnique: vi.fn(),
  reconciliationCreate: vi.fn(),
  reconciliationUpdateMany: vi.fn(),
  reconciliationFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    producerSubmissionNotification: {
      updateMany: mocks.notificationUpdateMany,
      findUnique: mocks.notificationFindUnique,
    },
    festivalAssetReconciliation: {
      create: mocks.reconciliationCreate,
      updateMany: mocks.reconciliationUpdateMany,
      findUnique: mocks.reconciliationFindUnique,
    },
  },
}));

import { producerSubmissionRepository } from "@/features/producer-submission/producer-submission-repository";

beforeEach(() => vi.clearAllMocks());

describe("producer submission repository operations", () => {
  it("claims notification attempts only through ProducerSubmissionNotification", async () => {
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.notificationFindUnique.mockResolvedValue({ id: "notification-id" });
    const attemptedAt = new Date("2026-08-04T12:00:00.000Z");
    await expect(producerSubmissionRepository.claimSubmissionNotification({
      festivalId: "festival-id",
      workflowRevision: 3,
      notificationType: "producer_receipt",
      attemptToken: "attempt-token",
      attemptedAt,
      staleBefore: new Date("2026-08-04T11:55:00.000Z"),
    })).resolves.toEqual({ id: "notification-id" });
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ attempt_token: "attempt-token", attempt_started_at: attemptedAt }),
    }));
    expect(mocks.notificationFindUnique).toHaveBeenCalledWith({ where: { attempt_token: "attempt-token" } });
  });

  it("persists and conditionally claims restricted orphan reconciliation records", async () => {
    const attemptedAt = new Date("2026-08-04T12:00:00.000Z");
    mocks.reconciliationCreate.mockResolvedValue({ id: "record-id" });
    await producerSubmissionRepository.recordFailedAssetCleanup({
      marker: "opaque-marker",
      providerFileId: "provider-file-id",
      serverFilename: "server-file.png",
      checksumSha256: "a".repeat(64),
      attemptedAt,
    });
    expect(mocks.reconciliationCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      reconciliation_marker: "opaque-marker",
      provider_file_id: "provider-file-id",
      cleanup_status: "failed",
      cleanup_attempts: 1,
    }) });

    mocks.reconciliationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.reconciliationFindUnique.mockResolvedValue({ id: "record-id", provider_file_id: "provider-file-id" });
    await producerSubmissionRepository.claimAssetReconciliation({ marker: "opaque-marker", attemptedAt });
    expect(mocks.reconciliationUpdateMany).toHaveBeenCalledWith({
      where: { reconciliation_marker: "opaque-marker", cleanup_status: { in: ["pending", "failed"] } },
      data: expect.objectContaining({ cleanup_status: "retrying", cleanup_attempts: { increment: 1 } }),
    });
    expect(mocks.reconciliationFindUnique).toHaveBeenCalledWith({ where: { reconciliation_marker: "opaque-marker" } });
  });
});
