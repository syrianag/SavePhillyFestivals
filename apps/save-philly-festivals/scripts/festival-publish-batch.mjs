/**
 * Bulk-publish festivals — by import batch, by date window, or both.
 *
 * Why this exists: public discovery (`publishedDiscoveryWhere`) returns only `published` rows, so
 * search, the calendar, the map and the festival grid all return nothing until each festival is
 * transitioned through to `published`. Doing that by hand for a ~400-row catalog is not viable.
 *
 * This drives the real editorial service rather than issuing an UPDATE, so every festival keeps
 * its `FestivalTransition` rows and `FestivalRevision` snapshots. The workflow allows no
 * shortcut: draft -> pending_review -> approved -> published. `unpublished` is the exception —
 * the policy permits a single hop straight back to `published`.
 *
 * SAFETY — organizer notifications are never delivered, by two independent mechanisms.
 * Every transition writes a notification outbox row addressed to `festival.contact_email`, which
 * for imported festivals is the organizer's real address from the source spreadsheet. Publishing
 * a full catalog with a live provider would send several unsolicited emails to every organizer
 * in the file.
 *   1. This script never passes a `notificationProvider`, so nothing sends during the run.
 *   2. Every row this run creates is then stamped `bulk_publish_suppressed` with `attempts` at
 *      the cap, so the admin retry button cannot deliver it later either. Before this, a single
 *      click in AdminFestivalDetail months afterwards would have emailed the organizer.
 * The rows are still written, so the audit trail stays intact. Do not "fix" either mechanism.
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
const PRODUCTION_CONFIRMATION = "publish-festival-batch";
const DEFAULT_SINCE_DAYS = 45;
const BOOLEAN_FLAGS = new Set(["allow_controlled_target", "include_unpublished", "all_dates"]);

function usage() {
  return `Usage:
  festival-publish-batch.mjs dry-run [--batch-id <uuid>] [--since-days ${DEFAULT_SINCE_DAYS}] [--all-dates]
                                     [--include-unpublished] [--environment local|test|staging|production]
  festival-publish-batch.mjs apply   --operator-user-id <uuid> [same selectors]
                                     [--allow-controlled-target] [--confirmation ${PRODUCTION_CONFIRMATION}]

Selection:
  --batch-id            Limit to festivals created by one import batch. Omit for the whole catalog.
  --since-days <n>      Only festivals whose dates fall within the last n days or later.
                        Defaults to ${DEFAULT_SINCE_DAYS}. Festivals with no dates at all are reported, never
                        published silently.
  --all-dates           Ignore the date window entirely.

  --include-unpublished Also republish festivals in 'unpublished'. Off by default: a festival
                        taken down on purpose must not be silently restored by a bulk job.

Already-published festivals are skipped, so a partial run can be re-run safely.

Staging and production additionally require --allow-controlled-target; production also requires
--confirmation ${PRODUCTION_CONFIRMATION}. Local and test runs are restricted to a loopback
database whose name marks it as dev/local/test/ci, by src/lib/database-safety.js.

Organizer notifications are never sent, during this run or afterwards. See the header comment.
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
    if (BOOLEAN_FLAGS.has(key)) {
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

function parseSinceDays(options) {
  if (options.all_dates) return null;
  if (options.since_days === undefined) return DEFAULT_SINCE_DAYS;
  const days = Number(options.since_days);
  if (!Number.isInteger(days) || days < 0) fail("invalid_argument", "--since-days must be a non-negative integer");
  return days;
}

async function assertEnvironmentSafety(environment, options, mode) {
  if (["local", "test"].includes(environment)) {
    /* The seed-class guard, not the migration-test one: this is a data operation on a developer's
     * own database, so a `dev`/`local` name is legitimate. Still loopback-only, and still name-gated
     * so a locally-cloned production database is refused. `assertSafeTestDatabaseUrl` stays reserved
     * for migrate-test, which drops and recreates the public schema. */
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

