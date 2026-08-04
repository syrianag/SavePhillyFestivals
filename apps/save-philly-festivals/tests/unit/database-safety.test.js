import { describe, expect, it } from "vitest";

import { assertSafeTestDatabaseUrl } from "@/lib/database-safety";

describe("assertSafeTestDatabaseUrl", () => {
  it.each([
    "postgresql://postgres:postgres@localhost:5432/save_philly_festivals_test",
    "postgres://postgres:postgres@127.0.0.1:5432/save_philly_festivals_ci",
  ])("allows an explicitly named loopback test database: %s", (databaseUrl) => {
    expect(assertSafeTestDatabaseUrl(databaseUrl)).toMatchObject({
      databaseName: expect.stringMatching(/(test|ci)/),
    });
  });

  it("rejects a remote database even when its name contains test", () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        "postgresql://postgres:postgres@example.neon.tech:5432/save_philly_festivals_test"
      )
    ).toThrow("Refusing migration-test against non-local database host");
  });

  it("rejects a local database that is not explicitly marked for tests", () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        "postgresql://postgres:postgres@localhost:5432/save_philly_festivals"
      )
    ).toThrow("database without a test/ci name");
  });

  it("rejects missing, malformed, and non-PostgreSQL URLs", () => {
    expect(() => assertSafeTestDatabaseUrl()).toThrow("DATABASE_URL is required");
    expect(() => assertSafeTestDatabaseUrl("not-a-url")).toThrow("valid PostgreSQL URL");
    expect(() => assertSafeTestDatabaseUrl("mysql://localhost/app_test")).toThrow(
      "requires a PostgreSQL DATABASE_URL"
    );
  });
});
