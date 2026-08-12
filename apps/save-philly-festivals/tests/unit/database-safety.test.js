import { describe, expect, it } from "vitest";

import { assertSafeSeedDatabaseUrl, assertSafeTestDatabaseUrl } from "@/lib/database-safety";

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

/**
 * `prisma db seed` had no guard at all. It upserts users — replacing `password_hash` **and
 * `role`** for any matching email — then writes categories, tags, festivals and schedules. Aimed
 * at a live database it rotates real credentials, can escalate an ordinary account to admin, and
 * drops demo festivals into a production catalogue. The trigger for running it is usually "my
 * local login does not work", which is precisely when the environment is misconfigured.
 */
describe("assertSafeSeedDatabaseUrl", () => {
  it.each([
    "postgresql://dev:dev@127.0.0.1:5434/save_philly_festivals_dev",
    "postgresql://dev:dev@localhost:5432/philly_local",
    "postgresql://postgres:postgres@localhost:5432/save_philly_festivals_test",
    "postgres://postgres:postgres@127.0.0.1:5432/save_philly_festivals_ci",
  ])("allows a loopback development database: %s", (databaseUrl) => {
    expect(assertSafeSeedDatabaseUrl(databaseUrl)).toMatchObject({
      databaseName: expect.stringMatching(/(dev|local|test|ci)/),
    });
  });

  /* Stand-ins for the hosted environments. Real endpoint names are deliberately kept out of this
   * public repository; the guard branches on "is it loopback", so a placeholder exercises the
   * identical path. */
  it.each([
    ["production", "postgresql://u:p@ep-production-pooler.c-5.us-east-2.aws.neon.tech/AppProduction"],
    ["UAT", "postgresql://u:p@ep-uat-pooler.c-5.us-east-2.aws.neon.tech/app-uat"],
  ])("refuses the %s database", (_label, databaseUrl) => {
    expect(() => assertSafeSeedDatabaseUrl(databaseUrl)).toThrow("non-local database host");
  });

  /* A `dev` in the name must not buy a remote host a pass. */
  it("refuses a remote host even when the database is named dev", () => {
    expect(() =>
      assertSafeSeedDatabaseUrl("postgresql://u:p@ep-anything.example.com/save_philly_festivals_dev")
    ).toThrow("non-local database host");
  });

  /* Nor may loopback alone buy a production-named database a pass — the shape of a developer who
   * has cloned production locally. */
  it("refuses a loopback database with a production name", () => {
    expect(() =>
      assertSafeSeedDatabaseUrl("postgresql://dev:dev@127.0.0.1:5434/AppProduction")
    ).toThrow("without a dev/local/test/ci name");
  });

  it("rejects missing, malformed, and non-PostgreSQL URLs", () => {
    expect(() => assertSafeSeedDatabaseUrl()).toThrow("DATABASE_URL is required");
    expect(() => assertSafeSeedDatabaseUrl("not-a-url")).toThrow("valid PostgreSQL URL");
    expect(() => assertSafeSeedDatabaseUrl("mysql://localhost/app_dev")).toThrow(
      "requires a PostgreSQL DATABASE_URL"
    );
  });

  /* Migration testing drops and recreates the public schema, so its guard must stay the stricter
   * of the two even though seeding now accepts dev/local names. */
  it("stays stricter for migration testing than for seeding", () => {
    const devDatabase = "postgresql://dev:dev@127.0.0.1:5434/save_philly_festivals_dev";
    expect(assertSafeSeedDatabaseUrl(devDatabase)).toBeTruthy();
    expect(() => assertSafeTestDatabaseUrl(devDatabase)).toThrow("without a test/ci name");
  });
});
