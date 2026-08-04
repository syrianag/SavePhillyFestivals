import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const appDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");

config({
  path: [join(appDirectory, ".env.local"), join(appDirectory, ".env")],
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not configured; run "pnpm run auth:secret"');
}

const email = (process.env.LOCAL_ADMIN_EMAIL || "admin@savephillyfestivals.org")
  .trim()
  .toLowerCase();
const password = process.env.LOCAL_ADMIN_PASSWORD || "admin123";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`Seeded admin account ${email} was not found`);
  }

  if (user.role !== "admin") {
    throw new Error(`Seeded account ${email} has role ${user.role}, not admin`);
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw new Error(`Seeded admin password verification failed for ${email}`);
  }

  console.log(`Seeded admin credentials, role, and Auth.js secret configuration verified for ${email}.`);
} finally {
  await prisma.$disconnect();
}
