import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const workflowPath = "apps/n8n/OrganizerSubscriptions.json";
export const fixturesPath = "apps/n8n/fixtures/organizer-subscriptions";

function walk(value, visit, path = []) {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((entry, index) => walk(entry, visit, [...path, index]));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => walk(entry, visit, [...path, key]));
}

export function validateOrganizerWorkflow(workflow) {
  assert.equal(workflow.active, false, "Organizer workflow must remain inactive");
  assert.equal(workflow.settings?.availableInMCP, false);
  assert.equal(workflow.id, undefined);
  assert.equal(workflow.meta, undefined);
  walk(workflow, (value, path) => {
    const key = path.at(-1);
    assert.notEqual(key, "credentials", `Credential references are forbidden: ${path.join(".")}`);
    if (typeof value === "string") {
      assert.doesNotMatch(value, /(?:api[_-]?key|secret)["']?\s*[:=]\s*["'][A-Za-z0-9_-]{16,}/i);
      assert.doesNotMatch(value, /https?:\/\/(?!.*\$env)/i, `Literal URL is forbidden: ${path.join(".")}`);
    }
  });
  const byName = (name) => workflow.nodes.find((node) => node.name === name);
  assert.ok(byName("Claim Authorized Work"));
  assert.ok(byName("Report Completion"));
  assert.ok(byName("Report Redacted Failure"));
  assert.match(byName("Claim Authorized Work").parameters.url, /SPF_APP_BASE_URL/);
  assert.match(JSON.stringify(workflow), /N8N_ORGANIZER_OUTBOX_SECRET/);
  assert.equal(byName("Organizer Provider Adapter (CONFIGURE BEFORE ACTIVATION)").onError, "continueErrorOutput");
  assert.match(byName("Organizer Provider Adapter (CONFIGURE BEFORE ACTIVATION)").parameters.jsCode, /not_configured/);
  return workflow;
}

export function evaluateOrganizerFixture(fixture) {
  const input = fixture.input;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || "")) return { status: "rejected", reason: "invalid_email" };
  if (!input.authorization_enabled || input.authorization_status !== "authorized" || input.consent_revoked) return { status: "suppressed", reason: "not_authorized" };
  if (input.prior_status === "completed" || input.lease_replayed) return { status: "rejected", reason: "invalid_or_expired_lease" };
  const outcomes = fixture.simulation?.outcomes || ["success"];
  let attempts = input.attempts || 0;
  let completed = 0;
  let failed = 0;
  for (const outcome of outcomes) {
    if (attempts >= input.max_attempts) break;
    attempts += 1;
    if (outcome === "success") completed += 1;
    if (outcome === "permanent_failure") failed += 1;
  }
  const status = completed ? (failed ? "partial" : "completed") : failed ? "failed" : attempts >= input.max_attempts ? "failed" : "pending";
  return { status, attempts, completed, failed };
}

export async function validateOrganizerRepository(root = process.cwd()) {
  const workflow = JSON.parse(await readFile(resolve(root, workflowPath), "utf8"));
  validateOrganizerWorkflow(workflow);
  const names = (await readdir(resolve(root, fixturesPath))).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(names, ["bounded-retry.json", "duplicate-replay.json", "invalid-email.json", "partial-permanent-failure.json", "revoked-authorization.json", "success.json"]);
  const fixtures = await Promise.all(names.map(async (name) => JSON.parse(await readFile(resolve(root, fixturesPath, name), "utf8"))));
  return { workflow, fixtures };
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invoked) {
  const { workflow, fixtures } = await validateOrganizerRepository();
  console.log(`Validated inactive ${workflow.name} and ${fixtures.length} organizer fixtures; no external calls were made.`);
}
