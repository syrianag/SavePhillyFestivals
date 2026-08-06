/**
 * Bulk-publish the festivals created by one festival import batch.
 *
 * Why this exists: `festival-import-repository.js` creates every imported festival as
 * `workflow_state: "draft"`, and public discovery (`publishedDiscoveryWhere`) returns only
 * `published` rows. A finished import is therefore invisible on the public site — search,
 * the calendar, and the festival grid all return nothing until each festival is transitioned
 * through to `published`. Doing that by hand for a ~400-row batch is not viable.
 *
 * This drives the real editorial service rather than issuing an UPDATE, so every festival
 * keeps its `FestivalTransition` rows and `FestivalRevision` snapshots. The workflow allows
 * no shortcut, so each festival takes three hops: draft -> pending_review -> approved ->
 * published.
 *
 * SAFETY — notifications are deliberately disabled.
 * Every transition writes a notification outbox row addressed to `festival.contact_email`,
 * which for imported festivals is the organizer's real address from the source spreadsheet.
 * Publishing a full batch with a live provider would send three unsolicited emails to every
 * organizer in the file. This script never passes a `notificationProvider`, so
 * `deliverWorkflowNotification` records `provider_unconfigured` and sends nothing. The outbox
 * rows are still written, so the audit trail stays intact. Do not "fix" this by wiring a
 * provider in.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Load the environment before importing anything that touches the database: `@/lib/db`
 * builds its Prisma client at module scope and throws when DATABASE_URL is absent. */
config({ path: [join(appRoot, ".env.local"), join(appRoot, ".env")], quiet: true });

const PUBLISH_PATH = Object.freeze(["pending_review", "approved", "published"]);
const EDITORIAL_ROLES = Object.freeze(["admin", "super_admin"]);
const CONTROLLED_ENVIRONMENTS = Object.freeze(["staging", "production"]);
const PRODUCTION_CONFIRMATION = "publish-festival-batch";

