import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const examplePath = "apps/n8n/.env.example";
const localPath = "apps/n8n/.env.local";

if (existsSync(localPath)) {
  console.error(`${localPath} already exists; refusing to overwrite existing N8N secrets.`);
  process.exit(1);
}

const secret = (bytes) => randomBytes(bytes).toString("base64url");
const env = readFileSync(examplePath, "utf8")
  .replace("N8N_POSTGRES_PASSWORD=replace-with-generated-value", `N8N_POSTGRES_PASSWORD=${secret(32)}`)
  .replace("N8N_ENCRYPTION_KEY=replace-with-generated-value", `N8N_ENCRYPTION_KEY=${secret(48)}`);

mkdirSync("apps/n8n/local-files", { recursive: true });
writeFileSync(localPath, env, { mode: 0o600 });
console.log(`Created ${localPath} with generated secrets; values were not displayed.`);
