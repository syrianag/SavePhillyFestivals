# Save Philly Festivals: Running Problem and Training Guide

This is the project’s living problem list. Each entry records the symptom, cause, remedy, verification, and resources used. Run commands from the workspace root unless stated otherwise.

## Supported environment

- Node.js 20.19 or newer
- pnpm 11.13.0 through Corepack
- Nx workspace with `save-philly-festivals` and `n8n`
- PostgreSQL for Prisma
- Docker Compose for N8N

```sh
corepack enable
pnpm install --frozen-lockfile
node --version
pnpm --version
pnpm exec nx show projects
```

npm/npx examples below are retained only as original symptoms. pnpm and Nx targets are authoritative.

## 1. `npm run dev` / `pnpm run dev` did not start the project

### Symptom

The application could not be started consistently after its dependencies and files moved into an Nx workspace.

### Cause

The project needed one package manager, a correct app-local working directory, approved pnpm dependency build scripts, generated Prisma 7 output, and Next.js/Nx paths aligned with `apps/save-philly-festivals`. Mixing npm and pnpm also relocated dependencies and invalidated lockfile assumptions.

### Remedy

- Standardized on `pnpm@11.13.0` and removed `package-lock.json`.
- Moved pnpm overrides/build approvals to `pnpm-workspace.yaml`.
- Made the root `dev` script call the app’s Nx target, whose working directory is the app root.
- Kept Prisma generation in `postinstall`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static
pnpm run dev
```

### Verification

Next.js prints its local URL and `Ready`. For automated release verification, use `pnpm run build` and `pnpm run e2e` rather than treating a running dev server as sufficient.

### Resources

- [pnpm workspaces](https://pnpm.io/workspaces)
- [Nx run-commands](https://nx.dev/nx-api/nx/executors/run-commands)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)

## 2. `npx prisma generate` did not generate the Prisma client

### Symptom

Prisma generation failed or could not find the nested schema/environment after upgrading to Prisma 7.

### Cause

Prisma 7 is ESM-first, uses `prisma.config.ts`, does not automatically load `.env.local` for CLI work, requires an explicit output for the `prisma-client` generator, and uses a PostgreSQL driver adapter at runtime.

### Remedy

- Added root `"type": "module"`.
- Added `apps/save-philly-festivals/prisma.config.ts` and explicit `.env.local` loading.
- Generated the client into `src/generated/prisma`.
- Added `@prisma/adapter-pg` and used it in database/seed code.
- Exposed stable Nx targets:

```sh
pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static
pnpm exec nx run save-philly-festivals:prisma-validate --outputStyle=static
```

`generate` creates application client code; it does not create tables.

### Verification

Both targets exit 0 and report Prisma Client 7 generation plus a valid schema.

### Resources

- [Upgrade to Prisma ORM 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma Config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Prisma Client generation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [PostgreSQL driver adapters](https://www.prisma.io/docs/orm/overview/databases/postgresql#using-driver-adapters)

## 3. The database schema had no reproducible migration history

### Symptom

The Prisma schema existed, but `prisma/migrations` was absent and ignored. A production database could not be recreated through reviewed migration files.

### Cause

Client generation and `db push` had been treated as schema delivery. Neither is a replacement for committed migrations.

### Remedy

- Removed the migrations path from `.gitignore`.
- Generated a baseline SQL migration under `apps/save-philly-festivals/prisma/migrations/20260804000000_baseline`.
- Added `migration_lock.toml`.
- Added `save-philly-festivals:migrate-test`, which runs `prisma migrate deploy` and `prisma migrate status` against a disposable database.

```sh
DATABASE_URL='postgresql://...' pnpm run migrate:test
```

Production releases use:

```sh
pnpm exec prisma migrate deploy --config apps/save-philly-festivals/prisma.config.ts
```

Do not use `prisma db push` for production releases.

### Verification

GitHub Actions starts a blank PostgreSQL service, applies every committed migration, and requires migration status to be current.

### Resources

- [Prisma Migrate development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Prisma `migrate deploy`](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
- [Prisma `migrate diff`](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff)

## 4. Dependency installation and 10 high-severity vulnerabilities

### Symptom

The old dependency tree produced resolver conflicts and an audit containing 10 high-severity issues.

### Cause

Stale Next.js/transitive packages and an unused Nodemailer/Auth.js optional dependency chain introduced vulnerable versions and peer conflicts. Mixing package managers obscured the effective dependency graph.

### Remedy

- Removed unused Nodemailer rather than forcing an incompatible peer tree.
- Upgraded direct dependencies to patched compatible releases, including Next.js 16.3 and Prisma 7.
- Scoped the Nx `brace-expansion` override so ESLint’s older Minimatch chain was not broken.
- Standardized the lockfile and audit on pnpm.

```sh
pnpm install --frozen-lockfile
pnpm audit
```

Do not use a forced major-version audit fix without reviewing compatibility.

### Verification

`pnpm audit` reports no known vulnerabilities. CI runs the audit on every change.

### Resources

- [pnpm audit](https://pnpm.io/cli/audit)
- [GitHub Advisory Database](https://github.com/advisories)
- [npm peer dependencies](https://docs.npmjs.com/cli/configuring-npm/package-json#peerdependencies)

## 5. Auth.js `ClientFetchError` and application crash

### Symptom

```text
ClientFetchError: There was a problem with the server configuration.
```

The Auth.js session endpoint failed because the server lacked its required secret.

### Cause

Auth.js requires `AUTH_SECRET` for cookie/JWT cryptography. Running an ambiguous `npx auth secret` can resolve a different package and create `BETTER_AUTH_SECRET`, which this application does not read.

### Remedy

Use the repository-owned generator, which writes a random value to the ignored app-local environment file without printing it:

```sh
pnpm run auth:secret
```

Configure a separate production `AUTH_SECRET` through the hosting secret manager. Rotating it invalidates existing sessions.

### Verification

With the app running:

```sh
curl --fail-with-body http://localhost:3000/api/auth/session
```

An unauthenticated request returns HTTP 200 with JSON `null`, not a server-configuration error. Playwright enforces this behavior.

### Resources

- [Auth.js deployment and `AUTH_SECRET`](https://authjs.dev/getting-started/deployment#auth_secret)
- [Auth.js MissingSecret error](https://errors.authjs.dev#missingsecret)
- [Node.js crypto API](https://nodejs.org/api/crypto.html)

## 6. Tests did not protect startup, schema, or authentication behavior

### Symptom

Lint/build could pass while calendar serialization, validation, uploads, route protection, or Auth.js runtime behavior regressed.

### Cause

The Nx projects had no unit, coverage, E2E, migration, or workflow test targets.

### Remedy

Added Vitest tests for ICS output, Zod mapping, upload validation/path handling, and festival schemas; Playwright smoke tests for public/auth/admin routes; migration application; and N8N workflow contract fixtures.

```sh
pnpm run test
pnpm run test:coverage
pnpm exec playwright install chromium
pnpm run e2e
pnpm run n8n:test
```

### Verification

The implemented web suite contains 17 unit tests and 6 browser smoke tests. The N8N contract suite contains 8 static tests. CI runs coverage, E2E with zero retries, and uploads Playwright failure artifacts.

### Resources

- [Vitest guide](https://vitest.dev/guide/)
- [Playwright test configuration](https://playwright.dev/docs/test-configuration)
- [Nx project configuration](https://nx.dev/reference/project-configuration)

## 7. N8N workflow was not portable or safe to activate

### Symptom

The exported workflow contained source credential/instance references, one-minute polling, presence-only validation, no replay guard, placeholders, prompt-injection risk, and no meaningful failure status.

### Cause

The JSON was an environment export rather than a production contract. Provider credentials, Sheet binding, model compatibility, durable row state, and activation controls were implicit.

### Remedy

- Kept `active: false` and Gmail draft-only.
- Removed credential IDs, source instance metadata, cached URLs, and concrete Sheet/model bindings.
- Added normalized/bounded input, ready-status and duplicate guards, prompt-injection controls, output checks, and explicit success/failure semantics.
- Added fixture/static validation without external calls.
- Kept credential binding, model verification, controlled proof, and activation as manual production steps.

```sh
pnpm run n8n:test
pnpm run n8n:validate
pnpm run n8n:validate:production
```

### Verification

The contract suite rejects activation, send nodes, embedded environment metadata, placeholders, missing guards, and an incomplete fixture matrix. It does not claim that Gemini, Gmail, or Sheets credentials work; those require an authorized controlled proof.

### Resources

- [N8N workflow exports](https://docs.n8n.io/workflows/export-import/)
- [N8N security guidance](https://docs.n8n.io/hosting/securing/overview/)
- [N8N error handling](https://docs.n8n.io/flow-logic/error-handling/)

## 8. N8N production deploys and upgrades needed guardrails

### Symptom

Local Compose was safe, but there was no TLS production configuration, backup-first deployment, approval gate, or stable-version reporting for DigitalOcean.

### Cause

The existing Nx operations script was intentionally local and had no DigitalOcean credentials, DNS, reverse proxy, or GitHub environment authorization.

### Remedy

- Added a Caddy production override with HTTPS canonical URLs and execution pruning.
- Added `.github/workflows/deploy-n8n-digitalocean.yml` with scheduled/manual upgrade reporting, plan, and guarded deployment.
- Required strict SSH host keys, the `n8n-production` environment, exact deploy confirmation, pre-change backups, HTTPS health, and inactive-only optional import.
- Kept upgrades report-only and activation out of automation.

### Verification

Validate the production model locally:

```sh
pnpm run n8n:validate:production
```

In GitHub, run `plan` before `deploy`. Configure environment protection rules and required secrets. A green workflow is not activation authorization.

### Resources

- [GitHub deployment environments](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [DigitalOcean cloud firewalls](https://docs.digitalocean.com/products/networking/firewalls/)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [N8N release notes](https://docs.n8n.io/release-notes/)

## 9. Zed files were not auto-saving globally

### Symptom

Editor buffers could remain unsaved and make validation appear inconsistent with visible edits.

### Remedy and verification

The global Zed settings at `~/.config/zed/settings.json` now contain delayed auto-save:

```json
"autosave": {
  "after_delay": {
    "milliseconds": 1000
  }
}
```

This applies globally, not just to this workspace.

### Resources

- [Zed auto-save settings](https://zed.dev/docs/configuring-zed#autosave)
