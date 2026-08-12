/**
 * Bulk-unpublish published festivals.
 *
 * The reverse of `festival-publish-batch.mjs`, and deliberately a separate script: taking the
 * public catalog down is not a flag on the job that puts it up.
 *
 * `published -> unpublished` is a single legal transition, which is what makes this the cheap,
 * reversible way to remove festivals from the public site. `pending_review` is NOT reachable
 * from `published` — that path is `published -> unpublished -> changes_requested ->
 * pending_review`, three transitions per festival, and `changes_requested` additionally
 * requires an internal reason and a producer-facing message. If the goal is an editorial review
 * queue rather than a takedown, that is a different and much more expensive operation.
 *
 * Drives the real editorial service rather than issuing an UPDATE, so every festival keeps its
 * `FestivalTransition` rows and `FestivalRevision` snapshots. A raw
 * `UPDATE ... SET workflow_state` would silently break the audit trail the editorial feature
 * exists to maintain.
 *
 * SAFETY — notifications are deliberately disabled.
 * Every transition writes a notification outbox row addressed to `festival.contact_email`,
 * which for imported festivals is the organizer's real address from the source spreadsheet.
 * Running this with a live provider would email every organizer to say their festival was taken
 * down. This script never passes a `notificationProvider`, so `deliverWorkflowNotification`
 * records `provider_unconfigured` and sends nothing. The outbox rows are still written, so the
 * audit trail stays intact. Do not "fix" this by wiring a provider in.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Load the environment before importing anything that touches the database: `@/lib/db`
 * builds its Prisma client at module scope and throws when DATABASE_URL is absent. */
config({ path: [join(appRoot, ".env.local"), join(appRoot, ".env")], quiet: true });

const EDITORIAL_ROLES = Object.freeze(["admin", "super_admin"]);
const CONTROLLED_ENVIRONMENTS = Object.freeze(["staging", "production"]);
const PRODUCTION_CONFIRMATION = "unpublish-festival-batch";
const DEFAULT_REASON = "Bulk unpublish: removed from the public catalog pending editorial review.";

function usage() {
  return `Usage:
  festival-unpublish-batch.mjs dry-run [--batch-id <uuid>] [--environment local|test|staging|production]
  festival-unpublish-batch.mjs apply   --operator-user-id <uuid> [--batch-id <uuid>] [--reason "..."] [--environment ...] [--allow-controlled-target] [--confirmation ${PRODUCTION_CONFIRMATION}]

Transitions published festivals to unpublished, removing them from public discovery, the
calendar, and the map. Detail pages for them stop resolving as well.

Scope defaults to every published festival. Pass --batch-id to limit it to the festivals created
by one import batch.

Reversible with festival-publish-batch.mjs, which republishes from unpublished in one hop.

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
    /* Matches the publish script: a developer's own `dev`/`local` database is a legitimate target
     * for a data operation. Loopback-only and name-gated still apply. */
    const { assertSafeSeedDatabaseUrl } = await import("../src/lib/database-safety.js");
    assertSafeSeedDatabaseUrl(process.env.DATABASE_URL);
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

/** Published festivals in scope, name-ordered so runs are deterministic and reports are readable. */
async function loadPublishedFestivals(prisma, batchId) {
  if (!batchId) {
    return prisma.festival.findMany({
      where: { workflow_state: "published" },
      select: { id: true, name: true, workflow_state: true, revision: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  }

  const batch = await prisma.festivalImportBatch.findUnique({ where: { id: batchId }, select: { id: true } });
  if (!batch) fail("batch_not_found", `Import batch ${batchId} was not found`);

  const rows = await prisma.festivalImportRow.findMany({
    where: { batch_id: batchId, target_festival_id: { not: null } },
    select: { target_festival: { select: { id: true, name: true, workflow_state: true, revision: true } } },
    orderBy: { row_number: "asc" },
  });
  return rows.map((row) => row.target_festival).filter((festival) => festival?.workflow_state === "published");
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  const environment = options.environment || "local";
  await assertEnvironmentSafety(environment, options, mode);

  if (!process.env.DATABASE_URL) fail("database_required", "DATABASE_URL is required");

  const { prisma } = await import("../src/lib/db.js");
  const scope = options.batch_id ? `import batch ${options.batch_id}` : "the whole catalog";
  const festivals = await loadPublishedFestivals(prisma, options.batch_id);

  console.log(`Scope: ${scope}`);
  console.log(`  published festivals to unpublish: ${festivals.length}`);

  if (mode === "dry-run") {
    console.log("\nDry run: nothing was changed. Organizer notifications are disabled on apply.");
    console.log("On apply these leave public discovery, the calendar, the map, and their detail pages.");
    for (const festival of festivals.slice(0, 10)) {
      console.log(`  would unpublish: ${festival.name} [published -> unpublished]`);
    }
    if (festivals.length > 10) console.log(`  ...and ${festivals.length - 10} more`);
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
  const { WORKFLOW_NOTIFICATION_MAX_ATTEMPTS, WORKFLOW_NOTIFICATION_SUPPRESSED_CODE } = await import(
    "../src/features/editorial-workflow/editorial-notifications.js"
  );
  const user = { id: operator.id, role: operator.role };
  /* Not required by policy for `unpublished`, but recorded so the history says why a festival
   * left the public site rather than leaving a bare state change behind. */
  const reason = options.reason || DEFAULT_REASON;

  let unpublished = 0;
  let suppressed = 0;
  const failures = [];

  for (const festival of festivals) {
    try {
      await transitionFestival(
        festival.id,
        { to_state: "unpublished", expected_revision: festival.revision, reason },
        // No notificationProvider: see the SAFETY note at the top of this file.
        { repository: editorialRepository, user }
      );
      unpublished += 1;
      console.log(`  unpublished: ${festival.name}`);
    } catch (error) {
      failures.push({ festival, error });
      console.error(`  FAILED: ${festival.name} — ${error.code || "error"}: ${error.message}`);
    }
    /* Not sending during the run is only half the protection. Each hop leaves a `failed` outbox
     * row addressed to the organizer's imported address, and the admin retry button would
     * deliver it. Stamped unclaimable here for the same reason the publish script does it. */
    suppressed += (await prisma.festivalWorkflowNotification.updateMany({
      where: { festival_id: festival.id, audience: "producer", workflow_revision: { gt: festival.revision } },
      data: {
        delivery_status: "failed",
        failure_code: WORKFLOW_NOTIFICATION_SUPPRESSED_CODE,
        attempts: WORKFLOW_NOTIFICATION_MAX_ATTEMPTS,
        attempt_token: null,
        attempt_started_at: null,
      },
    }).catch(() => ({ count: 0 }))).count;
  }

  console.log(`\nUnpublished ${unpublished}/${festivals.length}. Failures: ${failures.length}.`);
  console.log(`No organizer emails were sent. ${suppressed} workflow notification(s) marked non-deliverable.`);
  if (failures.length > 0) {
    console.log("Re-run this command to retry the failures; already-unpublished festivals are out of scope.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error?.code === "invalid_command" || error?.code === "missing_argument") console.error(usage());
  console.error(`festival-unpublish-batch failed: ${error?.code || "error"}: ${error?.message}`);
  process.exitCode = 1;
});
