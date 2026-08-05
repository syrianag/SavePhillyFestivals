import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { config } from "dotenv";

import { createFestivalImportRepository } from "../src/features/festival-import/festival-import-repository.js";
import {
  FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION,
  createFestivalImportService,
  festivalCategoryMapChecksum,
} from "../src/features/festival-import/festival-import-service.js";
import { createFestivalImportReport, formatFestivalImportReport } from "../src/features/festival-import/festival-import-report.js";
import { assertSafeTestDatabaseUrl } from "../src/lib/database-safety.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(appRoot, "../..");
config({ path: [join(appRoot, ".env.local"), join(appRoot, ".env")], quiet: true });

function usage() {
  return `Usage:
  festival-import.mjs dry-run --file <csv> --expected-checksum <sha256> --category-map <json> --expected-category-map-checksum <sha256> [--environment ...]
  festival-import.mjs prepare --file <csv> --expected-checksum <sha256> --category-map <json> --expected-category-map-checksum <sha256> --operator-user-id <uuid> [--environment ...]
  festival-import.mjs review --batch-id <uuid> --file <csv> --expected-checksum <sha256> --category-map <json> --expected-category-map-checksum <sha256> --approval-file <json> [--review-public-key-file <pem>] [--environment ...]
  festival-import.mjs apply --batch-id <uuid> --file <csv> --expected-checksum <sha256> --category-map <json> --expected-category-map-checksum <sha256> --operator-user-id <uuid> [--resume] [--environment ...]
  festival-import.mjs report --batch-id <uuid> [--format json|csv] [--output <path>]

Controlled staging/production use additionally requires --allow-controlled-target. Production review requires a detached
Ed25519 --approval-file and FESTIVAL_IMPORT_REVIEW_PUBLIC_KEY or --review-public-key-file. Local/test may instead use
--test-reviewer-user-id. Production apply requires immutable signed review and --confirmation ${FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION}.
Failed or expired running batches require --resume.
`;
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!["dry-run", "prepare", "review", "apply", "report"].includes(mode)) throw Object.assign(new Error("Invalid festival import command"), { code: "invalid_command" });
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw Object.assign(new Error("Unexpected festival import argument"), { code: "invalid_argument" });
    const key = token.slice(2).replaceAll("-", "_");
    if (["allow_controlled_target", "resume"].includes(key)) options[key] = true;
    else {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw Object.assign(new Error("Missing festival import argument value"), { code: "missing_argument" });
      options[key] = value;
      index += 1;
    }
  }
  return { mode, options };
}

function required(options, name) {
  if (!options[name]) throw Object.assign(new Error("Required festival import argument is missing"), { code: "missing_argument" });
  return options[name];
}

function assertDigest(value, label) {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw Object.assign(new Error(`${label} must be a lowercase SHA-256 digest`), { code: "invalid_digest" });
}

function assertEnvironmentSafety(environment, options) {
  if (["local", "test"].includes(environment)) {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    return;
  }
  if (!["staging", "production"].includes(environment)) throw Object.assign(new Error("Invalid festival import environment"), { code: "invalid_environment" });
  if (!options.allow_controlled_target) throw Object.assign(new Error("Controlled target confirmation is required"), { code: "controlled_target_required" });
}

async function fileInput(options) {
  const file = resolve(workspaceRoot, required(options, "file"));
  const categoryMapFile = resolve(workspaceRoot, required(options, "category_map"));
  const expectedChecksum = required(options, "expected_checksum");
  const expectedCategoryMapChecksum = required(options, "expected_category_map_checksum");
  assertDigest(expectedChecksum, "--expected-checksum");
  assertDigest(expectedCategoryMapChecksum, "--expected-category-map-checksum");
  const [source, categoryMapBytes] = await Promise.all([readFile(file), readFile(categoryMapFile)]);
  const actualCategoryMapChecksum = festivalCategoryMapChecksum(categoryMapBytes);
  if (actualCategoryMapChecksum !== expectedCategoryMapChecksum) {
    throw Object.assign(new Error("Category map checksum mismatch"), { code: "category_map_checksum_mismatch" });
  }
  return {
    source,
    sourceName: basename(file),
    categoryMap: JSON.parse(categoryMapBytes.toString("utf8")),
    categoryMapBytes,
    expectedChecksum,
  };
}

