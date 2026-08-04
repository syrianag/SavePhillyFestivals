const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TEST_DATABASE_NAME = /(?:^|[_-])(test|ci)(?:$|[_-])/i;

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
