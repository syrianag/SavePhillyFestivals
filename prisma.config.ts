import { join } from "node:path";

import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Root-level Prisma entry point.
 *
 * The schema lives with the app, not here. This config used to declare
 * `schema: "prisma/schema.prisma"` against a root `prisma/` directory that never
 * held one, so any bare `prisma <command>` run from the repository root failed
 * with "Could not load schema ... file or directory not found" while the same
 * command worked from apps/save-philly-festivals. It also read its own
 * DATABASE_URL from the root .env, which pointed at a second, stale database.
 *
 * Both paths now resolve to the same schema, migrations, and env files as
 * apps/save-philly-festivals/prisma.config.ts.
 */
const appRoot = join(import.meta.dirname, "apps", "save-philly-festivals");

config({
  path: [join(appRoot, ".env.local"), join(appRoot, ".env")],
  quiet: true,
});

export default defineConfig({
  schema: join(appRoot, "prisma", "schema.prisma"),
  migrations: {
    path: join(appRoot, "prisma", "migrations"),
    seed: `tsx ${join(appRoot, "prisma", "seed.js")}`,
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
