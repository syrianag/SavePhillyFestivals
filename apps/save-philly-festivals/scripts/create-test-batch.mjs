import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomBytes, randomUUID } from "node:crypto";

const appDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");

config({
  path: [join(appDirectory, ".env.local"), join(appDirectory, ".env")],
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const hex64 = () => randomBytes(32).toString("hex");

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!admin) {
    throw new Error("No admin user found to act as operator");
  }

  const batchId = randomUUID();
  console.log(`Creating import batch ${batchId}...`);

  const batch = await prisma.festivalImportBatch.create({
    data: {
      id: batchId,
      source_name: "festival-preview-dataset.csv",
      source_checksum_sha256: hex64(),
      category_map_checksum_sha256: hex64(),
      prepared_digest_sha256: hex64(),
      prepared_counts: { total: 5, ready: 2, quarantined: 2, failed: 1 },
      import_profile: "festival_csv",
      import_profile_version: 1,
      environment: "development",
      operator_user_id: admin.id,
      total_row_count: 5,
      ready_row_count: 2,
      quarantined_row_count: 2,
      failed_row_count: 1,
      status: "prepared",
    },
  });

  console.log("Creating import rows...");

  const rowsData = [
    {
      id: randomUUID(),
      row_number: 1,
      source_record_id: "rec-1",
      source_start_line: 2,
      source_hash_sha256: hex64(),
      normalized_hash_sha256: hex64(),
      normalized_data: { name: "Franklin Square Folk Festival", location: "Franklin Square, Philadelphia", startDate: "2026-10-15", endDate: "2026-10-17" },
      prepared_disposition: "ready",
      prepared_digest_sha256: hex64(),
      disposition: "ready",
    },
    {
      id: randomUUID(),
      row_number: 2,
      source_record_id: "rec-2",
      source_start_line: 3,
      source_hash_sha256: hex64(),
      normalized_hash_sha256: hex64(),
      normalized_data: { name: "Passyunk Avenue Craft Beer Fest", location: "East Passyunk Ave, Philadelphia", startDate: "2026-11-01", endDate: "2026-11-03" },
      prepared_disposition: "ready",
      prepared_digest_sha256: hex64(),
      disposition: "ready",
    },
    {
      id: randomUUID(),
      row_number: 3,
      source_record_id: "rec-3",
      source_start_line: 4,
      source_hash_sha256: hex64(),
      normalized_hash_sha256: hex64(),
      normalized_data: { name: "Schuylkill River Regatta", location: "Schuylkill River Trail", startDate: "invalid-date-format", endDate: "2026-10-05" },
      prepared_disposition: "quarantined",
      prepared_digest_sha256: hex64(),
      disposition: "quarantined",
    },
    {
      id: randomUUID(),
      row_number: 4,
      source_record_id: "rec-4",
      source_start_line: 5,
      source_hash_sha256: hex64(),
      normalized_hash_sha256: hex64(),
      normalized_data: { name: "Fairmount Park Autumn Gathering", location: "", startDate: "2026-10-01", endDate: "2026-10-05" },
      prepared_disposition: "quarantined",
      prepared_digest_sha256: hex64(),
      disposition: "quarantined",
    },
    {
      id: randomUUID(),
      row_number: 5,
      source_record_id: "rec-5",
      source_start_line: 6,
      source_hash_sha256: hex64(),
      normalized_hash_sha256: hex64(),
      normalized_data: { name: "Malformed Entry Fest" },
      prepared_disposition: "failed",
      prepared_digest_sha256: hex64(),
      disposition: "failed",
    },
  ];

  for (const r of rowsData) {
    await prisma.festivalImportRow.create({
      data: {
        id: r.id,
        batch_id: batchId,
        row_number: r.row_number,
        source_record_id: r.source_record_id,
        source_start_line: r.source_start_line,
        source_hash_sha256: r.source_hash_sha256,
        normalized_hash_sha256: r.normalized_hash_sha256,
        normalized_data: r.normalized_data,
        prepared_disposition: r.prepared_disposition,
        prepared_digest_sha256: r.prepared_digest_sha256,
        disposition: r.disposition,
      },
    });
  }

  console.log("Creating import issues...");

  await prisma.festivalImportIssue.createMany({
    data: [
      {
        id: randomUUID(),
        batch_id: batchId,
        row_id: rowsData[2].id,
        severity: "error",
        code: "invalid_date",
        field: "startDate",
        message: "Invalid start date format; must be ISO date.",
        safe_details: { rawValue: "invalid-date-format" },
      },
      {
        id: randomUUID(),
        batch_id: batchId,
        row_id: rowsData[3].id,
        severity: "warning",
        code: "missing_location",
        field: "location",
        message: "Location field is empty.",
        safe_details: { field: "location" },
      },
      {
        id: randomUUID(),
        batch_id: batchId,
        row_id: rowsData[4].id,
        severity: "error",
        code: "missing_dates",
        message: "Start and end dates are completely missing from row.",
        safe_details: {},
      },
    ],
  });

  console.log(`Successfully seeded test batch ID: ${batchId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
