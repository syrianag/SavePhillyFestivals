import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import pg from "pg";

import { assertSafeTestDatabaseUrl } from "../src/lib/database-safety.js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(projectRoot, "../..");
const prismaBin = join(workspaceRoot, "node_modules/.bin/prisma");
const tsxBin = join(workspaceRoot, "node_modules/.bin/tsx");
const migrationsRoot = join(projectRoot, "prisma/migrations");
const f07Migration = "20260804050000_producer_submission_workflow";

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
  console.log(`Seeded pre-F-07 representative legacy statuses: ${legacyStatuses.join(", ")}.`);

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
} finally {
  await client.end();
}

run(tsxBin, ["scripts/migrate-prisma-evidence.mjs"]);

await resetPublicSchema();
run(prismaBin, ["migrate", "deploy"]);
run(prismaBin, ["migrate", "status"]);
console.log("Verified clean Prisma migration history after disposable PostgreSQL integration evidence.");
