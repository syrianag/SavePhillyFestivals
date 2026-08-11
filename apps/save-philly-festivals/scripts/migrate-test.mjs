import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import pg from "pg";

import { FESTIVAL_REVISION_SNAPSHOT_FIELDS } from "../src/features/editorial-workflow/festival-revision-snapshot.js";
import { assertSafeTestDatabaseUrl } from "../src/lib/database-safety.js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(projectRoot, "../..");
const prismaBin = join(workspaceRoot, "node_modules/.bin/prisma");
const tsxBin = join(workspaceRoot, "node_modules/.bin/tsx");
const migrationsRoot = join(projectRoot, "prisma/migrations");
const f07Migration = "20260804050000_producer_submission_workflow";
const f08Migration = "20260804060000_editorial_workflow";
const f09Migration = "20260804070000_moderated_social_feed";
const festivalImportMigration = "20260805000000_festival_data_import";
const userManagementMigration = "20260805010000_user_management_audit";
const snapshotFieldSql = FESTIVAL_REVISION_SNAPSHOT_FIELDS
  .map((field) => `'${field.replaceAll("'", "''")}'`)
  .join(", ");
const completeFestivalSnapshotSql = `(SELECT jsonb_object_agg(entry.name, entry.value)
  FROM "Festival" festival,
       LATERAL jsonb_each(to_jsonb(festival)) AS entry(name, value)
  WHERE festival."id" = $1 AND entry.name = ANY(ARRAY[${snapshotFieldSql}]))`;

config({
  path: [join(projectRoot, ".env.local"), join(projectRoot, ".env")],
  quiet: true,
});

const target = assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
console.log(`Using approved disposable local test database ${target.databaseName} on ${target.hostname}.`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function resetPublicSchema() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";');
  } finally {
    await client.end();
  }
}

await resetPublicSchema();

