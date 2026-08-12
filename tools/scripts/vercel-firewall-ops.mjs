/**
 * Edge rate limiting: the protection the application's own gates attest to.
 *
 * Three environment flags — PRODUCER_EDGE_RATE_LIMIT_VERIFIED,
 * PUBLIC_MUTATION_EDGE_RATE_LIMIT_VERIFIED, USER_MANAGEMENT_EDGE_RATE_LIMIT_VERIFIED — make
 * production mutations fail closed until an operator confirms that identity/IP-aware rate
 * limiting exists at the deployment edge. Setting a flag does not create protection; it asserts
 * protection exists. This script exists so that assertion can be checked instead of remembered.
 *
 *   pnpm run ops:firewall:verify   # read-only; exits non-zero if the attestation is not true
 *   pnpm run ops:firewall:plan     # desired rules vs live configuration
 *   pnpm run ops:firewall:stage    # stage missing rules as drafts (gated; never publishes)
 *
 * Staging never publishes. `vercel firewall publish` stays a human action, because a bad rule in
 * front of every request blocks real users.
 *
 * This script reads environment variable NAMES only (`vercel env ls`), never values.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const action = process.argv[2] ?? "verify";
const projectLinkPath = ".vercel/project.json";

/**
 * The rules the application's gates depend on. Editing this list is how the edge protection
 * changes — it is reviewed like any other code, rather than living only in a dashboard.
 *
 * `attests` records which flags each rule backs. A flag set while one of its rules is still in
 * `log` mode is the failure this script exists to catch: the flag claims enforcement that is
 * not happening.
 */
const DESIRED_RULES = [
  {
    name: "API safety net",
    description: "Broad ceiling across the whole API surface; catches runaway scripts.",
    conditions: [{ type: "path", op: "pre", value: "/api" }],
    rateLimit: { window: 60, requests: 600, keys: "ip" },
    attests: [
      "PRODUCER_EDGE_RATE_LIMIT_VERIFIED",
      "PUBLIC_MUTATION_EDGE_RATE_LIMIT_VERIFIED",
      "USER_MANAGEMENT_EDGE_RATE_LIMIT_VERIFIED",
    ],
  },
  {
    name: "Account and auth writes",
    description: "Unauthenticated endpoints that create accounts or accept credentials.",
    conditions: [
      {
        type: "path",
        op: "inc",
        value: [
          "/api/producer/apply",
          "/api/auth/register",
          "/api/auth/password-reset/request",
          "/api/auth/password-reset/confirm",
        ],
      },
      { type: "method", op: "eq", value: "POST" },
    ],
    rateLimit: { window: 900, requests: 20, keys: "ip" },
    attests: ["PRODUCER_EDGE_RATE_LIMIT_VERIFIED"],
  },
  {
    name: "Email-sending endpoints",
    description: "Endpoints that send mail on an unauthenticated stranger's request.",
    conditions: [
      { type: "path", op: "inc", value: ["/api/schedules/email", "/api/organizer-consent"] },
      { type: "method", op: "eq", value: "POST" },
    ],
    rateLimit: { window: 600, requests: 30, keys: "ip" },
    attests: ["PUBLIC_MUTATION_EDGE_RATE_LIMIT_VERIFIED"],
  },
];

const ATTESTATION_FLAGS = [
  "PRODUCER_EDGE_RATE_LIMIT_VERIFIED",
  "PUBLIC_MUTATION_EDGE_RATE_LIMIT_VERIFIED",
  "USER_MANAGEMENT_EDGE_RATE_LIMIT_VERIFIED",
];

/* A gated endpoint that exists in every build and refuses an invalid body long before it could
 * send anything. Probing it is how we learn whether the *running* deployment sees the flags —
 * env vars set in the dashboard do not reach live functions until the next deployment, which is
 * the single easiest step to miss. */
const PROBE_PATH = "/api/schedules/email";

const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