/** Festival ids created by one import batch, oldest row first so runs are deterministic. */
async function batchFestivalIds(prisma, batchId) {
  const batch = await prisma.festivalImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true },
  });
  if (!batch) fail("batch_not_found", `Import batch ${batchId} was not found`);

  const rows = await prisma.festivalImportRow.findMany({
    where: { batch_id: batchId, target_festival_id: { not: null } },
    select: { target_festival_id: true },
    orderBy: { row_number: "asc" },
  });
  return { batch, ids: rows.map((row) => row.target_festival_id) };
}

/**
 * "Dated within the last n days or later", expressed through the same helper the public site and
 * the admin list use.
 *
 * Hand-rolling this would get two things wrong. Imported festivals store their dates in
 * `all_day_start`/`all_day_end` with `start_date` NULL, so a single-column comparison misses
 * them; and the all-day columns are `@db.Date`, where passing a zoned instant shifts the
 * boundary by a day. `buildDateOverlapFilter` already handles both, and reusing it is what keeps
 * this script agreeing with what an operator sees in the admin list.
 */
async function dateWindowFilter(sinceDays, now) {
  if (sinceDays === null) return null;
  const { buildDateOverlapFilter, datePartsInTimeZone, getDiscoveryDateRange } = await import(
    "../src/features/festivals/discovery.js"
  );
  const since = datePartsInTimeZone(new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000));
  const start = `${since.year}-${String(since.month).padStart(2, "0")}-${String(since.day).padStart(2, "0")}`;
  return { filter: buildDateOverlapFilter(getDiscoveryDateRange({ date: "custom", start, end: "" }, now)), start };
}

const FESTIVAL_SELECT = Object.freeze({ id: true, name: true, workflow_state: true, revision: true });

async function publishFestival(festival, hops, { transitionFestival, repository, user }) {
  let revision = festival.revision;
  for (const toState of hops) {
    const result = await transitionFestival(
      festival.id,
      { to_state: toState, expected_revision: revision },
      // No notificationProvider: see the SAFETY note at the top of this file.
      { repository, user }
    );
    revision = result.festival.revision;
  }
  return revision;
}

/**
 * Make every outbox row this run created undeliverable.
 *
 * Scoped to revisions above where the festival started, so notifications from earlier, genuine
 * editorial activity are left alone. `attempts` at the cap is what actually blocks
 * `claimNotification`; the failure code is what makes the refusal legible.
 */
