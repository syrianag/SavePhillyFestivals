import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), updateMany: vi.fn(), transitionCreate: vi.fn(), transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    festival: {},
  },
}));

import { approveFestival } from "@/features/festivals/festival-queries";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique
    .mockResolvedValueOnce({ id: "festival-id", workflow_state: "pending_review", status: "pending", revision: 4 })
    .mockResolvedValueOnce({ id: "festival-id", workflow_state: "approved", status: "approved", revision: 5 });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.transitionCreate.mockResolvedValue({});
  mocks.transaction.mockImplementation((callback) => callback({
    festival: { findUnique: mocks.findUnique, updateMany: mocks.updateMany },
    festivalTransition: { create: mocks.transitionCreate },
  }));
});

describe("legacy admin moderation coherence", () => {
  it.each([
    ["approved", "approved", null],
    ["rejected", "rejected", "Needs a confirmed venue"],
  ])("conditionally maps %s status/workflow, increments revision, and appends actor transition", async (status, workflowState, reason) => {
    await approveFestival("festival-id", status, reason, "admin-user-id", 4);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "festival-id",
        workflow_state: "pending_review",
        status: "pending",
        revision: 4,
      },
      data: expect.objectContaining({ status, workflow_state: workflowState, revision: 5 }),
    });
    expect(mocks.transitionCreate).toHaveBeenCalledWith({ data: {
      festival_id: "festival-id", actor_user_id: "admin-user-id", from_state: "pending_review",
      to_state: workflowState, revision: 5, reason,
    } });
  });

  it.each([
    ["draft", "draft", 4],
    ["approved", "approved", 4],
    ["pending_review", "pending", 3],
    ["pending_review", "draft", 4],
  ])("forbids workflow=%s legacy=%s revision=%s", async (workflowState, legacyStatus, revision) => {
    mocks.findUnique.mockReset().mockResolvedValue({ id: "festival-id", workflow_state: workflowState, status: legacyStatus, revision });
    await expect(approveFestival("festival-id", "approved", null, "admin-user-id", 4)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.transitionCreate).not.toHaveBeenCalled();
  });

  it("rejects a concurrent updateMany miss without appending a transition", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(approveFestival("festival-id", "approved", null, "admin-user-id", 4)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.transitionCreate).not.toHaveBeenCalled();
  });

  it("requires an authenticated actor before opening a transaction", async () => {
    await expect(approveFestival("festival-id", "approved", null, null, 4)).rejects.toThrow(/actor/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
