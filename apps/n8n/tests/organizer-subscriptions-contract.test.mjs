import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOrganizerFixture, validateOrganizerRepository, validateOrganizerWorkflow } from "../../../tools/scripts/validate-organizer-subscriptions-workflow.mjs";

const repository = await validateOrganizerRepository();

test("organizer workflow is inactive, sanitized, and bounded by app claim/report APIs", () => {
  assert.doesNotThrow(() => validateOrganizerWorkflow(repository.workflow));
});

for (const fixture of repository.fixtures) {
  test(`organizer fixture: ${fixture.name}`, () => {
    assert.deepEqual(evaluateOrganizerFixture(fixture), fixture.expected);
  });
}