function usage() {
  return `Usage:
  festival-publish-batch.mjs dry-run --batch-id <uuid> [--environment local|test|staging|production]
  festival-publish-batch.mjs apply   --batch-id <uuid> --operator-user-id <uuid> [--environment ...] [--allow-controlled-target] [--confirmation ${PRODUCTION_CONFIRMATION}]

Publishes every festival created by an import batch: draft -> pending_review -> approved -> published.
Already-published festivals are skipped, so a partial run can be re-run safely.

Staging and production additionally require --allow-controlled-target; production also requires
--confirmation ${PRODUCTION_CONFIRMATION}. Local and test runs are restricted to a loopback test
database by src/lib/database-safety.js.

Organizer notifications are never sent. See the header comment in this file before changing that.
`;
}

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!["dry-run", "apply"].includes(mode)) fail("invalid_command", "Mode must be dry-run or apply");
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail("invalid_argument", `Unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    if (key === "allow_controlled_target") {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("missing_argument", `Missing value for --${token.slice(2)}`);
    options[key] = value;
    index += 1;
  }
  return { mode, options };
}

function required(options, name) {
  if (!options[name]) fail("missing_argument", `--${name.replaceAll("_", "-")} is required`);
  return options[name];
}

async function assertEnvironmentSafety(environment, options, mode) {
  if (["local", "test"].includes(environment)) {
    const { assertSafeTestDatabaseUrl } = await import("../src/lib/database-safety.js");
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    return;
  }
  if (!CONTROLLED_ENVIRONMENTS.includes(environment)) {
    fail("invalid_environment", "Environment must be local, test, staging, or production");
  }
  if (!options.allow_controlled_target) {
    fail("controlled_target_required", `--allow-controlled-target is required for ${environment}`);
  }
  if (environment === "production" && mode === "apply" && options.confirmation !== PRODUCTION_CONFIRMATION) {
    fail("confirmation_required", `Production apply requires --confirmation ${PRODUCTION_CONFIRMATION}`);
  }
}

/** Festivals this batch created, oldest row first so runs are deterministic. */
async function loadBatchFestivals(prisma, batchId) {
  const batch = await prisma.festivalImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true },
  });
  if (!batch) fail("batch_not_found", `Import batch ${batchId} was not found`);

  const rows = await prisma.festivalImportRow.findMany({
    where: { batch_id: batchId, target_festival_id: { not: null } },
    select: {
      row_number: true,
      target_festival: { select: { id: true, name: true, workflow_state: true, revision: true } },
    },
    orderBy: { row_number: "asc" },
  });

  return { batch, festivals: rows.map((row) => row.target_festival).filter(Boolean) };
}

async function publishFestival(festival, { transitionFestival, repository, user }) {
  let revision = festival.revision;
  let state = festival.workflow_state;
  const hops = [];

  for (const toState of PUBLISH_PATH) {
    /* Resume support: a re-run of a partially completed batch starts mid-path. */
    if (PUBLISH_PATH.indexOf(toState) < PUBLISH_PATH.indexOf(state)) continue;
    if (state === toState) continue;

    const result = await transitionFestival(
      festival.id,
      { to_state: toState, expected_revision: revision },
      // No notificationProvider: see the SAFETY note at the top of this file.
      { repository, user }
    );
    revision = result.festival.revision;
    state = toState;
    hops.push(toState);
  }

  return { hops, revision, state };
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  const batchId = required(options, "batch_id");
  const environment = options.environment || "local";
  await assertEnvironmentSafety(environment, options, mode);

  if (!process.env.DATABASE_URL) fail("database_required", "DATABASE_URL is required");

  const { prisma } = await import("../src/lib/db.js");
  const { batch, festivals } = await loadBatchFestivals(prisma, batchId);

  /* `unpublished` is deliberately excluded: a festival taken down on purpose must not be
   * silently republished by a bulk job. It is reported as blocked instead. */
  const PUBLISHABLE_FROM = new Set(["draft", "pending_review", "approved"]);
  const alreadyPublished = festivals.filter((festival) => festival.workflow_state === "published");
  const publishable = festivals.filter((festival) => PUBLISHABLE_FROM.has(festival.workflow_state));
  const blocked = festivals.filter(
    (festival) => festival.workflow_state !== "published" && !PUBLISHABLE_FROM.has(festival.workflow_state)
  );

  console.log(`Batch ${batch.id} (status: ${batch.status})`);
  console.log(`  festivals created by this batch: ${festivals.length}`);
  console.log(`  already published (skipped):     ${alreadyPublished.length}`);
  console.log(`  to publish:                      ${publishable.length}`);
  if (blocked.length > 0) {
    console.log(`  not publishable from their state: ${blocked.length}`);
    for (const festival of blocked) console.log(`    - ${festival.name} [${festival.workflow_state}]`);
  }

  if (mode === "dry-run") {
    console.log("\nDry run: nothing was changed. Organizer notifications are disabled on apply.");
    for (const festival of publishable.slice(0, 10)) {
      console.log(`  would publish: ${festival.name} [${festival.workflow_state} -> published]`);
    }
    if (publishable.length > 10) console.log(`  ...and ${publishable.length - 10} more`);
    return;
  }

  const operatorUserId = required(options, "operator_user_id");
  const operator = await prisma.user.findUnique({
    where: { id: operatorUserId },
    select: { id: true, role: true, status: true },
  });
  if (!operator) fail("operator_not_found", "Operator user was not found");
  if (!EDITORIAL_ROLES.includes(operator.role)) fail("operator_forbidden", "Operator must be admin or super_admin");
  if (operator.status !== "active") fail("operator_inactive", "Operator account must be active");

  const { editorialRepository } = await import("../src/features/editorial-workflow/editorial-repository.js");
  const { transitionFestival } = await import("../src/features/editorial-workflow/editorial-service.js");
  const user = { id: operator.id, role: operator.role };

  let published = 0;
  const failures = [];

  for (const festival of publishable) {
    try {
      const { hops } = await publishFestival(festival, { transitionFestival, repository: editorialRepository, user });
      published += 1;
      console.log(`  published: ${festival.name} (${hops.join(" -> ")})`);
    } catch (error) {
      failures.push({ festival, error });
      console.error(`  FAILED: ${festival.name} — ${error.code || "error"}: ${error.message}`);
    }
  }

  console.log(`\nPublished ${published}/${publishable.length}. Failures: ${failures.length}.`);
  console.log("No organizer emails were sent; workflow notifications are recorded as provider_unconfigured.");
  if (failures.length > 0) {
    console.log("Re-run this command to retry the failures; published festivals are skipped.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error?.code === "invalid_command" || error?.code === "missing_argument") console.error(usage());
  console.error(`festival-publish-batch failed: ${error?.code || "error"}: ${error?.message}`);
  process.exitCode = 1;
});
