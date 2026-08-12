import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Keeps `.env.example` honest.
 *
 * An env template only helps a new developer if it lists everything the code actually reads.
 * It drifts silently: adding `process.env.SOMETHING_NEW` in a feature never fails a build, so
 * the omission surfaces as a confusing runtime error on someone else's machine weeks later.
 * This compares the two directions and fails on either.
 *
 * Reads `.env.example` only — never `.env`, `.env.local`, or `.env.production` — and compares
 * variable NAMES. No value is read or printed.
 */

const projectRoot = resolve(import.meta.dirname, "../..");
const repoRoot = resolve(projectRoot, "../..");
const examplePath = join(projectRoot, ".env.example");

/* Injected by the host or the CI runner, or passed inline on a single command. Documented in
 * the example's closing section as things NOT to put in an env file, so they are deliberately
 * absent in `NAME=` form. */
const PLATFORM_MANAGED = new Set([
  "NODE_ENV",
  "PORT",
  "CI",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "CONFIRM_DEPLOY",
  "CONFIRM_FIREWALL",
]);

const SCAN_ROOTS = [
  join(projectRoot, "src"),
  join(projectRoot, "scripts"),
  join(projectRoot, "tests"),
  join(projectRoot, "e2e"),
  join(projectRoot, "playwright.config.js"),
  join(projectRoot, "next.config.mjs"),
  join(projectRoot, "prisma.config.ts"),
  join(repoRoot, "tools"),
  join(repoRoot, "prisma.config.ts"),
];

const SKIP_DIRECTORIES = /node_modules|\.next|generated|\.worktrees|\.nx|coverage/;
const SOURCE_FILE = /\.(js|jsx|mjs|ts|tsx)$/;

/* This file names variables in prose and in its own scanning pattern; including it would make
 * the test assert against itself. */
const SELF = import.meta.filename;

function sourceFiles(target, collected = []) {
  if (!existsSync(target)) return collected;
  if (!statSync(target).isDirectory()) {
    if (SOURCE_FILE.test(target) && target !== SELF) collected.push(target);
    return collected;
  }
  for (const entry of readdirSync(target)) {
    const child = join(target, entry);
    if (SKIP_DIRECTORIES.test(child)) continue;
    sourceFiles(child, collected);
  }
  return collected;
}

function referencedVariables() {
  const names = new Set();
  for (const file of SCAN_ROOTS.flatMap((root) => sourceFiles(root))) {
    const contents = readFileSync(file, "utf8");
    for (const match of contents.matchAll(/process\.env\.([A-Z0-9_]+)/g)) names.add(match[1]);
    /* prisma.config.ts reads through a helper rather than `process.env`. */
    for (const match of contents.matchAll(/\benv\("([A-Z0-9_]+)"\)/g)) names.add(match[1]);
  }
  return names;
}

/** Names in `NAME=` form, whether commented out or not. Prose mentions do not count. */
function documentedVariables() {
  const contents = readFileSync(examplePath, "utf8");
  return new Set([...contents.matchAll(/^#?\s*([A-Z0-9_]{2,})=/gm)].map((match) => match[1]));
}

describe(".env.example contract", () => {
  it("documents every environment variable the code reads", () => {
    const referenced = referencedVariables();
    const documented = documentedVariables();

    const undocumented = [...referenced]
      .filter((name) => !documented.has(name) && !PLATFORM_MANAGED.has(name))
      .sort();

    expect(undocumented, `Add these to .env.example (or to PLATFORM_MANAGED if the host sets them): ${undocumented.join(", ")}`).toEqual([]);
  });

  /* The reverse direction. A variable that no longer exists is worse than an undocumented one:
   * it reads as required, so someone will go hunting for a value that changes nothing. */
  it("lists no variable the code has stopped reading", () => {
    const referenced = referencedVariables();
    const stale = [...documentedVariables()].filter((name) => !referenced.has(name)).sort();

    expect(stale, `Remove these from .env.example — nothing reads them: ${stale.join(", ")}`).toEqual([]);
  });

  it("carries no real-looking secret values", () => {
    const contents = readFileSync(examplePath, "utf8");
    /* The template is committed, so a pasted credential would be published. These catch the
     * shapes most likely to be pasted in by accident. */
    expect(contents).not.toMatch(/re_[A-Za-z0-9]{20,}/);            // Resend API key
    expect(contents).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----\s*\n\s*[A-Za-z0-9+/]{40,}/); // real PEM body
    expect(contents).not.toMatch(/postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@(?!localhost|127\.0\.0\.1)/); // non-local DB creds
  });

  it("still tells developers AUTH_SECRET is required to boot", () => {
    /* src/lib/auth.js throws at import time without it, so an example that omits or buries it
     * produces an app that will not start with no obvious cause. */
    const contents = readFileSync(examplePath, "utf8");
    expect(contents).toMatch(/^AUTH_SECRET=/m);
    expect(contents).toMatch(/pnpm run auth:secret/);
  });
});
