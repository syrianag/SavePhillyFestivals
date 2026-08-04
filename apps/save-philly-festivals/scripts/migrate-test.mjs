import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

import { assertSafeTestDatabaseUrl } from "../src/lib/database-safety.js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(projectRoot, "../..");
const prismaBin = join(workspaceRoot, "node_modules/.bin/prisma");

config({
  path: [join(projectRoot, ".env.local"), join(projectRoot, ".env")],
  quiet: true,
});

const target = assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
console.log(
  `Applying migrations to approved local test database ${target.databaseName} on ${target.hostname}.`
);

for (const args of [
  ["migrate", "deploy"],
  ["migrate", "status"],
]) {
  const result = spawnSync(prismaBin, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