async function suppressNotifications(prisma, festivalId, fromRevision, suppressedCode, maxAttempts) {
  return prisma.festivalWorkflowNotification.updateMany({
    where: { festival_id: festivalId, audience: "producer", workflow_revision: { gt: fromRevision } },
    data: {
      delivery_status: "failed",
      failure_code: suppressedCode,
      attempts: maxAttempts,
      attempt_token: null,
      attempt_started_at: null,
    },
  });
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  const environment = options.environment || "local";
  const sinceDays = parseSinceDays(options);
  const includeUnpublished = Boolean(options.include_unpublished);
  await assertEnvironmentSafety(environment, options, mode);

  if (!process.env.DATABASE_URL) fail("database_required", "DATABASE_URL is required");

  const { prisma } = await import("../src/lib/db.js");
  const { pathToPublished } = await import("../src/features/editorial-workflow/publish-path.js");
  const now = new Date();

  let scopeWhere = {};
  let scopeLabel = "whole catalog";
  if (options.batch_id) {
    const { batch, ids } = await batchFestivalIds(prisma, options.batch_id);
    scopeWhere = { id: { in: ids } };
    scopeLabel = `import batch ${batch.id} (status: ${batch.status})`;
  }

  const window = await dateWindowFilter(sinceDays, now);
  const where = window?.filter ? { AND: [scopeWhere, window.filter] } : scopeWhere;

  const [candidates, dateless] = await Promise.all([
    prisma.festival.findMany({ where, select: FESTIVAL_SELECT, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    /* Neither branch of the overlap filter matches a festival with no dates at all, so without
     * this they would vanish from the run with no trace and the counts would not reconcile. */
    window?.filter
      ? prisma.festival.findMany({
        where: { AND: [scopeWhere, { start_date: null, all_day_start: null }] },
        select: FESTIVAL_SELECT,
        orderBy: [{ name: "asc" }],
      })
      : Promise.resolve([]),
  ]);

  const alreadyPublished = candidates.filter((festival) => festival.workflow_state === "published");
  const publishable = [];
  const blocked = [];
  for (const festival of candidates) {
    if (festival.workflow_state === "published") continue;
    const hops = pathToPublished(festival.workflow_state, { includeUnpublished });
    if (hops === null) blocked.push(festival);
    else publishable.push({ festival, hops });
  }

  console.log(`Scope: ${scopeLabel}`);
  console.log(`  date window:                      ${window ? `${window.start} onward` : "all dates"}`);
  console.log(`  unpublished included:             ${includeUnpublished ? "yes" : "no"}`);
  console.log(`  matched festivals:                ${candidates.length}`);
  console.log(`  already published (skipped):      ${alreadyPublished.length}`);
  console.log(`  to publish:                       ${publishable.length}`);
  if (dateless.length > 0) {
    console.log(`  skipped, no dates recorded:       ${dateless.length}`);
    for (const festival of dateless.slice(0, 10)) console.log(`    - ${festival.name} [${festival.workflow_state}]`);
    if (dateless.length > 10) console.log(`    ...and ${dateless.length - 10} more`);
  }
  if (blocked.length > 0) {
    console.log(`  not publishable from their state: ${blocked.length}`);
    const unpublishedCount = blocked.filter((festival) => festival.workflow_state === "unpublished").length;
    if (unpublishedCount > 0 && !includeUnpublished) {
      console.log(`    ${unpublishedCount} are 'unpublished' — pass --include-unpublished to restore them.`);
    }
    for (const festival of blocked.slice(0, 10)) console.log(`    - ${festival.name} [${festival.workflow_state}]`);
    if (blocked.length > 10) console.log(`    ...and ${blocked.length - 10} more`);
  }

  if (mode === "dry-run") {
    console.log("\nDry run: nothing was changed. Organizer notifications are disabled on apply.");
    for (const { festival, hops } of publishable.slice(0, 10)) {
      console.log(`  would publish: ${festival.name} [${festival.workflow_state} -> ${hops.join(" -> ")}]`);
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
  const { WORKFLOW_NOTIFICATION_MAX_ATTEMPTS, WORKFLOW_NOTIFICATION_SUPPRESSED_CODE } = await import(
    "../src/features/editorial-workflow/editorial-notifications.js"
  );
  const user = { id: operator.id, role: operator.role };

  let published = 0;
  let suppressed = 0;
  const failures = [];

  for (const { festival, hops } of publishable) {
    const startingRevision = festival.revision;
    try {
      await publishFestival(festival, hops, { transitionFestival, repository: editorialRepository, user });
      published += 1;
      const result = await suppressNotifications(
        prisma, festival.id, startingRevision,
        WORKFLOW_NOTIFICATION_SUPPRESSED_CODE, WORKFLOW_NOTIFICATION_MAX_ATTEMPTS,
      );
      suppressed += result.count;
      console.log(`  published: ${festival.name} (${hops.join(" -> ")})`);
    } catch (error) {
      failures.push({ festival, error });
      console.error(`  FAILED: ${festival.name} — ${error.code || "error"}: ${error.message}`);
      /* Suppress whatever partial hops did land, so an aborted festival cannot leave a
       * deliverable row behind. */
      await suppressNotifications(
        prisma, festival.id, startingRevision,
        WORKFLOW_NOTIFICATION_SUPPRESSED_CODE, WORKFLOW_NOTIFICATION_MAX_ATTEMPTS,
      ).catch(() => {});
    }
  }

  console.log(`\nPublished ${published}/${publishable.length}. Failures: ${failures.length}.`);
  console.log(`No organizer emails were sent. ${suppressed} workflow notification(s) marked non-deliverable.`);
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
