import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FESTIVAL_TRANSITIONS, validTransitions } from "../../src/features/editorial-workflow/editorial-transition-policy";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

describe("F-08 replacement for legacy moderation", () => {
  it("retires direct approve/reject and hard-delete paths", () => {
    expect(read("src/app/api/festivals/[id]/approve/route.js")).toContain("status: 410");
    const legacy = read("src/app/api/festivals/[id]/route.js");
    expect(legacy).toContain("Legacy festival mutation is retired");
    expect(legacy).toContain("hard-delete is disabled");
    expect(read("src/features/festivals/festival-queries.js")).not.toContain("approveFestival(");
  });

  it("keeps approval separate from publication", () => {
    expect(validTransitions("pending_review")).toContain("approved");
    expect(validTransitions("pending_review")).not.toContain("published");
    expect(FESTIVAL_TRANSITIONS.approved).toContain("published");
  });

  it("uses one central optimistic service for audit, snapshot, outbox, and delivery", () => {
    const repository = read("src/features/editorial-workflow/editorial-repository.js");
    const service = read("src/features/editorial-workflow/editorial-service.js");
    expect(repository).toContain("workflow_state: fromState, revision: expectedRevision");
    expect(repository).toContain("festivalTransition.create");
    expect(repository).toContain("festivalRevision.create");
    expect(repository).toContain("festivalWorkflowNotification.create");
    expect(service.indexOf("repository.transition")).toBeLessThan(service.lastIndexOf("deliverWorkflowNotification"));
  });
});