const migrationNames = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const preF07 = migrationNames.filter((name) => name < f07Migration);
if (!migrationNames.includes(f07Migration)) throw new Error(`Missing ${f07Migration} migration.`);
if (!migrationNames.includes(f08Migration)) throw new Error(`Missing ${f08Migration} migration.`);
if (!migrationNames.includes(f09Migration)) throw new Error(`Missing ${f09Migration} migration.`);
if (!migrationNames.includes(festivalImportMigration)) throw new Error(`Missing ${festivalImportMigration} migration.`);
if (!migrationNames.includes(userManagementMigration)) throw new Error(`Missing ${userManagementMigration} migration.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  for (const name of preF07) {
    await client.query(readFileSync(join(migrationsRoot, name, "migration.sql"), "utf8"));
  }

  await client.query(`
    INSERT INTO "User" ("id", "email", "password_hash", "role", "created_at", "updated_at")
    VALUES ('00000000-0000-4000-8000-000000000001', 'admin@example.test', 'disposable-only', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const legacyStatuses = ["draft", "pending", "submitted", "approved", "rejected", "published", "legacy_unknown"];
  for (const [index, status] of legacyStatuses.entries()) {
    await client.query(
      `INSERT INTO "Festival" ("id", "name", "slug", "status", "created_at", "updated_at") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [`00000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`, `Legacy ${status}`, `legacy-${status.replaceAll("_", "-")}`, status],
    );
  }
  await client.query(`
    INSERT INTO "Festival" ("id", "name", "slug", "status", "rejection_reason", "created_at", "updated_at") VALUES
      ('00000000-0000-4000-8000-000000000108', 'Legacy published without dates', 'legacy-published-invalid', 'published', 'Legacy publication evidence', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('00000000-0000-4000-8000-000000000109', 'Legacy canceled without dates', 'legacy-canceled-invalid', 'canceled', 'Legacy cancellation evidence', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('00000000-0000-4000-8000-000000000110', 'Generated client pending evidence', 'generated-client-pending', 'pending', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('00000000-0000-4000-8000-000000000111', 'Legacy public cancellation', 'legacy-canceled-public', 'approved', 'Legacy public cancellation evidence', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await client.query(`UPDATE "Festival" SET "status" = 'canceled', "start_date" = '2026-09-02T14:00:00Z', "end_date" = '2026-09-02T20:00:00Z', "calendar_date_type" = 'timed' WHERE "slug" = 'legacy-canceled-public'`);
  console.log(`Seeded pre-F-07 representative legacy statuses: ${legacyStatuses.join(", ")}, plus invalid and prior-publication canceled evidence rows.`);

  await client.query(readFileSync(join(migrationsRoot, f07Migration, "migration.sql"), "utf8"));

  const mapped = await client.query('SELECT "slug", "status", "workflow_state"::text AS workflow_state FROM "Festival" ORDER BY "slug"');
  const mappings = new Map(mapped.rows.map((row) => [row.slug, row]));
  const expectedMappings = new Map([
    ["legacy-draft", ["draft", "draft"]],
    ["legacy-pending", ["pending", "pending_review"]],
    ["legacy-submitted", ["pending", "pending_review"]],
    ["legacy-approved", ["approved", "approved"]],
    ["legacy-rejected", ["rejected", "rejected"]],
    ["legacy-published", ["published", "published"]],
    ["legacy-legacy-unknown", ["legacy_unknown", "draft"]],
  ]);
  for (const [slug, [status, workflowState]] of expectedMappings) {
    const row = mappings.get(slug);
    if (row?.status !== status || row?.workflow_state !== workflowState) {
      throw new Error(`Unexpected F-07 mapping for ${slug}: ${row?.status}/${row?.workflow_state}`);
    }
  }

  const requiredConstraints = [
    "Festival_review_status_coherence",
    "ProducerSubmissionNotification_recipient_kind",
    "ProducerSubmissionNotification_attempts_nonnegative",
    "FestivalAssetReconciliation_attempts_nonnegative",
    "FestivalAssetReconciliation_checksum_sha256_format",
  ];
  const constraints = await client.query(
    `SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`,
    [requiredConstraints],
  );
  const foundConstraints = new Set(constraints.rows.map((row) => row.conname));
  for (const name of requiredConstraints) {
    if (!foundConstraints.has(name)) throw new Error(`Missing migrated constraint: ${name}`);
  }

  const triggers = await client.query(
    `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`,
    [["FestivalTransition_append_only_update_trigger", "FestivalTransition_append_only_delete_trigger"]],
  );
  if (triggers.rowCount !== 2) throw new Error("Append-only FestivalTransition triggers are not installed.");

  const columns = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = ANY($1::text[])`,
    [["attempt_token", "attempt_started_at", "failure_message", "provider_file_id", "reconciliation_marker"]],
  );
  const byTable = new Map();
  for (const row of columns.rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
    byTable.get(row.table_name).add(row.column_name);
  }
  if (!byTable.get("ProducerSubmissionNotification")?.has("attempt_token") || !byTable.get("ProducerSubmissionNotification")?.has("attempt_started_at")) {
    throw new Error("Notification attempt fields are not on ProducerSubmissionNotification.");
  }
  if (byTable.get("ScheduleEmailRequest")?.has("attempt_token") || byTable.get("ScheduleEmailRequest")?.has("attempt_started_at")) {
    throw new Error("Notification attempt fields drifted onto ScheduleEmailRequest.");
  }
  if (!byTable.get("ScheduleEmailRequest")?.has("failure_message")) throw new Error("ScheduleEmailRequest.failure_message is missing.");
  if (!byTable.get("FestivalAssetReconciliation")?.has("provider_file_id") || !byTable.get("FestivalAssetReconciliation")?.has("reconciliation_marker")) {
    throw new Error("Restricted reconciliation fields are missing.");
  }

  console.log("Verified pre-F-07 data mapping, model-specific fields, constraints, and append-only triggers.");

  // Give representative legacy public/private rows valid intervals before F-08 so the
  // deterministic primary-occurrence backfill can be proven without inventing invalid data.
  await client.query(`UPDATE "Festival" SET "start_date" = '2026-09-01T14:00:00Z', "end_date" = '2026-09-01T20:00:00Z', "calendar_date_type" = 'timed' WHERE "slug" IN ('legacy-approved', 'legacy-published')`);

  await client.query(readFileSync(join(migrationsRoot, f08Migration, "migration.sql"), "utf8"));

  const f08Constraints = [
    "Festival_status_workflow_compatibility", "Festival_publication_metadata", "Festival_cancellation_metadata",
    "FestivalOccurrence_valid_interval", "FestivalRevision_snapshot_object", "FestivalAsset_editorial_review_consistency",
    "Schedule_occurrence_id_festival_id_fkey", "FestivalRevision_transition_identity_fkey",
    "FestivalWorkflowNotification_transition_fkey", "FestivalWorkflowNotification_attempts_bounded",
  ];
  const f08ConstraintRows = await client.query(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`, [f08Constraints]);
  if (f08ConstraintRows.rowCount !== f08Constraints.length) throw new Error("F-08 constraints are incomplete.");
  const f08Triggers = [
    "Festival_workflow_status_compatibility_trigger", "Festival_workflow_graph_trigger",
    "FestivalRevision_append_only_update_trigger", "FestivalRevision_append_only_delete_trigger",
    "Festival_audit_insert_commit_trigger", "Festival_audit_commit_trigger", "Festival_live_primary_occurrence_commit_trigger",
    "FestivalOccurrence_live_primary_commit_trigger",
  ];
  const f08TriggerRows = await client.query(`SELECT tgname, tgdeferrable, tginitdeferred FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`, [f08Triggers]);
  if (f08TriggerRows.rowCount !== f08Triggers.length) throw new Error("F-08 triggers are incomplete.");
  for (const row of f08TriggerRows.rows.filter((row) => row.tgname.includes("commit_trigger"))) {
    if (!row.tgdeferrable || !row.tginitdeferred) throw new Error(`${row.tgname} is not initially deferred.`);
  }

  const downgradedLegacy = await client.query(`SELECT "slug", "status", "workflow_state"::text AS workflow_state, "rejection_reason", "published_at", "calendar_published_at" FROM "Festival" WHERE "slug" IN ('legacy-published-invalid', 'legacy-canceled-invalid') ORDER BY "slug"`);
  const legacyCanceled = downgradedLegacy.rows.find((row) => row.slug === "legacy-canceled-invalid");
  const legacyPublished = downgradedLegacy.rows.find((row) => row.slug === "legacy-published-invalid");
  if (legacyPublished?.workflow_state !== "approved" || legacyPublished.status !== "approved" || !legacyPublished.rejection_reason.includes("Legacy publication evidence") || !legacyPublished.rejection_reason.includes("F-08 migration") || legacyPublished.published_at || legacyPublished.calendar_published_at) {
    throw new Error("Invalid legacy published row was not safely downgraded with preserved evidence.");
  }
  if (legacyCanceled?.workflow_state !== "unpublished" || legacyCanceled.status !== "unpublished" || !legacyCanceled.rejection_reason.includes("Legacy cancellation evidence") || !legacyCanceled.rejection_reason.includes("F-08 migration") || legacyCanceled.published_at || legacyCanceled.calendar_published_at) {
    throw new Error("Invalid legacy canceled row was not safely made private with preserved evidence.");
  }
  const publicCancellation = await client.query(`SELECT "workflow_state"::text AS workflow_state, "calendar_published_at", "first_published_at", "published_at", "canceled_at", "public_message", ("workflow_state" = 'published' OR ("workflow_state" = 'canceled' AND "first_published_at" IS NOT NULL)) AS public_detail FROM "Festival" WHERE "slug" = 'legacy-canceled-public'`);
  const publicCanceled = publicCancellation.rows[0];
  if (publicCanceled?.workflow_state !== "canceled" || !publicCanceled.calendar_published_at || !publicCanceled.first_published_at || publicCanceled.published_at || !publicCanceled.canceled_at || publicCanceled.public_message !== "This festival has been canceled." || !publicCanceled.public_detail) {
    throw new Error("Valid legacy public cancellation did not retain complete tombstone evidence and public predicate eligibility.");
  }

  // Legacy status is now a write-proof projection; direct legacy writes cannot alter state.
  await client.query(`UPDATE "Festival" SET "status" = 'published' WHERE "slug" = 'legacy-approved'`);
  const compatible = await client.query(`SELECT "status", "workflow_state"::text FROM "Festival" WHERE "slug" = 'legacy-approved'`);
  if (compatible.rows[0].status !== "approved" || compatible.rows[0].workflow_state !== "approved") throw new Error("Legacy status compatibility trigger is not authoritative.");

  async function expectTransactionRejected(operation, label, expected) {
    await client.query("BEGIN");
    try {
      await operation();
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");
      await client.query("COMMIT");
      throw new Error(`${label} was accepted.`);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.message === `${label} was accepted.`) throw error;
      if (expected && !expected.test(error.message)) throw new Error(`${label} failed for the wrong reason: ${error.message}`);
    }
  }

  const actorId = "00000000-0000-4000-8000-000000000001";
  const producerId = "00000000-0000-4000-8000-000000000002";
  const pendingId = "00000000-0000-4000-8000-000000000102";
  const approvedId = "00000000-0000-4000-8000-000000000104";
  await client.query(`INSERT INTO "User" ("id", "email", "password_hash", "role", "created_at", "updated_at") VALUES ($1, 'producer@example.test', 'disposable-only', 'producer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [producerId]);
  await client.query(`UPDATE "Festival" SET "owner_user_id" = $1 WHERE "id" = $2`, [producerId, pendingId]);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "Festival" ("id", "name", "slug", "workflow_state", "revision", "created_at", "updated_at") VALUES ('00000000-0000-4000-8000-000000000200', 'Unaudited insert', 'unaudited-insert', 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  }, "Festival insert without initial audit records", /matching transition/);

  const initialDraftId = "00000000-0000-4000-8000-000000000202";
  await client.query("BEGIN");
  await client.query(`INSERT INTO "Festival" ("id", "owner_user_id", "name", "slug", "workflow_state", "revision", "created_at", "updated_at") VALUES ($1, $2, '', 'audited-initial-draft', 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [initialDraftId, producerId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000200', $1, $2, NULL, 'draft', 0)`, [initialDraftId, producerId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000200', $1, 0, '10000000-0000-4000-8000-000000000200', $2, ${completeFestivalSnapshotSql})`, [initialDraftId, producerId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
  }, "Direct state-only commit", /matching transition/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000001', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
  }, "Transition without revision snapshot", /immutable revision snapshot/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000002', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000002', $1, 1, '10000000-0000-4000-8000-000000000002', $2, jsonb_build_object('id', $1::text, 'workflow_state', 'approved', 'revision', 1))`, [pendingId, actorId]);
  }, "Incomplete revision snapshot", /exactly match the approved scalar allowlist/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000012', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000012', $1, 1, '10000000-0000-4000-8000-000000000012', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('name', 'Mismatched name'))`, [pendingId, actorId]);
  }, "Mismatched revision snapshot", /does not match approved festival scalar fields/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000013', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000013', $1, 1, '10000000-0000-4000-8000-000000000013', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('drive_file_id', 'forbidden'))`, [pendingId, actorId]);
  }, "Forbidden revision snapshot field", /exactly match the approved scalar allowlist/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000015', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000015', $1, 1, '10000000-0000-4000-8000-000000000015', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('api_session_secret', 'must-never-commit'))`, [pendingId, actorId]);
  }, "Arbitrary extra snapshot key", /exactly match the approved scalar allowlist/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000016', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000016', $1, 1, '10000000-0000-4000-8000-000000000016', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('name', jsonb_build_object('nested', true)))`, [pendingId, actorId]);
  }, "Nested snapshot value", /values must be scalar/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000014', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000014', $1, 1, '10000000-0000-4000-8000-000000000014', $2, ${completeFestivalSnapshotSql})`, [pendingId, actorId]);
  }, "Owned transition without workflow outbox", /workflow notification/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000003', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, producerId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000003', $1, 1, '10000000-0000-4000-8000-000000000003', $2, ${completeFestivalSnapshotSql})`, [pendingId, producerId]);
  }, "Producer editorial actor edge", /Producer actor/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'changes_requested', "revision" = 1 WHERE "id" = $1`, [pendingId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision", "producer_message") VALUES ('10000000-0000-4000-8000-000000000004', $1, $2, 'pending_review', 'changes_requested', 1, 'Safe feedback')`, [pendingId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000004', $1, 1, '10000000-0000-4000-8000-000000000004', $2, ${completeFestivalSnapshotSql})`, [pendingId, actorId]);
  }, "Missing required internal reason", /internal reason/);

  await client.query("BEGIN");
  await client.query(`UPDATE "Festival" SET "workflow_state" = 'approved', "revision" = 1 WHERE "id" = $1`, [pendingId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000010', $1, $2, 'pending_review', 'approved', 1)`, [pendingId, actorId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000010', $1, 1, '10000000-0000-4000-8000-000000000010', $2, ${completeFestivalSnapshotSql})`, [pendingId, actorId]);
  await client.query(`INSERT INTO "FestivalWorkflowNotification" ("id", "festival_id", "workflow_revision", "recipient_email", "updated_at") VALUES ('50000000-0000-4000-8000-000000000010', $1, 1, 'producer@example.test', CURRENT_TIMESTAMP)`, [pendingId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  // Exercise the same public-detail predicate used by publication-policy.js.
  const approvedPrivate = await client.query(`SELECT count(*)::int AS count FROM "Festival" WHERE "id" = $1 AND ("workflow_state" = 'published' OR ("workflow_state" = 'canceled' AND "first_published_at" IS NOT NULL))`, [pendingId]);
  if (approvedPrivate.rows[0].count !== 0) throw new Error("Approved private row leaked through the shared public-detail semantics.");

  const resubmitId = "00000000-0000-4000-8000-000000000103";
  await client.query(`UPDATE "Festival" SET "owner_user_id" = $2, "name" = 'Producer resubmit evidence', "description" = 'Complete description before editorial feedback', "location" = 'City Hall', "city" = 'Philadelphia', "state" = 'PA', "zip_code" = '19107', "website_url" = 'https://example.test/resubmit', "contact_name" = 'Producer', "contact_email" = 'original-recipient@example.test', "start_date" = '2026-10-01T14:00:00Z', "end_date" = '2026-10-01T20:00:00Z', "calendar_date_type" = 'timed' WHERE "id" = $1`, [resubmitId, producerId]);
  await client.query("BEGIN");
  await client.query(`UPDATE "Festival" SET "workflow_state" = 'changes_requested', "revision" = 1 WHERE "id" = $1`, [resubmitId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision", "reason", "producer_message") VALUES ('10000000-0000-4000-8000-000000000040', $1, $2, 'pending_review', 'changes_requested', 1, 'Private editorial reason', 'Please revise the description.')`, [resubmitId, actorId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000040', $1, 1, '10000000-0000-4000-8000-000000000040', $2, ${completeFestivalSnapshotSql})`, [resubmitId, actorId]);
  await client.query(`INSERT INTO "FestivalWorkflowNotification" ("id", "festival_id", "workflow_revision", "recipient_email", "updated_at") VALUES ('50000000-0000-4000-8000-000000000040', $1, 1, 'original-recipient@example.test', CURRENT_TIMESTAMP)`, [resubmitId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await client.query("BEGIN");
  await client.query(`UPDATE "Festival" SET "description" = 'Producer revised description after feedback', "revision" = 2 WHERE "id" = $1`, [resubmitId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000041', $1, $2, 'changes_requested', 'changes_requested', 2)`, [resubmitId, producerId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000041', $1, 2, '10000000-0000-4000-8000-000000000041', $2, ${completeFestivalSnapshotSql})`, [resubmitId, producerId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await client.query("BEGIN");
  await client.query(`UPDATE "Festival" SET "workflow_state" = 'pending_review', "revision" = 3 WHERE "id" = $1`, [resubmitId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000042', $1, $2, 'changes_requested', 'pending_review', 3)`, [resubmitId, producerId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000042', $1, 3, '10000000-0000-4000-8000-000000000042', $2, ${completeFestivalSnapshotSql})`, [resubmitId, producerId]);
  await client.query(`INSERT INTO "FestivalOccurrence" ("id", "festival_id", "source_key", "is_primary", "calendar_date_type", "time_zone", "start_at", "end_at", "updated_at") VALUES ('30000000-0000-4000-8000-000000000042', $1, 'producer-resubmit-primary', TRUE, 'timed', 'America/New_York', '2026-10-01T14:00:00Z', '2026-10-01T20:00:00Z', CURRENT_TIMESTAMP)`, [resubmitId]);
  await client.query(`INSERT INTO "ProducerSubmissionNotification" ("id", "festival_id", "workflow_revision", "notification_type", "recipient_email", "updated_at") VALUES ('70000000-0000-4000-8000-000000000041', $1, 3, 'producer_receipt', 'original-recipient@example.test', CURRENT_TIMESTAMP)`, [resubmitId]);
  await client.query(`INSERT INTO "ProducerSubmissionNotification" ("id", "festival_id", "workflow_revision", "notification_type", "recipient_alias", "updated_at") VALUES ('70000000-0000-4000-8000-000000000042', $1, 3, 'team_notification', 'PRODUCER_SUBMISSION_TEAM_ALIAS', CURRENT_TIMESTAMP)`, [resubmitId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");
  const resubmitted = await client.query(`SELECT festival."workflow_state"::text AS workflow_state, festival."revision", transition."reason", transition."producer_message" FROM "Festival" festival JOIN "FestivalTransition" transition ON transition."festival_id" = festival."id" AND transition."revision" = 2 WHERE festival."id" = $1`, [resubmitId]);
  if (resubmitted.rows[0]?.workflow_state !== "pending_review" || resubmitted.rows[0]?.revision !== 3 || resubmitted.rows[0]?.reason !== null || resubmitted.rows[0]?.producer_message !== null) {
    throw new Error("Producer changes-requested edit then resubmit evidence failed.");
  }

  const noOccurrenceId = "00000000-0000-4000-8000-000000000201";
  await client.query("BEGIN");
  await client.query(`INSERT INTO "Festival" ("id", "name", "slug", "workflow_state", "revision", "created_at", "updated_at") VALUES ($1, 'No occurrence', 'no-occurrence', 'approved', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [noOccurrenceId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000019', $1, $2, NULL, 'approved', 0)`, [noOccurrenceId, actorId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000019', $1, 0, '10000000-0000-4000-8000-000000000019', $2, ${completeFestivalSnapshotSql})`, [noOccurrenceId, actorId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'published', "revision" = 1, "first_published_at" = CURRENT_TIMESTAMP, "published_at" = CURRENT_TIMESTAMP, "calendar_published_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [noOccurrenceId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000020', $1, $2, 'approved', 'published', 1)`, [noOccurrenceId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000020', $1, 1, '10000000-0000-4000-8000-000000000020', $2, ${completeFestivalSnapshotSql})`, [noOccurrenceId, actorId]);
  }, "Publication without a primary occurrence", /primary occurrence/);

  const liveInsertId = "00000000-0000-4000-8000-000000000203";
  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "Festival" ("id", "name", "slug", "workflow_state", "revision", "first_published_at", "published_at", "calendar_published_at", "created_at", "updated_at") VALUES ($1, 'Live insert without occurrence', 'live-insert-without-occurrence', 'published', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [liveInsertId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000021', $1, $2, NULL, 'published', 0)`, [liveInsertId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000021', $1, 0, '10000000-0000-4000-8000-000000000021', $2, ${completeFestivalSnapshotSql})`, [liveInsertId, actorId]);
  }, "Live festival insert without a primary occurrence", /primary occurrence/);

  const occurrences = await client.query(`SELECT "festival_id", count(*)::int AS count, bool_and("is_primary") AS primary FROM "FestivalOccurrence" GROUP BY "festival_id"`);
  if (!occurrences.rows.some((row) => row.festival_id === approvedId && row.count === 1 && row.primary)) throw new Error("Primary occurrence backfill failed.");
  const primaryOccurrence = await client.query(`SELECT "id" FROM "FestivalOccurrence" WHERE "festival_id" = $1 AND "is_primary"`, [approvedId]);
  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "Schedule" ("id", "festival_id", "occurrence_id", "title", "created_at", "updated_at") VALUES ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000106', $1, 'Wrong parent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [primaryOccurrence.rows[0].id]);
  }, "Composite schedule parent mismatch", /foreign key/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'published', "revision" = 1, "first_published_at" = CURRENT_TIMESTAMP, "published_at" = CURRENT_TIMESTAMP, "calendar_published_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [approvedId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000031', $1, $2, 'approved', 'published', 1)`, [approvedId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000031', $1, 1, '10000000-0000-4000-8000-000000000031', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('first_published_at', '2000-01-01T00:00:00.000Z'))`, [approvedId, actorId]);
  }, "Publication metadata snapshot mismatch", /does not match approved festival scalar fields/);

  await client.query("BEGIN");
  await client.query(`UPDATE "Festival" SET "workflow_state" = 'published', "revision" = 1, "first_published_at" = CURRENT_TIMESTAMP, "published_at" = CURRENT_TIMESTAMP, "calendar_published_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [approvedId]);
  await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision") VALUES ('10000000-0000-4000-8000-000000000030', $1, $2, 'approved', 'published', 1)`, [approvedId, actorId]);
  await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000030', $1, 1, '10000000-0000-4000-8000-000000000030', $2, ${completeFestivalSnapshotSql})`, [approvedId, actorId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "Festival" SET "workflow_state" = 'canceled', "revision" = 2, "published_at" = NULL, "canceled_at" = CURRENT_TIMESTAMP, "public_message" = 'Canceled safely', "calendar_status" = 'canceled' WHERE "id" = $1`, [approvedId]);
    await client.query(`INSERT INTO "FestivalTransition" ("id", "festival_id", "actor_user_id", "from_state", "to_state", "revision", "reason", "public_message") VALUES ('10000000-0000-4000-8000-000000000032', $1, $2, 'published', 'canceled', 2, 'Private cancellation reason', 'Canceled safely')`, [approvedId, actorId]);
    await client.query(`INSERT INTO "FestivalRevision" ("id", "festival_id", "workflow_revision", "transition_id", "actor_user_id", "snapshot") VALUES ('20000000-0000-4000-8000-000000000032', $1, 2, '10000000-0000-4000-8000-000000000032', $2, ${completeFestivalSnapshotSql} || jsonb_build_object('public_message', 'Mismatched cancellation message'))`, [approvedId, actorId]);
  }, "Cancellation metadata snapshot mismatch", /does not match approved festival scalar fields/);
  await expectTransactionRejected(async () => {
    await client.query(`DELETE FROM "FestivalOccurrence" WHERE "id" = $1`, [primaryOccurrence.rows[0].id]);
  }, "Sole live primary occurrence deletion", /primary occurrence/);

  await client.query(`INSERT INTO "FestivalAsset" ("id", "festival_id", "uploader_user_id", "drive_file_id", "server_filename", "original_filename", "mime_type", "byte_size", "checksum_sha256", "purpose", "alt_text", "rights_version", "rights_acknowledged_at", "updated_at") VALUES ('60000000-0000-4000-8000-000000000001', $1, $2, 'f08-race-drive-file', 'race.png', 'race.png', 'image/png', 10, $3, 'logo', 'Festival logo', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [approvedId, producerId, "a".repeat(64)]);
  const raceClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await raceClient.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT "id" FROM "Festival" WHERE "id" = $1 FOR UPDATE`, [approvedId]);
    await raceClient.query("BEGIN");
    await raceClient.query("SET LOCAL lock_timeout = '100ms'");
    let transitionBlocked = false;
    try {
      await raceClient.query(`UPDATE "Festival" SET "workflow_state" = 'unpublished', "revision" = 2, "published_at" = NULL WHERE "id" = $1 AND "workflow_state" = 'published' AND "revision" = 1`, [approvedId]);
    } catch (error) {
      transitionBlocked = error.code === "55P03";
    }
    await raceClient.query("ROLLBACK");
    if (!transitionBlocked) throw new Error("Concurrent transition was not serialized behind the asset-review festival lock.");
    const reviewed = await client.query(`UPDATE "FestivalAsset" SET "editorial_status" = 'approved', "reviewed_by_user_id" = $2, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = '60000000-0000-4000-8000-000000000001' AND "festival_id" = $1 AND "editorial_status" = 'pending'`, [approvedId, actorId]);
    if (reviewed.rowCount !== 1) throw new Error("Conditional asset review did not update one row.");
    await client.query("COMMIT");
  } finally {
    await raceClient.end();
  }

  const staleRace = await client.query(`UPDATE "Festival" SET "workflow_state" = 'unpublished', "revision" = 2, "published_at" = NULL WHERE "id" = $1 AND "workflow_state" = 'published' AND "revision" = 0`, [approvedId]);
  if (staleRace.rowCount !== 0) throw new Error("Stale transition race predicate updated a row.");

  console.log("Verified F-08 deferred state-only/audit/snapshot/outbox/actor/reason rules, shared approved-private semantics, publication primary requirement, composite schedule parent FK, primary deletion protection, serialized asset-review/transition race behavior, and stale transition race behavior.");

  await client.query(readFileSync(join(migrationsRoot, f09Migration, "migration.sql"), "utf8"));
  const f09Constraints = [
    "FestivalSocialFeed_hashtag_normalized", "FestivalSocialFeed_provider_feed_id_safe",
    "FestivalSocialFeed_error_code_redacted", "FestivalSocialFeed_sync_attempt_coherence", "FestivalSocialFeed_source_revision_positive",
    "SocialPost_source_revision_positive", "SocialPost_review_coherence",
    "SocialPostModerationTransition_status_changed", "SocialPostModerationTransition_reason_required",
  ];
  const f09ConstraintRows = await client.query(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`, [f09Constraints]);
  if (f09ConstraintRows.rowCount !== f09Constraints.length) throw new Error("F-09 social-feed constraints are incomplete.");
  const f09Triggers = [
    "SocialPostModerationTransition_immutable_trigger", "SocialPost_moderation_revision_trigger",
    "SocialPost_moderation_audit_commit_trigger", "SocialPostModerationTransition_coherence_commit_trigger",
  ];
  const f09TriggerRows = await client.query(`SELECT tgname, tgdeferrable, tginitdeferred FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`, [f09Triggers]);
  if (f09TriggerRows.rowCount !== f09Triggers.length) throw new Error("F-09 social-feed triggers are incomplete.");
  const moderationCommitTrigger = f09TriggerRows.rows.find((row) => row.tgname === "SocialPost_moderation_audit_commit_trigger");
  if (!moderationCommitTrigger?.tgdeferrable || !moderationCommitTrigger?.tginitdeferred) throw new Error("F-09 moderation audit trigger is not initially deferred.");

  const socialFeedId = "80000000-0000-4000-8000-000000000001";
  const socialPostId = "81000000-0000-4000-8000-000000000001";
  await client.query(`INSERT INTO "FestivalSocialFeed" ("id", "festival_id", "hashtag", "enabled", "provider", "provider_feed_id", "revision", "updated_at") VALUES ($1, $2, 'LegacyApprovedFest', TRUE, 'curator', 'f09-test-feed', 1, CURRENT_TIMESTAMP)`, [socialFeedId, approvedId]);
  await client.query(`INSERT INTO "SocialPost" ("id", "social_feed_id", "provider_item_id", "network", "canonical_url", "author_name", "text_excerpt", "updated_at") VALUES ($1, $2, 'provider-post-1', 'instagram', 'https://www.instagram.com/p/f09-test/', 'Fixture Author', 'Approved-only database evidence.', CURRENT_TIMESTAMP)`, [socialPostId, socialFeedId]);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "moderation_status" = 'approved', "moderation_revision" = 1, "reviewed_by_user_id" = $2, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialPostId, actorId]);
  }, "Social moderation without immutable audit", /matching immutable audit transition/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "SocialPost" ("id", "social_feed_id", "provider_item_id", "network", "canonical_url", "text_excerpt", "moderation_status", "moderation_revision", "reviewed_by_user_id", "reviewed_at", "updated_at") VALUES ('81000000-0000-4000-8000-000000000002', $1, 'provider-post-unsafe', 'instagram', 'https://www.instagram.com/p/f09-unsafe/', 'Unsafe direct approval.', 'approved', 1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [socialFeedId, actorId]);
  }, "Initially approved social post", /must enter pending moderation/);

  await client.query("BEGIN");
  await client.query(`UPDATE "SocialPost" SET "moderation_status" = 'approved', "moderation_revision" = 1, "reviewed_by_user_id" = $2, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialPostId, actorId]);
  await client.query(`INSERT INTO "SocialPostModerationTransition" ("id", "social_post_id", "actor_user_id", "from_status", "to_status", "revision") VALUES ('82000000-0000-4000-8000-000000000001', $1, $2, 'pending', 'approved', 1)`, [socialPostId, actorId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  const secondSocialFeedId = "80000000-0000-4000-8000-000000000002";
  const pendingPayloadPostId = "81000000-0000-4000-8000-000000000004";
  await client.query(`INSERT INTO "FestivalSocialFeed" ("id", "festival_id", "hashtag", "enabled", "provider", "provider_feed_id", "revision", "updated_at") VALUES ($1, $2, 'SecondEvidenceFest', TRUE, 'curator', 'second-evidence-feed', 1, CURRENT_TIMESTAMP)`, [secondSocialFeedId, pendingId]);
  await client.query(`INSERT INTO "SocialPost" ("id", "social_feed_id", "provider_item_id", "network", "canonical_url", "text_excerpt", "updated_at") VALUES ($1, $2, 'provider-post-payload', 'instagram', 'https://www.instagram.com/p/f09-payload/', 'Pending payload evidence.', CURRENT_TIMESTAMP)`, [pendingPayloadPostId, socialFeedId]);
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "text_excerpt" = 'Replacement during approval', "canonical_url" = 'https://www.instagram.com/p/replacement-during-approval/', "moderation_status" = 'approved', "moderation_revision" = 1, "reviewed_by_user_id" = $2, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [pendingPayloadPostId, actorId]);
    await client.query(`INSERT INTO "SocialPostModerationTransition" ("id", "social_post_id", "actor_user_id", "from_status", "to_status", "revision") VALUES ('82000000-0000-4000-8000-000000000004', $1, $2, 'pending', 'approved', 1)`, [pendingPayloadPostId, actorId]);
  }, "Payload replacement during approval", /content is immutable/);
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "social_feed_id" = $2, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [pendingPayloadPostId, secondSocialFeedId]);
  }, "Pending social post feed move", /source identity is immutable/);
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "social_feed_id" = $2, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialPostId, secondSocialFeedId]);
  }, "Approved social post feed move", /source identity is immutable/);

  await client.query(`INSERT INTO "SocialPost" ("id", "social_feed_id", "provider_item_id", "network", "canonical_url", "text_excerpt", "updated_at") VALUES ('81000000-0000-4000-8000-000000000003', $1, 'provider-post-hidden', 'facebook', 'https://www.facebook.com/f09-hidden/', 'Hidden database evidence.', CURRENT_TIMESTAMP)`, [socialFeedId]);
  await client.query("BEGIN");
  await client.query(`UPDATE "SocialPost" SET "moderation_status" = 'hidden', "moderation_revision" = 1, "reviewed_by_user_id" = $1, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = '81000000-0000-4000-8000-000000000003'`, [actorId]);
  await client.query(`INSERT INTO "SocialPostModerationTransition" ("id", "social_post_id", "actor_user_id", "from_status", "to_status", "revision", "reason") VALUES ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003', $1, 'pending', 'hidden', 1, 'Not relevant to the festival')`, [actorId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "text_excerpt" = 'Unreviewed replacement content', "canonical_url" = 'https://www.instagram.com/p/replaced/', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialPostId]);
  }, "Reviewed social content mutation", /content is immutable/);
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPost" SET "reviewed_by_user_id" = $2, "reviewed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialPostId, producerId]);
  }, "Social review attribution mutation", /attribution cannot change/);
  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "SocialPostModerationTransition" ("id", "social_post_id", "actor_user_id", "from_status", "to_status", "revision", "reason") VALUES ('82000000-0000-4000-8000-000000000003', $1, $2, 'approved', 'hidden', 2, 'Pre-seeded transition')`, [socialPostId, actorId]);
  }, "Orphan social moderation transition", /matching post state/);

  const publicSocialPosts = await client.query(`SELECT post."text_excerpt" FROM "SocialPost" post JOIN "FestivalSocialFeed" feed ON feed."id" = post."social_feed_id" AND feed."source_revision" = post."source_revision" WHERE feed."id" = $1 AND post."moderation_status" = 'approved' ORDER BY post."id"`, [socialFeedId]);
  if (publicSocialPosts.rowCount !== 1 || publicSocialPosts.rows[0].text_excerpt !== "Approved-only database evidence.") throw new Error("F-09 approved-only public filtering evidence failed.");
  await client.query(`UPDATE "FestivalSocialFeed" SET "hashtag" = 'ChangedSourceFest', "provider" = 'flockler', "provider_feed_id" = 'changed-source-feed', "revision" = 2, "source_revision" = 2, "sync_cursor" = NULL, "last_sync_status" = 'never', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [socialFeedId]);
  const changedSourcePosts = await client.query(`SELECT count(*)::int AS count FROM "SocialPost" post JOIN "FestivalSocialFeed" feed ON feed."id" = post."social_feed_id" AND feed."source_revision" = post."source_revision" WHERE feed."id" = $1 AND post."moderation_status" = 'approved'`, [socialFeedId]);
  if (changedSourcePosts.rows[0].count !== 0) throw new Error("F-09 source generation exposed previously approved content.");
  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "SocialPostModerationTransition" SET "reason" = 'tampered' WHERE "id" = '82000000-0000-4000-8000-000000000001'`);
  }, "Social moderation audit update", /immutable/);
  await expectTransactionRejected(async () => {
    await client.query(`DELETE FROM "SocialPostModerationTransition" WHERE "id" = '82000000-0000-4000-8000-000000000001'`);
  }, "Social moderation audit delete", /immutable/);
  console.log("Verified F-09 pending-only ingestion, source-generation isolation, revision/content/attribution coherence, deferred immutable moderation audit chains, approved-only filtering, hidden exclusion, and audit mutation protection.");

  await client.query(readFileSync(join(migrationsRoot, festivalImportMigration, "migration.sql"), "utf8"));
  const importConstraints = [
    "FestivalImportBatch_source_checksum_sha256_format", "FestivalImportBatch_bound_digests_format", "FestivalImportBatch_prepared_counts_object", "FestivalImportBatch_row_counts_coherent",
    "FestivalImportBatch_status_coherence", "FestivalImportBatch_review_coherence", "FestivalImportBatch_backup_coherence", "FestivalImportBatch_production_completion_coherence",
    "FestivalImportBatch_backup_override_coherence", "FestivalImportRow_hashes_format",
    "FestivalImportRow_normalized_data_redacted", "FestivalImportRow_disposition_coherence",
    "FestivalImportRow_review_coherence", "FestivalImportRow_override_coherence",
    "FestivalImportIssue_code_stable", "FestivalImportIssue_safe_details_redacted", "FestivalImportIssue_row_id_batch_id_fkey",
  ];
  const importConstraintRows = await client.query(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`, [importConstraints]);
  if (importConstraintRows.rowCount !== importConstraints.length) throw new Error("Festival import lineage constraints are incomplete.");
  const importEvidenceTriggers = await client.query(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`, [[
    "FestivalImportBatch_evidence_immutable_trigger", "FestivalImportRow_prepared_evidence_immutable_trigger",
    "FestivalImportIssue_append_only_update_trigger", "FestivalImportIssue_append_only_delete_trigger",
  ]]);
  if (importEvidenceTriggers.rowCount !== 4) throw new Error("Festival import immutable-evidence triggers are incomplete.");
  const attemptTokenIndex = await client.query(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'FestivalImportBatch_apply_attempt_token_key'`);
  if (attemptTokenIndex.rowCount !== 1 || !/UNIQUE/.test(attemptTokenIndex.rows[0].indexdef)) throw new Error("Festival import apply-attempt token uniqueness is missing.");
  const importedTargetIndex = await client.query(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'FestivalImportRow_imported_target_festival_id_key'`);
  if (importedTargetIndex.rowCount !== 1 || !/UNIQUE/.test(importedTargetIndex.rows[0].indexdef) || !/disposition.*imported/.test(importedTargetIndex.rows[0].indexdef)) {
    throw new Error("Imported-target partial uniqueness is missing.");
  }

  const importBatchId = "90000000-0000-4000-8000-000000000001";
  await client.query(`INSERT INTO "FestivalImportBatch" (
    "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
    "operator_user_id", "total_row_count", "ready_row_count", "updated_at"
  ) VALUES ($1, 'review-fixture.csv', $2, repeat('1', 64), repeat('2', 64), '{"total":2,"ready":2}'::jsonb, 'festival_csv', 1, 'staging', $3, 2, 2, CURRENT_TIMESTAMP)`, [importBatchId, "b".repeat(64), actorId]);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportBatch" (
      "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
      "operator_user_id", "updated_at"
    ) VALUES ('90000000-0000-4000-8000-000000000002', 'same-source.csv', $1, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'staging', $2, CURRENT_TIMESTAMP)`, ["b".repeat(64), actorId]);
  }, "Duplicate source checksum across import batches", /source_checksum_sha256_key/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportBatch" (
      "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
      "operator_user_id", "total_row_count", "ready_row_count", "updated_at"
    ) VALUES ('90000000-0000-4000-8000-000000000002', 'bad-count.csv', $1, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'staging', $2, 2, 1, CURRENT_TIMESTAMP)`, ["c".repeat(64), actorId]);
  }, "Incoherent import batch counts", /row_counts_coherent/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportBatch" (
      "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
      "operator_user_id", "status", "started_at", "completed_at", "updated_at"
    ) VALUES ('90000000-0000-4000-8000-000000000003', 'unsafe-production.csv', $1, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'production', $2, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, ["d".repeat(64), actorId]);
  }, "Production import completion without reviewer and backup", /production_completion_coherence/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportBatch" (
      "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
      "operator_user_id", "status", "started_at", "updated_at"
    ) VALUES ('90000000-0000-4000-8000-000000000006', 'running-without-lease.csv', $1, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'staging', $2, 'running', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, ["9".repeat(64), actorId]);
  }, "Running import batch without a fenced lease", /status_coherence/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportBatch" (
      "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
      "operator_user_id", "backup_override_reason", "updated_at"
    ) VALUES ('90000000-0000-4000-8000-000000000004', 'partial-override.csv', $1, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'staging', $2, 'No backup available', CURRENT_TIMESTAMP)`, ["e".repeat(64), actorId]);
  }, "Partial backup override evidence", /backup_override_coherence/);

  const importedRowId = "91000000-0000-4000-8000-000000000001";
  await client.query(`INSERT INTO "FestivalImportRow" (
    "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
    "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "disposition", "target_festival_id", "updated_at"
  ) VALUES ($1, $2, 1, 'record-1', 2, $3, $4, '{"name":"Redacted festival"}'::jsonb, 'imported', repeat('9', 64), 'imported', $5, CURRENT_TIMESTAMP)`,
  [importedRowId, importBatchId, "1".repeat(64), "2".repeat(64), approvedId]);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportRow" (
      "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
      "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "updated_at"
    ) VALUES ('91000000-0000-4000-8000-000000000002', $1, 1, 'same-row-number', 3, $2, $3, '{"name":"Same row"}'::jsonb, 'ready', repeat('9', 64), CURRENT_TIMESTAMP)`,
    [importBatchId, "3".repeat(64), "4".repeat(64)]);
  }, "Duplicate row number within an import batch", /batch_id_row_number_key/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportRow" (
      "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
      "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "updated_at"
    ) VALUES ('91000000-0000-4000-8000-000000000002', $1, 2, 'bad-hash', 3, 'NOT-A-SHA256', $2, '{"name":"Bad hash"}'::jsonb, 'ready', repeat('9', 64), CURRENT_TIMESTAMP)`,
    [importBatchId, "4".repeat(64)]);
  }, "Invalid import row hash", /hashes_format/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportRow" (
      "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
      "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "disposition", "target_festival_id", "updated_at"
    ) VALUES ('91000000-0000-4000-8000-000000000002', $1, 2, 'record-2', 3, $2, $3, '{"name":"Second"}'::jsonb, 'imported', repeat('9', 64), 'imported', $4, CURRENT_TIMESTAMP)`,
    [importBatchId, "3".repeat(64), "4".repeat(64), approvedId]);
  }, "Second imported row for one target festival", /imported_target_festival_id_key/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportRow" (
      "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
      "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "disposition", "updated_at"
    ) VALUES ('91000000-0000-4000-8000-000000000003', $1, 2, 'record-3', 4, $2, $3, '{"nested":{"contactEmail":"must-not-persist@example.test"}}'::jsonb, 'ready', repeat('9', 64), 'ready', CURRENT_TIMESTAMP)`,
    [importBatchId, "5".repeat(64), "6".repeat(64)]);
  }, "Nested raw contact data in normalized import evidence", /normalized_data_redacted/);

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportRow" (
      "id", "batch_id", "row_number", "source_record_id", "source_start_line", "source_hash_sha256",
      "normalized_hash_sha256", "normalized_data", "prepared_disposition", "prepared_digest_sha256", "disposition", "updated_at"
    ) VALUES ('91000000-0000-4000-8000-000000000004', $1, 2, 'record-4', 5, $2, $3, '{"name":"Missing target"}'::jsonb, 'imported', repeat('9', 64), 'imported', CURRENT_TIMESTAMP)`,
    [importBatchId, "7".repeat(64), "8".repeat(64)]);
  }, "Imported disposition without target lineage", /disposition_coherence/);

  const secondImportBatchId = "90000000-0000-4000-8000-000000000005";
  await client.query(`INSERT INTO "FestivalImportBatch" (
    "id", "source_name", "source_checksum_sha256", "category_map_checksum_sha256", "prepared_digest_sha256", "prepared_counts", "import_profile", "import_profile_version", "environment",
    "operator_user_id", "updated_at"
  ) VALUES ($1, 'second-fixture.csv', $2, repeat('1', 64), repeat('2', 64), '{}'::jsonb, 'festival_csv', 1, 'staging', $3, CURRENT_TIMESTAMP)`, [secondImportBatchId, "f".repeat(64), actorId]);
  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportIssue" ("id", "batch_id", "row_id", "severity", "code", "message")
      VALUES ('92000000-0000-4000-8000-000000000001', $1, $2, 'error', 'row_mismatch', 'Safe mismatch evidence')`,
    [secondImportBatchId, importedRowId]);
  }, "Import issue linked to a row in another batch", /row_id_batch_id_fkey/);
  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "FestivalImportIssue" ("id", "batch_id", "severity", "code", "message", "safe_details")
      VALUES ('92000000-0000-4000-8000-000000000002', $1, 'warning', 'unsafe_details', 'Safe summary only', '{"nested":{"raw-contact":"must-not-persist"}}'::jsonb)`,
    [importBatchId]);
  }, "Nested raw contact data in import issue safe details", /safe_details_redacted/);

  console.log("Verified festival import migration presence, ordinary source uniqueness, imported-target partial uniqueness, redacted lineage fields, Restrict relations, and representative hash/count/status/production/override/disposition/issue coherence rejections.");

  await client.query(readFileSync(join(migrationsRoot, userManagementMigration, "migration.sql"), "utf8"));
  const userManagementConstraints = [
    "User_role_allowlist", "User_revision_nonnegative", "User_deactivation_coherence",
    "UserAccountTransition_shape", "UserAccountTransition_role_allowlist",
  ];
  const userConstraintRows = await client.query(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`, [userManagementConstraints]);
  if (userConstraintRows.rowCount !== userManagementConstraints.length) throw new Error("User-management constraints are incomplete.");
  const userManagementTriggers = [
    "User_account_creation_audit_trigger", "User_account_revision_trigger",
    "User_account_insert_audit_commit_trigger", "User_account_update_audit_commit_trigger",
    "UserAccountTransition_immutable_trigger", "UserAccountTransition_coherence_commit_trigger",
  ];
  const userTriggerRows = await client.query(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`, [userManagementTriggers]);
  if (userTriggerRows.rowCount !== userManagementTriggers.length) throw new Error("User-management audit triggers are incomplete.");

  await expectTransactionRejected(async () => {
    await client.query(`INSERT INTO "User" ("id", "email", "password_hash", "role", "created_at", "updated_at") VALUES ('a0000000-0000-4000-8000-000000000001', 'invalid-role@example.test', 'disposable-only', 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  }, "User role outside the allowlist", /User_role_allowlist/);

  const firstSuperAdminId = "a0000000-0000-4000-8000-000000000010";
  const secondSuperAdminId = "a0000000-0000-4000-8000-000000000011";
  await client.query(`INSERT INTO "User" ("id", "email", "password_hash", "role", "created_at", "updated_at") VALUES ($1, 'super-one@example.test', 'disposable-only', 'super_admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [firstSuperAdminId]);
  await client.query(`INSERT INTO "User" ("id", "email", "password_hash", "role", "created_at", "updated_at") VALUES ($1, 'super-two@example.test', 'disposable-only', 'super_admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [secondSuperAdminId]);
  const creationAudits = await client.query(`SELECT count(*)::int AS count FROM "UserAccountTransition" WHERE "user_id" = ANY($1::text[]) AND "action" = 'account_created' AND "revision" = 0`, [[firstSuperAdminId, secondSuperAdminId]]);
  if (creationAudits.rows[0].count !== 2) throw new Error("Account creation audits were not generated.");

  await client.query("BEGIN");
  await client.query(`UPDATE "User" SET "role" = 'admin', "revision" = 1, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [secondSuperAdminId]);
  await client.query(`INSERT INTO "UserAccountTransition" ("id", "user_id", "actor_user_id", "action", "from_role", "to_role", "revision") VALUES ('b0000000-0000-4000-8000-000000000011', $1, $2, 'role_changed', 'super_admin', 'admin', 1)`, [secondSuperAdminId, firstSuperAdminId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "User" SET "status" = 'deactivated', "deactivated_at" = CURRENT_TIMESTAMP, "revision" = 1, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [firstSuperAdminId]);
    await client.query(`INSERT INTO "UserAccountTransition" ("id", "user_id", "actor_user_id", "action", "from_status", "to_status", "revision") VALUES ('b0000000-0000-4000-8000-000000000010', $1, $1, 'delete_equivalent', 'active', 'deactivated', 1)`, [firstSuperAdminId]);
  }, "Final active super admin deactivation", /final active super admin/i);

  await client.query("BEGIN");
  await client.query(`UPDATE "User" SET "status" = 'deactivated', "deactivated_at" = CURRENT_TIMESTAMP, "revision" = 2, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [secondSuperAdminId]);
  await client.query(`INSERT INTO "UserAccountTransition" ("id", "user_id", "actor_user_id", "action", "from_status", "to_status", "revision") VALUES ('b0000000-0000-4000-8000-000000000012', $1, $2, 'delete_equivalent', 'active', 'deactivated', 2)`, [secondSuperAdminId, firstSuperAdminId]);
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "UserAccountTransition" SET "reason" = 'rewritten' WHERE "id" = 'b0000000-0000-4000-8000-000000000012'`);
  }, "User account audit mutation", /immutable/);

  await expectTransactionRejected(async () => {
    await client.query(`DELETE FROM "User" WHERE "id" = $1`, [secondSuperAdminId]);
  }, "Physical user deletion", /Hard user deletion is forbidden/);

  await expectTransactionRejected(async () => {
    await client.query(`UPDATE "User" SET "role" = 'producer', "revision" = 1, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1`, [actorId]);
  }, "Unaudited user role change", /matching immutable audit transition/);

  console.log("Verified user role/status constraints, automatic creation audits, revisioned role and delete-equivalent transitions, final active super-admin protection, hard-delete prohibition, deferred audit coherence, and audit immutability.");

  /* Bring the schema up to head before the Prisma evidence run.
   *
   * The blocks above stop at the last migration they assert on, but
   * `scripts/migrate-prisma-evidence.mjs` imports the generated client, whose queries select every
   * column in the *current* schema. Any migration added after the last named one above therefore
   * breaks that script — as `20260806164625_add_festival_geocoordinates` did, failing every run with
   * `The column Festival.latitude does not exist` from 2026-08-06 until this loop was added.
   *
   * Derived from the sorted list rather than named explicitly, so a new migration is picked up
   * automatically. Naming them is what let phase one fall five days behind the schema; only
   * migrations that need bespoke constraint assertions should be named above.
   *
   * These run against the fixture rows inserted earlier, which is deliberate: a migration that
   * cannot apply to populated tables should fail here rather than during `migrate deploy` in
   * production. The final `resetPublicSchema()` + `migrate deploy` below still verifies the chain
   * from empty, so both paths stay covered. */
  const tailMigrations = migrationNames.filter((name) => name > userManagementMigration);
  for (const name of tailMigrations) {
    await client.query(readFileSync(join(migrationsRoot, name, "migration.sql"), "utf8"));
  }
  console.log(`Applied ${tailMigrations.length} post-assertion migrations to reach schema head before the Prisma evidence run.`);
} finally {
  await client.end();
}

run(tsxBin, ["scripts/migrate-prisma-evidence.mjs"]);

await resetPublicSchema();
run(prismaBin, ["migrate", "deploy"]);
run(prismaBin, ["migrate", "status"]);
console.log("Verified clean Prisma migration history after disposable PostgreSQL integration evidence.");

process.env.LOCAL_ADMIN_EMAIL ||= "f08-admin@example.test";
process.env.LOCAL_ADMIN_PASSWORD ||= "f08-disposable-admin-password";
process.env.LOCAL_PRODUCER_EMAIL ||= "f08-producer@example.test";
process.env.LOCAL_PRODUCER_PASSWORD ||= "f08-disposable-producer-password";
process.env.AUTH_SECRET ||= "f08-disposable-auth-secret-at-least-32-characters";

async function seededCounts() {
  const countClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await countClient.connect();
  try {
    const result = await countClient.query(`SELECT
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Category") AS categories,
      (SELECT count(*)::int FROM "Tag") AS tags,
      (SELECT count(*)::int FROM "Festival") AS festivals,
      (SELECT count(*)::int FROM "FestivalTransition") AS transitions,
      (SELECT count(*)::int FROM "FestivalRevision") AS revisions,
      (SELECT count(*)::int FROM "Schedule") AS schedules,
      (SELECT count(*)::int FROM "FestivalCategory") AS festival_categories,
      (SELECT count(*)::int FROM "FestivalTag") AS festival_tags`);
    return result.rows[0];
  } finally {
    await countClient.end();
  }
}

run(prismaBin, ["db", "seed"]);
const firstSeedCounts = await seededCounts();
run(prismaBin, ["db", "seed"]);
const secondSeedCounts = await seededCounts();
if (JSON.stringify(firstSeedCounts) !== JSON.stringify(secondSeedCounts)) {
  throw new Error(`Seed rerun changed row counts: ${JSON.stringify(firstSeedCounts)} -> ${JSON.stringify(secondSeedCounts)}`);
}
if (secondSeedCounts.festivals !== 10 || secondSeedCounts.transitions !== 10 || secondSeedCounts.revisions !== 10) {
  throw new Error(`Seed audit counts are incomplete: ${JSON.stringify(secondSeedCounts)}`);
}
run(tsxBin, ["scripts/verify-seeded-admin.mjs"]);
console.log(`Verified two idempotent audited seed runs with stable counts: ${JSON.stringify(secondSeedCounts)}.`);
