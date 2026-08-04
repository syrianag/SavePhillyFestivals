import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const appRoot = dirname(fileURLToPath(import.meta.url));

config({
  path: [join(appRoot, ".env.local"), join(appRoot, ".env")],
  quiet: true,
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
