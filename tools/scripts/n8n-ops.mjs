import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";

const action = process.argv[2];
const composePath = "apps/n8n/config/compose.yaml";
const exampleEnvPath = "apps/n8n/.env.example";
const localEnvPath = "apps/n8n/.env.local";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function requireLocalEnvironment() {
  if (!existsSync(localEnvPath)) {
    throw new Error(`${localEnvPath} is missing; run "pnpm run n8n:init" first.`);
  }
  loadEnvFile(localEnvPath);
}

function compose(envPath, ...args) {
  run("docker", ["compose", "--env-file", envPath, "-f", composePath, ...args]);
}

switch (action) {
  case "validate":
    compose(exampleEnvPath, "config", "--quiet");
    console.log("N8N Compose configuration is valid; no services were changed.");
    break;

  case "health": {
    requireLocalEnvironment();
    const baseUrl = process.env.N8N_URL ?? "http://localhost:5678";
    const healthPath = process.env.N8N_HEALTH_PATH ?? "/healthz";
    const response = await fetch(new URL(healthPath, baseUrl), {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`N8N health check returned HTTP ${response.status}`);
    console.log(`N8N health check passed with HTTP ${response.status}.`);
    break;
  }

  case "plan":
    requireLocalEnvironment();
    compose(localEnvPath, "config", "--quiet");
    console.log("N8N local deployment plan:");
    console.log("1. Pull the pinned PostgreSQL and N8N images.");
    console.log("2. Start or reconcile both services with persistent named volumes.");
    console.log("3. Bind N8N only to 127.0.0.1:5678.");
    console.log("4. Print Compose service status for operator verification.");
    console.log("");
    console.log("No change was made. To apply:");
    console.log("  CONFIRM_DEPLOY=n8n pnpm run n8n:deploy");
    break;

  case "deploy":
    requireLocalEnvironment();
    if (process.env.CONFIRM_DEPLOY !== "n8n") {
      throw new Error("Refusing deployment: set CONFIRM_DEPLOY=n8n for this invocation.");
    }
    compose(localEnvPath, "pull");
    compose(localEnvPath, "up", "-d", "--remove-orphans");
    compose(localEnvPath, "ps");
    break;

  case "stop":
    requireLocalEnvironment();
    compose(localEnvPath, "stop");
    break;

  case "logs":
    requireLocalEnvironment();
    compose(localEnvPath, "logs", "--follow", "n8n");
    break;

  default:
    throw new Error(`Unknown action "${action ?? ""}". Expected validate, health, plan, deploy, stop, or logs.`);
}
