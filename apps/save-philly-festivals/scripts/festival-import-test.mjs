import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { config } from "dotenv";

import { createFestivalImportRepository } from "../src/features/festival-import/festival-import-repository.js";
import { createFestivalImportReport, formatFestivalImportReport } from "../src/features/festival-import/festival-import-report.js";
import {
  createFestivalImportService,
  festivalCategoryMapChecksum,
} from "../src/features/festival-import/festival-import-service.js";
import { festivalCsvChecksum } from "../src/features/festival-import/festival-import-profile.js";
import { assertSafeTestDatabaseUrl } from "../src/lib/database-safety.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(appRoot, "../..");
config({ path: [join(appRoot, ".env.local"), join(appRoot, ".env")], quiet: true });
const target = assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
console.log(`Using server-provisioned disposable database ${target.databaseName} on ${target.hostname}.`);

const migrate = spawnSync(join(workspaceRoot, "node_modules/.bin/prisma"), ["migrate", "deploy"], {
  cwd: appRoot,
  env: process.env,
  stdio: "inherit",
});
if (migrate.error) throw migrate.error;
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const categoryMap = {
  version: 1,
  categories: [
    { slug: "music", aliases: ["Music"] },
    { slug: "food", aliases: ["Food & Drink"] },
    { slug: "art", aliases: ["Arts & Crafts"] },
    { slug: "cultural", aliases: ["Cultural Heritage"] },
    { slug: "community", aliases: ["community"] },
    { slug: "caribbean", aliases: ["Caribbean"] },
  ],
};
const categoryMapBytes = Buffer.from(`${JSON.stringify(categoryMap, null, 2)}\n`);
const source = Buffer.from(`Festival Name,Start Date,End Date,2027 Dates (if applicable),Location,Type,Website,Organiser/Contact,Contact email,Contact Phone,Email sent?\nImport Test One,9/12/2028,,2029 date TBD,Test Hall,Music,https://example.test/fest,Private Person,private-contact@example.test,215-555-0199,FALSE\nImport Test Exact,10/1/2028,,,Test Park,community,,,,,FALSE\nImport Test Exact,10/1/2028,,,Test Park,community,,,,,FALSE\nImport Test Conflict,11/2/2028,,,Place A,Music,,,,,FALSE\nImport Test Conflict,11/2/2028,,,Place B,Music,,,,,FALSE\nImport Test Invalid,Every Thursday,,,,Music,,,,,FALSE\n`);
const sourceChecksum = festivalCsvChecksum(source);
const operatorId = "a5700000-0000-4000-8000-000000000001";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const concurrentPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  await prisma.user.upsert({
    where: { email: "festival-import-admin@example.test" },
    update: { role: "admin" },
    create: { id: operatorId, email: "festival-import-admin@example.test", password_hash: "disposable-only", role: "admin" },
  });
  for (const category of categoryMap.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { slug: category.slug, name: category.slug[0].toUpperCase() + category.slug.slice(1) },
    });
  }

  const repository = createFestivalImportRepository(prisma);
  const service = createFestivalImportService({ repository });
  const concurrentService = createFestivalImportService({ repository: createFestivalImportRepository(concurrentPrisma) });
  const input = {
    source,
    sourceName: "festival-import-integration.csv",
    expectedChecksum: sourceChecksum,
    categoryMap,
    categoryMapBytes,
    environment: "test",
    operatorUserId: operatorId,
  };
  console.log("Verifying concurrent prepare convergence.");
  const concurrentPrepared = await Promise.all([service.prepare(input), concurrentService.prepare(input)]);
  console.log("Concurrent prepare convergence verified.");
  assert.equal(concurrentPrepared.filter(({ noOp }) => noOp === false).length, 1);
  assert.equal(concurrentPrepared.filter(({ noOp }) => noOp === true).length, 1);
  assert.equal(concurrentPrepared[0].batch.id, concurrentPrepared[1].batch.id);
  const prepared = concurrentPrepared[0];

  const staleClaimedAt = new Date("2026-08-05T08:00:00.000Z");
  const staleAttemptToken = "00000000-0000-4000-8000-000000000099";
  await repository.claimApplyAttempt({
    batchId: prepared.batch.id,
    priorStatus: "prepared",
    attemptToken: staleAttemptToken,
    claimedAt: staleClaimedAt,
    expiresAt: new Date("2026-08-05T08:01:00.000Z"),
  });
  const recoveryNow = new Date("2026-08-05T08:02:00.000Z");
  let importAttempts = 0;
  let staleTokenRejected = false;
  const injectedRepository = {
    ...repository,
    async importPreparedRow(arguments_) {
      importAttempts += 1;
      if (importAttempts === 1) {
        await assert.rejects(
          repository.importPreparedRow({
            ...arguments_,
            attemptToken: staleAttemptToken,
            heartbeatAt: recoveryNow,
            attemptExpiresAt: new Date(recoveryNow.valueOf() + 60_000),
          }),
          (error) => error?.code === "stale_apply_attempt",
        );
        staleTokenRejected = true;
      }
      if (importAttempts === 2) throw new Error("injected adapter failure private-contact@example.test 215-555-0199");
      return repository.importPreparedRow(arguments_);
    },
  };
  console.log("Recovering an expired running attempt and injecting a mid-batch apply failure.");
  await assert.rejects(
    createFestivalImportService({ repository: injectedRepository, now: () => recoveryNow, applyLeaseMs: 60_000 }).apply({ ...input, batchId: prepared.batch.id, resume: true }),
    /injected adapter failure/u,
  );
  assert.equal(staleTokenRejected, true);
  const failed = await repository.findBatchById(prepared.batch.id);
  assert.equal(failed.status, "failed");
  assert.equal(failed.imported_row_count, 1);
  assert.equal(failed.ready_row_count, 1);
  assert.equal(failed.failure_code, "apply_failed");
  assert.equal(failed.failure_message, "Festival import apply failed; inspect restricted operational diagnostics.");
  assert.equal(failed.failure_message.includes("private-contact@example.test"), false);
  await assert.rejects(
    service.apply({ ...input, batchId: prepared.batch.id }),
    (error) => error?.code === "resume_required",
  );

  console.log("Resuming the failed batch.");
  const applied = await service.apply({ ...input, batchId: prepared.batch.id, resume: true });
  assert.equal(applied.resumed, true);
  assert.equal(applied.reconciliation.ok, true);
  assert.deepEqual(applied.reconciliation.counts, {
    total: 6,
    ready: 0,
    imported: 2,
    duplicate: 1,
    quarantined: 3,
    failed: 0,
    warningIssues: 2,
    errorIssues: 3,
  });

  const beforeReplay = [
    await prisma.festival.count({ where: { import_target_rows: { some: { batch_id: prepared.batch.id } } } }),
    await prisma.festivalOccurrence.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
    await prisma.festivalTransition.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
    await prisma.festivalRevision.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
  ];
  const replay = await service.apply({ ...input, batchId: prepared.batch.id });
  const afterReplay = [
    await prisma.festival.count({ where: { import_target_rows: { some: { batch_id: prepared.batch.id } } } }),
    await prisma.festivalOccurrence.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
    await prisma.festivalTransition.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
    await prisma.festivalRevision.count({ where: { festival: { import_target_rows: { some: { batch_id: prepared.batch.id } } } } }),
  ];
  assert.equal(replay.noOp, true);
  assert.deepEqual(afterReplay, beforeReplay);
  assert.deepEqual(afterReplay, [2, 2, 2, 2]);

  const imported = await prisma.festival.findMany({
    where: { import_target_rows: { some: { batch_id: prepared.batch.id } } },
    include: { occurrences: true, categories: true, workflow_transitions: true, revisions: true },
  });
  assert.equal(imported.every((festival) => festival.status === "draft" && festival.workflow_state === "draft" && festival.published_at === null), true);
  assert.equal(imported.every((festival) => festival.occurrences.length === 1 && festival.categories.length === 1 && festival.workflow_transitions.length === 1 && festival.revisions.length === 1), true);
  const publiclyEligible = imported.filter((festival) => festival.status === "published" && festival.workflow_state === "published");
  assert.equal(publiclyEligible.length, 0);

  const report = formatFestivalImportReport(createFestivalImportReport(applied));
  assert.equal(report.includes("private-contact@example.test"), false);
  assert.equal(report.includes("Private Person"), false);
  assert.equal(report.includes("215-555-0199"), false);
  const durableEvidence = JSON.stringify(await prisma.festivalImportRow.findMany({ where: { batch_id: prepared.batch.id }, select: { normalized_data: true, issues: { select: { safe_details: true } } } }));
  assert.equal(durableEvidence.includes("private-contact@example.test"), false);
  assert.equal(durableEvidence.includes("Private Person"), false);
  assert.equal(durableEvidence.includes("215-555-0199"), false);
  assert.equal(festivalCategoryMapChecksum(categoryMapBytes).length, 64);
  console.log(`Festival import integration passed for batch ${prepared.batch.id}; concurrent prepare converged, injected partial failure resumed, replay made zero writes, and report/lineage remained redacted.`);
} finally {
  await Promise.all([prisma.$disconnect(), concurrentPrisma.$disconnect()]);
}
