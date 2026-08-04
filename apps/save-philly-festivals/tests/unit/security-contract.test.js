import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("account role defaults", () => {
  it("preserves the deployed baseline and corrects the current default forward", () => {
    const schema = readProjectFile("prisma/schema.prisma");
    const baseline = readProjectFile(
      "prisma/migrations/20260804000000_baseline/migration.sql"
    );
    const correction = readProjectFile(
      "prisma/migrations/20260804010000_default_user_role_public/migration.sql"
    );

    expect(schema).toMatch(/role\s+String\s+@default\("public"\)/);
    expect(schema).not.toMatch(/role\s+String\s+@default\("admin"\)/);
    expect(baseline).toContain('"role" TEXT NOT NULL DEFAULT \'admin\'');
    expect(correction).toContain(
      'ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT \'public\''
    );
  });

  it("requires explicit local seed credentials without fallback passwords", () => {
    const seed = readProjectFile("prisma/seed.js");

    expect(seed).toContain('role: "admin"');
    expect(seed).toContain('requireSeedCredential("LOCAL_ADMIN_EMAIL"');
    expect(seed).toContain('requireSeedCredential("LOCAL_ADMIN_PASSWORD")');
    expect(seed).toContain('requireSeedCredential("LOCAL_PRODUCER_EMAIL"');
    expect(seed).toContain('requireSeedCredential("LOCAL_PRODUCER_PASSWORD")');
    expect(seed).not.toContain("admin123");
    expect(seed).not.toContain("producer123");
  });
});
