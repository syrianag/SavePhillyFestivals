import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const envPath = ".env.local";
const setting = `AUTH_SECRET=${randomBytes(48).toString("base64url")}`;
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

env = env.replace(/^BETTER_AUTH_SECRET=.*\n?/m, "");
env = /^AUTH_SECRET=.*$/m.test(env)
  ? env.replace(/^AUTH_SECRET=.*$/m, setting)
  : `${env.trimEnd()}\n\n# Auth.js secret used to encrypt cookies and JWTs\n${setting}\n`;

writeFileSync(envPath, env);
console.log(`Generated AUTH_SECRET in ${envPath} without displaying it.`);
