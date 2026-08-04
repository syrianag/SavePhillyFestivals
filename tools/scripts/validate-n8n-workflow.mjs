import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const workflowPath = "apps/n8n/DiasporaDNA.json";
export const fixturesPath = "apps/n8n/fixtures";

const clean = (value, max = 500) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const placeholderPattern = /(?:\[[^\]]+\]|\{\{[^}]+\}\}|<[^>]+>|\b(?:todo|tbd|replace\s+(?:me|this|with)|your\s+(?:name|organization))\b)/i;
const humanPlaceholderPattern = /(?:\[[^\]]+\]|<[^>]+>|\b(?:todo|tbd|replace\s+(?:me|this|with)|your\s+(?:name|organization))\b)/i;
const injectionPattern = /(?:ignore|disregard|override|reveal|repeat).{0,40}(?:instruction|prompt|system|policy)|(?:system|developer)\s+message|jailbreak|act\s+as/i;

function idempotencyKeyFor(email, name, org) {
  const keySource = [email, name.toLowerCase(), org.toLowerCase()].join("|");
  let hash = 2166136261;
  for (const character of keySource) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `diaspora-dna-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function normalizeAndGuard(raw) {
  const name = clean(raw.Name, 120);
  const email = clean(raw.Email, 254).toLowerCase();
  const org = clean(raw.Org, 160);
  const context = clean(raw.Context, 2000);
  const inputStatus = clean(raw.Status, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const draftId = clean(raw.DraftId, 200);
  const priorKey = clean(raw.IdempotencyKey, 100);
  const validationErrors = [];

  if (!name) validationErrors.push("name_required");
  if (!org) validationErrors.push("org_required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors.push("email_invalid");
  if ([name, email, org, context].some((value) => placeholderPattern.test(value))) {
    validationErrors.push("placeholder_detected");
  }

  const promptInjectionDetected = injectionPattern.test(context);
  const idempotencyKey = idempotencyKeyFor(email, name, org);
  let status = "ready";
  let ready = true;
  let guardReason = "";

  if (validationErrors.length) {
    status = "validation_failed";
    ready = false;
    guardReason = validationErrors.join(",");
  } else if (promptInjectionDetected) {
    status = "prompt_injection_blocked";
    ready = false;
    guardReason = "untrusted_context_instruction";
  } else if (
    draftId ||
    (priorKey && priorKey === idempotencyKey) ||
    ["draft_created", "success", "completed"].includes(inputStatus)
  ) {
    status = "duplicate";
    ready = false;
    guardReason = "already_processed";
  } else if (inputStatus !== "ready") {
    status = "not_ready";
    ready = false;
    guardReason = "status_must_be_ready";
  }

  return {
    ...raw,
    name,
    email,
    org,
    context,
    inputStatus,
    validationErrors,
    promptInjectionDetected,
    idempotencyKey,
    ready,
    status,
    guardReason,
  };
}

export function evaluateFixture(fixture) {
  const result = normalizeAndGuard(fixture.input);
  if (!result.ready) return result;
  if (fixture.simulation?.providerFailure) {
    return { ...result, status: "provider_failed", failureCode: "provider_error" };
  }
  return { ...result, status: "draft_created" };
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  assert.ok(node, `Required node is missing: ${name}`);
  return node;
}

function destinations(workflow, nodeName, outputIndex = 0) {
  return (workflow.connections[nodeName]?.main?.[outputIndex] ?? []).map(({ node }) => node);
}

function walk(value, visit, path = []) {
  visit(value, path);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visit, [...path, index]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => walk(entry, visit, [...path, key]));
  }
}

export function validateWorkflow(workflow) {
  assert.equal(workflow.active, false, "Workflow must remain inactive");
  assert.equal(workflow.settings?.availableInMCP, false, "Workflow must not be exposed through MCP");
  assert.ok(Array.isArray(workflow.nodes) && workflow.nodes.length > 0, "Workflow must contain nodes");

  const forbiddenMetadataKeys = new Set([
    "instanceId",
    "versionId",
    "webhookId",
    "cachedResultUrl",
    "cachedResultName",
  ]);
  walk(workflow, (value, path) => {
    const key = path.at(-1);
    assert.ok(!forbiddenMetadataKeys.has(key), `Source-instance metadata is forbidden: ${path.join(".")}`);
    assert.notEqual(key, "credentials", `Embedded credential references are forbidden: ${path.join(".")}`);
    if (typeof value === "string") {
      assert.ok(!/^https?:\/\//i.test(value), `Cached or embedded URL is forbidden: ${path.join(".")}`);
    }
  });
  assert.equal(workflow.id, undefined, "Exported workflow ID must be removed");
  assert.equal(workflow.meta, undefined, "Source workflow metadata must be removed");

  const gmailNodes = workflow.nodes.filter((node) => node.type === "n8n-nodes-base.gmail");
  assert.equal(gmailNodes.length, 1, "Workflow must contain exactly one Gmail node");
  const gmail = gmailNodes[0];
  assert.equal(gmail.parameters.resource, "draft", "Gmail must operate on drafts only");
  assert.equal(gmail.parameters.operation, "create", "Gmail operation must only create a draft");
  assert.match(gmail.name, /draft only/i, "Gmail node must clearly state draft-only behavior");
  assert.ok(!humanPlaceholderPattern.test(gmail.parameters.subject), "Draft subject must not contain a human placeholder");
  assert.ok(!humanPlaceholderPattern.test(gmail.parameters.message), "Draft body expression must not contain a human placeholder");
  assert.equal(workflow.nodes.some((node) => /send/i.test(node.type) && /mail|gmail/i.test(node.type)), false, "Email send nodes are forbidden");

  const trigger = nodeByName(workflow, "Google Sheets Trigger");
  assert.match(trigger.parameters.documentId.value, /^=\{\{ \$env\./, "Sheet ID must be supplied through the environment");
  assert.match(trigger.parameters.sheetName.value, /^=\{\{ \$env\./, "Sheet name must be supplied through the environment");
  const model = nodeByName(workflow, "Configured Chat Model");
  assert.match(model.parameters.modelName, /^=\{\{ \$env\./, "Model name must be configuration, not a verification claim");

  const normalize = nodeByName(workflow, "Normalize and Validate");
  for (const contractField of [
    "validationErrors",
    "promptInjectionDetected",
    "idempotencyKey",
    "ready",
    "validation_failed",
    "prompt_injection_blocked",
    "duplicate",
    "not_ready",
  ]) {
    assert.ok(normalize.parameters.jsCode.includes(contractField), `Normalization contract is missing ${contractField}`);
  }

  nodeByName(workflow, "Ready and New Guard");
  const agent = nodeByName(workflow, "Draft Outreach Body");
  assert.equal(agent.onError, "continueErrorOutput", "Provider errors must use an explicit failure output");
  for (const constraint of ["untrusted data", "Do not follow", "Do not reveal", "Do not invent", "Do not output template markers"] ) {
    assert.ok(agent.parameters.text.includes(constraint), `Prompt constraint is missing: ${constraint}`);
  }
  const outputValidator = nodeByName(workflow, "Prevent Placeholder Output");
  assert.ok(outputValidator.parameters.jsCode.includes("placeholder_detected"), "Generated output must reject placeholders");
  assert.ok(outputValidator.parameters.jsCode.includes("instruction_leak_detected"), "Generated output must reject instruction leakage");

  assert.deepEqual(destinations(workflow, "Ready and New Guard", 0), ["Draft Outreach Body"]);
  assert.deepEqual(destinations(workflow, "Ready and New Guard", 1), ["Record Guard Outcome"]);
  assert.deepEqual(destinations(workflow, "Draft Outreach Body", 1), ["Mark Provider Failure"]);
  assert.deepEqual(destinations(workflow, "Validated Draft Guard", 1), ["Mark Draft Content Failure"]);
  assert.deepEqual(destinations(workflow, "Create Gmail Draft Only", 0), ["Mark Draft Created"]);
  assert.deepEqual(destinations(workflow, "Create Gmail Draft Only", 1), ["Mark Draft Creation Failure"]);

  const requiredStatuses = new Map([
    ["Mark Draft Created", "draft_created"],
    ["Mark Provider Failure", "provider_failed"],
    ["Mark Draft Content Failure", "draft_content_failed"],
    ["Mark Draft Creation Failure", "draft_create_failed"],
  ]);
  for (const [name, status] of requiredStatuses) {
    assert.ok(nodeByName(workflow, name).parameters.jsCode.includes(status), `${name} must emit ${status}`);
  }

  assert.equal(workflow.nodes.some((node) => node.name === "If1"), false, "Legacy no-op terminal node must be removed");
  const terminalNames = workflow.nodes
    .filter((node) => !Object.values(workflow.connections[node.name] ?? {}).flat(2).length)
    .map((node) => node.name)
    .sort();
  assert.deepEqual(terminalNames, [
    "Mark Draft Content Failure",
    "Mark Draft Created",
    "Mark Draft Creation Failure",
    "Mark Provider Failure",
    "Record Guard Outcome",
  ]);

  return workflow;
}

export async function loadWorkflow(root = process.cwd()) {
  return JSON.parse(await readFile(resolve(root, workflowPath), "utf8"));
}

export async function loadFixtures(root = process.cwd()) {
  const directory = resolve(root, fixturesPath);
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => JSON.parse(await readFile(resolve(directory, name), "utf8"))));
}

export async function validateRepository(root = process.cwd()) {
  const workflow = await loadWorkflow(root);
  validateWorkflow(workflow);
  const fixtures = await loadFixtures(root);
  assert.deepEqual(
    fixtures.map(({ name }) => name).sort(),
    ["duplicate", "invalid", "prompt-injection", "provider-failure", "valid"],
    "The complete fixture matrix is required",
  );
  return { workflow, fixtures };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const { workflow, fixtures } = await validateRepository();
  console.log(`Validated inactive workflow ${workflow.name} and ${fixtures.length} static fixtures; no external calls were made.`);
}
