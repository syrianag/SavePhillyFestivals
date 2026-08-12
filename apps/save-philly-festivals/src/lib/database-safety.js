const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TEST_DATABASE_NAME = /(?:^|[_-])(test|ci)(?:$|[_-])/i;
/* Seeding additionally accepts a `dev`/`local` name. Migration testing deliberately does not —
 * it drops and recreates the public schema, so it stays pinned to test/ci names only. */
const SEEDABLE_DATABASE_NAME = /(?:^|[_-])(dev|local|test|ci)(?:$|[_-])/i;

export function assertSafeTestDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration testing.");
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Migration testing requires a PostgreSQL DATABASE_URL.");
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing migration-test against non-local database host: ${url.hostname}`
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing migration-test against database without a test/ci name: ${databaseName || "<empty>"}`
    );
  }

  return { databaseName, hostname: url.hostname };
}

/**
 * The same protection for `prisma db seed`, which had none.
 *
 * `prisma/seed.js` upserts users — overwriting `password_hash` **and `role`** for any matching
 * email — and then writes categories, tags, festivals, occurrences and schedules. Pointed at a
 * production database it would rotate real credentials, potentially escalate an ordinary account
 * to admin, and inject demo festivals into a live catalogue. Nothing stopped that, and the most
 * natural response to "my local login does not work" is to re-run the seed.
 *
 * Kept separate from `assertSafeTestDatabaseUrl` rather than widening it: migration testing drops
 * the public schema and must stay pinned to test/ci names.
 */
export function assertSafeSeedDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for seeding.");
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Seeding requires a PostgreSQL DATABASE_URL.");
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to seed a non-local database host: ${url.hostname}. ` +
        "Seeding rewrites user passwords and roles and inserts demo festivals; point DATABASE_URL " +
        "at a local development database first."
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!SEEDABLE_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing to seed a database without a dev/local/test/ci name: ${databaseName || "<empty>"}`
    );
  }

  return { databaseName, hostname: url.hostname };
}
