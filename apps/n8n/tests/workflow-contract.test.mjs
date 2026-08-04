import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateFixture,
  validateRepository,
  validateWorkflow,
} from "../../../tools/scripts/validate-n8n-workflow.mjs";

const repository = await validateRepository();

test("workflow export satisfies the inactive, portable, draft-only contract", () => {
  assert.doesNotThrow(() => validateWorkflow(repository.workflow));
});

for (const fixture of repository.fixtures) {
  test(`fixture: ${fixture.name}`, () => {
    const actual = evaluateFixture(fixture);
    assert.equal(actual.status, fixture.expected.status);
    assert.equal(actual.ready, fixture.expected.ready);

    if (fixture.expected.normalizedEmail) {
      assert.equal(actual.email, fixture.expected.normalizedEmail);
    }
    if (fixture.expected.validationErrors) {
      assert.deepEqual(actual.validationErrors, fixture.expected.validationErrors);
    }
    if (fixture.expected.guardReason) {
      assert.equal(actual.guardReason, fixture.expected.guardReason);
    }
    if (fixture.expected.failureCode) {
      assert.equal(actual.failureCode, fixture.expected.failureCode);
    }
  });
}

test("idempotency key blocks a repeated normalized recipient", () => {
  const input = {
    Name: "Maya Johnson",
    Email: "maya@community.org",
    Org: "Community Arts Network",
    Context: "Ordinary context.",
    Status: "ready",
  };
  const first = evaluateFixture({ input });
  const repeated = evaluateFixture({
    input: { ...input, IdempotencyKey: first.idempotencyKey },
  });

  assert.equal(repeated.ready, false);
  assert.equal(repeated.status, "duplicate");
  assert.equal(repeated.guardReason, "already_processed");
});

test("placeholder input is rejected before provider execution", () => {
  const result = evaluateFixture({
    input: {
      Name: "Maya Johnson",
      Email: "maya@community.org",
      Org: "Community Arts Network",
      Context: "Contact your organization for details.",
      Status: "ready",
    },
  });

  assert.equal(result.ready, false);
  assert.equal(result.status, "validation_failed");
  assert.ok(result.validationErrors.includes("placeholder_detected"));
});
