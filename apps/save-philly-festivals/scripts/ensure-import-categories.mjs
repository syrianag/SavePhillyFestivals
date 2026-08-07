/**
 * Ensures every category slug declared in the reviewed festival category map exists as a
 * Category row.
 *
 * `festival-import-repository.js` looks each prepared `category_slug` up with
 * `category.findUnique({ where: { slug } })` and aborts the whole apply transaction with
 * `category_not_found` when it misses. The map is therefore a promise about the database,
 * and this script is what keeps that promise — run it after editing
 * `tools/data/festival-category-map.json` and before a festival import apply.
 *
 * It only ever inserts missing Category rows. It never updates or deletes an existing one,
 * so it is safe to re-run and safe against a shared database: an operator who has renamed
 * a category in the UI keeps their name.
 *
 * Usage (from the workspace root):
 *   pnpm run db:ensure-import-categories
 *   pnpm run db:ensure-import-categories -- --dry-run
 *   pnpm run db:ensure-import-categories -- --category-map path/to/map.json
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateFestivalCategoryMap } from "../src/features/festival-import/festival-import-normalization.js";

const appDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(appDirectory, "../..");

config({
  path: [join(appDirectory, ".env.local"), join(appDirectory, ".env")],
  quiet: true,
});

function parseArgs(argv) {
  const options = { dryRun: false, categoryMap: join(workspaceRoot, "tools/data/festival-category-map.json") };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--category-map") {
      const value = argv[index += 1];
      if (!value) throw new Error("--category-map requires a path");
      options.categoryMap = resolve(process.cwd(), value);
    } else throw new Error(`Unrecognized argument: ${arg}`);
  }
  return options;
}

/* Editorial copy for the slugs the reviewed map declares. A slug that is not listed here
 * still gets created, using a title-cased name, so adding an alias group to the map never
 * blocks an import on a missing description. */
const CATEGORY_COPY = Object.freeze({
  uncategorized: {
    name: "Uncategorized",
    description: "Imported festivals that still need an editorial category assigned",
  },
  "street-fair": {
    name: "Street Fair",
    description: "Street fairs, block parties, and neighborhood corridor celebrations",
  },
  seasonal: {
    name: "Seasonal",
    description: "Holiday and seasonal celebrations throughout the year",
  },
  family: {
    name: "Family & Kids",
    description: "Family-friendly festivals and events built around children",
  },
});

function titleCase(slug) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function describe(slug) {
  return CATEGORY_COPY[slug] ?? { name: titleCase(slug), description: null };
}

const options = parseArgs(process.argv.slice(2));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const categoryMap = JSON.parse(await readFile(options.categoryMap, "utf8"));
// Reuse the importer's own validator so this script cannot create rows for a map the
// importer would reject (bad slug shape, duplicate alias, undeclared default).
validateFestivalCategoryMap(categoryMap);

const requiredSlugs = categoryMap.categories.map(({ slug }) => slug);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const existing = await prisma.category.findMany({
    where: { slug: { in: requiredSlugs } },
    select: { slug: true, name: true },
  });
  const existingSlugs = new Set(existing.map((category) => category.slug));
  const missing = requiredSlugs.filter((slug) => !existingSlugs.has(slug));

  console.log(`Category map: ${options.categoryMap}`);
  console.log(`Declared slugs: ${requiredSlugs.length} — present: ${existingSlugs.size}, missing: ${missing.length}`);

  if (missing.length === 0) {
    console.log("Every declared category slug already exists; nothing to do.");
  } else if (options.dryRun) {
    for (const slug of missing) console.log(`  would create ${slug} (${describe(slug).name})`);
    console.log("Dry run: no rows were written.");
  } else {
    for (const slug of missing) {
      const { name, description } = describe(slug);
      /* Guard the unique `name` column as well as `slug`: a differently-slugged row may
       * already own this display name, and blindly creating would abort on a constraint. */
      const nameOwner = await prisma.category.findUnique({ where: { name }, select: { slug: true } });
      const created = await prisma.category.create({
        data: { name: nameOwner ? `${name} (${slug})` : name, slug, description },
        select: { slug: true, name: true },
      });
      console.log(`  created ${created.slug} (${created.name})`);
    }
  }

  const finalCount = await prisma.category.count({ where: { slug: { in: requiredSlugs } } });
  if (!options.dryRun && finalCount !== requiredSlugs.length) {
    throw new Error(`Expected ${requiredSlugs.length} declared categories to exist, found ${finalCount}`);
  }
} finally {
  await prisma.$disconnect();
}