function joinList(values) {
  if (values.length < 2) return values.join("");
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function vercel(args, { capture = true } = {}) {
  const result = spawnSync("npx", ["vercel", ...args], {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/* The CLI prints a banner before JSON, so the payload starts at the first brace. */
function vercelJson(args) {
  const { status, stdout, stderr } = vercel(args);
  const start = stdout.indexOf("{");
  if (status !== 0 || start === -1) {
    throw new Error(`\`vercel ${args.join(" ")}\` failed: ${(stderr || stdout).trim().split("\n").slice(-3).join(" ")}`);
  }
  return JSON.parse(stdout.slice(start));
}

function requireLinkedProject() {
  if (!existsSync(projectLinkPath)) {
    throw new Error(`${projectLinkPath} is missing; run "npx vercel link" first.`);
  }
  return JSON.parse(readFileSync(projectLinkPath, "utf8"));
}

function liveRules() {
  const payload = vercelJson(["firewall", "rules", "list", "--json"]);
  return { rules: payload.rules ?? [], pendingChanges: payload.pendingChanges ?? 0 };
}

/** `log` records hits and blocks nothing; anything else actually enforces. */
function exceededAction(rule) {
  return rule?.action?.mitigate?.rateLimit?.action ?? null;
}

function describeRule(rule) {
  const limit = rule?.action?.mitigate?.rateLimit;
  if (!limit) return "no rate limit configured";
  return `${limit.limit} req / ${limit.window}s by ${(limit.keys ?? []).join("+") || "?"} → ${limit.action}`;
}

function productionFlagNames() {
  /* `env ls` prints names, environments and ages — never decrypted values. Parsed by name only
   * so a future CLI change cannot cause this script to echo a secret. */
  const { status, stdout, stderr } = vercel(["env", "ls", "production"]);
  if (status !== 0) throw new Error(`\`vercel env ls production\` failed: ${(stderr || stdout).trim()}`);
  return new Set(ATTESTATION_FLAGS.filter((flag) => new RegExp(`(^|\\s)${flag}(\\s|$)`, "m").test(stdout)));
}

async function probeProduction(siteUrl) {
  const target = new URL(PROBE_PATH, siteUrl).toString();
  const response = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: siteUrl, "Sec-Fetch-Site": "same-origin" },
    body: "{}",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, code: body?.code ?? null };
}

function resolveSiteUrl(link) {
  return process.env.PRODUCTION_URL || `https://${link.projectName}.vercel.app`;
}

function stageCommand(rule) {
  const args = ["firewall", "rules", "add", rule.name];
  for (const condition of rule.conditions) args.push("--condition", JSON.stringify(condition));
  args.push(
    "--action", "rate_limit",
    "--rate-limit-window", String(rule.rateLimit.window),
    "--rate-limit-requests", String(rule.rateLimit.requests),
    "--rate-limit-keys", rule.rateLimit.keys,
    /* Staged in log mode on purpose. A new rule's blast radius is unknown until real traffic
     * hits it, so it records first and blocks only once an operator has reviewed the data. */
    "--rate-limit-action", "log",
    "--yes",
  );
  return args;
}

const link = requireLinkedProject();

switch (action) {
  case "plan": {
    const { rules, pendingChanges } = liveRules();
    console.log(`Project: ${link.projectName}\n`);
    for (const desired of DESIRED_RULES) {
      const live = rules.find((rule) => rule.name === desired.name);
      if (!live) {
        console.log(`  MISSING   ${desired.name}\n            ${desired.description}`);
        continue;
      }
      const state = !live.active ? "DISABLED " : exceededAction(live) === "log" ? "LOGGING  " : "ENFORCING";
      console.log(`  ${state} ${desired.name}\n            ${describeRule(live)}`);
    }
    const extra = rules.filter((rule) => !DESIRED_RULES.some((desired) => desired.name === rule.name));
    if (extra.length) console.log(`\n  ${extra.length} rule(s) live but not described here: ${extra.map((rule) => rule.name).join(", ")}`);
    if (pendingChanges) console.log(`\n  ${pendingChanges} unpublished draft change(s). Review with "npx vercel firewall diff".`);
    break;
  }

  case "stage": {
    if (process.env.CONFIRM_FIREWALL !== "stage") {
      throw new Error('Refusing to stage firewall changes without CONFIRM_FIREWALL=stage. Run "pnpm run ops:firewall:plan" first.');
    }
    const { rules } = liveRules();
    const missing = DESIRED_RULES.filter((desired) => !rules.some((rule) => rule.name === desired.name));
    if (!missing.length) {
      console.log("Every described rule already exists. Nothing staged.");
      break;
    }
    for (const rule of missing) {
      console.log(`Staging: ${rule.name}`);
      const { status, stdout, stderr } = vercel(stageCommand(rule));
      if (status !== 0) throw new Error(`Failed to stage "${rule.name}": ${(stderr || stdout).trim()}`);
    }
    console.log(
      `\nStaged ${missing.length} rule(s) in log mode. Nothing is live yet.\n`
      + '  Review:  npx vercel firewall diff\n'
      + '  Publish: npx vercel firewall publish --yes   <- run this yourself',
    );
    break;
  }

  case "verify": {
    const { rules, pendingChanges } = liveRules();
    const flags = productionFlagNames();
    const siteUrl = resolveSiteUrl(link);

    console.log(`Project: ${link.projectName}`);
    console.log(`Site:    ${siteUrl}\n`);

    console.log("Firewall rules");
    for (const desired of DESIRED_RULES) {
      const live = rules.find((rule) => rule.name === desired.name);
      if (!live) {
        console.log(`  ✗ ${desired.name} — missing`);
        fail(`Rule "${desired.name}" does not exist at the edge.`);
        continue;
      }
      if (!live.active) {
        console.log(`  ✗ ${desired.name} — disabled`);
        fail(`Rule "${desired.name}" exists but is disabled.`);
        continue;
      }
      const enforcing = exceededAction(live) !== "log";
      console.log(`  ${enforcing ? "✓" : "!"} ${desired.name} — ${describeRule(live)}`);
      if (!enforcing) {
        /* Logging is a legitimate stage of a rollout, so this is only a failure once a flag
         * claims the rule is protecting something. */
        const claiming = desired.attests.filter((flag) => flags.has(flag));
        if (claiming.length) {
          fail(`Rule "${desired.name}" only logs, but ${joinList(claiming)} claim${claiming.length === 1 ? "s" : ""} it enforces.`);
        } else {
          warn(`Rule "${desired.name}" is in log mode and blocks nothing yet.`);
        }
      }
    }
    if (pendingChanges) warn(`${pendingChanges} unpublished firewall draft change(s) — run "npx vercel firewall diff".`);

    console.log("\nProduction attestation flags");
    for (const flag of ATTESTATION_FLAGS) {
      const present = flags.has(flag);
      console.log(`  ${present ? "✓" : "✗"} ${flag}${present ? "" : " — not set"}`);
      if (!present) fail(`${flag} is not set in production; the mutations it gates will return 503.`);
    }

    console.log("\nRunning deployment");
    try {
      const probe = await probeProduction(siteUrl);
      if (probe.code === "edge_rate_limit_unverified" || probe.status === 503) {
        console.log(`  ✗ ${PROBE_PATH} returned ${probe.status} ${probe.code ?? ""}`.trimEnd());
        /* The flags exist in project settings but the live functions were built before them.
         * Environment changes only reach production on the next deployment. */
        fail("Production still reports edge_rate_limit_unverified. Redeploy so the running functions pick up the flags.");
      } else {
        console.log(`  ✓ ${PROBE_PATH} returned ${probe.status} — the gate is satisfied at runtime`);
      }
    } catch (error) {
      warn(`Could not probe ${siteUrl}${PROBE_PATH}: ${error.message}. Set PRODUCTION_URL to override.`);
    }

    for (const message of warnings) console.log(`\nWARN  ${message}`);
    if (failures.length) {
      console.error(`\n${failures.length} problem(s):`);
      for (const message of failures) console.error(`  - ${message}`);
      process.exit(1);
    }
    console.log("\nEdge rate limiting is configured, enforcing, and live. The attestation flags are true.");
    break;
  }

  default:
    throw new Error(`Unknown action "${action}". Use verify, plan, or stage.`);
}
