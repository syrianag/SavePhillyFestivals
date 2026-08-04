import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");

describe("F-04 persistence and security contract", () => {
  it("adds one forward normalized migration without modifying event-only SavedSchedule", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read(
      "prisma/migrations/20260804020000_schedule_email_requests/migration.sql"
    );

    expect(schema).toContain("model ScheduleEmailRequest");
    expect(schema).toContain("model ScheduleEmailItem");
    expect(schema).toMatch(/idempotency_key\s+String\s+@unique/);
    expect(schema).toMatch(/items\s+ScheduleEmailItem\[\]/);
    expect(schema).not.toMatch(/ScheduleEmailRequest[\s\S]*?Json/);
    expect(migration).toContain('CREATE UNIQUE INDEX "ScheduleEmailRequest_idempotency_key_key"');
    expect(migration).toContain('ON DELETE CASCADE');
    expect(migration).not.toMatch(/RESEND|API_KEY|credential|email_body/i);

    const savedSchedule = schema.match(/model SavedSchedule \{[\s\S]*?\n\}/)?.[0];
    expect(savedSchedule).toContain("schedule_id");
    expect(savedSchedule).not.toContain("ScheduleEmail");
  });

  it("queries only approved parent records and selects server-owned content fields", () => {
    const repository = read("src/features/schedule-email/schedule-email-repository.js");
    const schema = read("src/features/schedule-email/schedule-email-schema.js");

    expect(repository).toContain("status: FESTIVAL_STATUS.APPROVED");
    expect(repository).toContain("festival: { status: FESTIVAL_STATUS.APPROVED }");
    expect(repository).not.toMatch(/description:\s*true|website_url:\s*true/);
    expect(schema).toContain(".strict()");
    expect(schema).not.toMatch(/title|start_time|website_url/);
  });

  it("keeps F-04 transactional and independent of marketing consent", () => {
    const form = read("src/features/schedule-email/ScheduleEmailForm.jsx");
    const route = read("src/app/api/schedules/email/route.js");

    expect(form).toContain("does not sign you up for marketing");
    expect(form).not.toMatch(/type=["']checkbox["']/);
    expect(route).not.toMatch(/consent|receive_updates|mailing.list/i);
  });
});