async function reviewApprovalInput(options, environment) {
  if (!options.approval_file) {
    if (environment === "production") throw Object.assign(new Error("Detached approval is required"), { code: "signed_review_required" });
    return { testReviewerUserId: required(options, "test_reviewer_user_id"), allowTestReviewer: true };
  }
  const approvalBytes = await readFile(resolve(workspaceRoot, options.approval_file));
  const reviewPublicKey = options.review_public_key_file
    ? await readFile(resolve(workspaceRoot, options.review_public_key_file), "utf8")
    : process.env.FESTIVAL_IMPORT_REVIEW_PUBLIC_KEY;
  if (!reviewPublicKey) throw Object.assign(new Error("Review public key is required"), { code: "review_public_key_required" });
  return { approval: JSON.parse(approvalBytes.toString("utf8")), reviewPublicKey };
}

async function output(content, currentOptions) {
  if (currentOptions.output) await writeFile(resolve(workspaceRoot, currentOptions.output), content, { flag: "wx", mode: 0o600 });
  else process.stdout.write(content);
}

function safeCliError(error) {
  const code = /^[a-z0-9_]{1,80}$/u.test(error?.code ?? "") ? error.code : "festival_import_failed";
  const messages = {
    invalid_command: usage().trim(),
    invalid_argument: "Festival import arguments are invalid. Run without a valid mode to view usage.",
    missing_argument: "A required festival import argument is missing. Review the command usage.",
    invalid_digest: "A supplied checksum is not a lowercase SHA-256 digest.",
    category_map_checksum_mismatch: "Category map checksum verification failed.",
    checksum_mismatch: "Festival CSV checksum verification failed.",
    unsafe_contact_data: "Private contact data was rejected from import evidence.",
    signed_review_required: "Production review requires detached Ed25519 approval.",
    review_public_key_required: "A configured Ed25519 review public key is required.",
    invalid_review_signature: "Detached reviewer approval signature verification failed.",
    review_approval_binding_mismatch: "Detached reviewer approval does not match the prepared batch.",
    review_replay_mismatch: "Review replay does not match immutable approval evidence.",
    resume_required: "The batch failed or was interrupted; rerun apply with --resume after investigation.",
    apply_attempt_active: "The current apply attempt lease has not expired.",
  };
  return { error: code, message: messages[code] ?? "Festival import command failed; inspect restricted operational diagnostics." };
}

let prisma;
try {
  const { mode, options } = parseArgs(process.argv.slice(2));
  const environment = options.environment ?? "test";
  assertEnvironmentSafety(environment, options);
  if (!process.env.DATABASE_URL) throw Object.assign(new Error("Database URL is required"), { code: "database_required" });

  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const repository = createFestivalImportRepository(prisma);
  const service = createFestivalImportService({ repository });
  let result;

  if (mode === "dry-run") {
    const input = await fileInput(options);
    result = await service.dryRun({ ...input });
    await output(`${JSON.stringify({
      reportVersion: 1,
      mode: "dry-run",
      sourceChecksumSha256: result.sourceChecksum,
      categoryMapChecksumSha256: result.categoryMapChecksum,
      counts: result.counts,
    }, null, 2)}\n`, options);
  } else if (mode === "prepare") {
    const input = await fileInput(options);
    result = await service.prepare({
      ...input,
      environment,
      operatorUserId: required(options, "operator_user_id"),
    });
    await output(formatFestivalImportReport(createFestivalImportReport({ batch: result.batch }), { format: options.format ?? "json" }), options);
  } else if (mode === "review") {
    const input = await fileInput(options);
    const approvalInput = await reviewApprovalInput(options, environment);
    result = await service.review({
      ...input,
      ...approvalInput,
      batchId: required(options, "batch_id"),
      environment,
    });
    await output(formatFestivalImportReport(createFestivalImportReport({ batch: result.batch }), { format: options.format ?? "json" }), options);
  } else if (mode === "apply") {
    const input = await fileInput(options);
    result = await service.apply({
      ...input,
      batchId: required(options, "batch_id"),
      environment,
      operatorUserId: required(options, "operator_user_id"),
      confirmation: options.confirmation,
      resume: options.resume === true,
    });
    await output(formatFestivalImportReport(createFestivalImportReport(result), { format: options.format ?? "json" }), options);
  } else {
    result = await service.report({ batchId: required(options, "batch_id") });
    await output(formatFestivalImportReport(createFestivalImportReport(result), { format: options.format ?? "json" }), options);
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify(safeCliError(error))}\n`);
  process.exitCode = 1;
} finally {
  if (prisma) await prisma.$disconnect();
}
