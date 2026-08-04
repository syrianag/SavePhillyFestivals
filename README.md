# Save Philly Festivals

Save Philly Festivals is an Nx monorepo for a Philadelphia festival platform and its outreach automation.

## Projects

| Nx project | Location | Purpose |
|---|---|---|
| `save-philly-festivals` | `apps/save-philly-festivals` | Next.js 16 App Router application using Auth.js and Prisma 7/PostgreSQL |
| `n8n` | `apps/n8n` | Isolated N8N automation runtime, dedicated PostgreSQL, workflow contract tests, and production operations configuration |

The web application and N8N use separate databases and can be released independently. `apps/n8n/DiasporaDNA.json` is intentionally inactive and creates Gmail drafts only; deployment never activates it.

## Requirements

- Node.js 20.19 or newer
- Corepack and pnpm 11.13.0
- PostgreSQL for the web application
- Docker Engine with Docker Compose for N8N
- Chromium installed by Playwright for browser tests

Use pnpm from the workspace root. npm lockfiles and npm-based install workflows are not supported.

## Web application setup

```sh
corepack enable
pnpm install --frozen-lockfile
cp apps/save-philly-festivals/.env.example apps/save-philly-festivals/.env.local
pnpm run auth:secret
pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static
pnpm exec nx run save-philly-festivals:migrate-test --outputStyle=static
pnpm run dev
```

Set `DATABASE_URL` in `apps/save-philly-festivals/.env.local` before running migrations or the application. Seed and verify the development admin with `pnpm run db:seed && pnpm run db:verify-admin`. Default local login details and secure overrides are documented in `apps/save-philly-festivals/README.md`. Open <http://localhost:3000>.

The remaining production checklist is tracked in [`remaining-production-gates.md`](remaining-production-gates.md).

## Quality gates

```sh
pnpm run lint
pnpm run test
pnpm run test:coverage
pnpm run build
pnpm exec playwright install chromium
pnpm run e2e
pnpm run n8n:validate
pnpm run n8n:validate:production
pnpm run n8n:test
pnpm audit
pnpm run verify
```

`pnpm run verify` runs Prisma validation, the dependency audit, web coverage, N8N workflow/Compose checks, lint, and the production web build. The migration gate needs a reachable blank PostgreSQL database, and Playwright remains a separate explicit browser gate locally. GitHub Actions enforces both.

Committed Prisma migrations are under `apps/save-philly-festivals/prisma/migrations`. Production releases use `prisma migrate deploy`; `prisma db push` is not a production release mechanism.

## Local N8N

```sh
pnpm run n8n:init
pnpm run n8n:validate
pnpm run n8n:plan
CONFIRM_DEPLOY=n8n pnpm run n8n:deploy
pnpm run n8n:health
```

Open <http://localhost:5678>. Local N8N binds to loopback only, uses dedicated PostgreSQL, and stores data in named volumes. Never run `docker compose down --volumes` unless destruction is explicitly intended and backed up.

## DigitalOcean N8N operations

`.github/workflows/deploy-n8n-digitalocean.yml` provides:

- A weekly and manual stable-version report. It reports drift but never edits or upgrades services.
- A no-change production plan.
- A guarded deployment requiring the `n8n-production` GitHub environment and the exact confirmation `DEPLOY_N8N_PRODUCTION`.
- Strict SSH host verification, pre-reconciliation PostgreSQL/N8N-data backups, pinned-image reconciliation, and HTTPS health verification.
- Optional import of `DiasporaDNA` from an inactive export. Activation is always a separate operator-approved action.

Configure these GitHub environment secrets without exposing their values:

- `N8N_DO_HOST`
- `N8N_DO_USER`
- `N8N_DO_SSH_PRIVATE_KEY`
- `N8N_DO_KNOWN_HOSTS`
- `N8N_DO_REMOTE_DIR`

The host must already contain `apps/n8n/.env.production`, based on `apps/n8n/config/production/.env.example`, with mode `0600` and an escrowed, stable `N8N_ENCRYPTION_KEY`. Configure DNS for `N8N_HOST`, allow public `80/443` only as required, restrict SSH, and never expose `5432` or `5678` publicly.

Production configuration is in:

- `apps/n8n/config/compose.production.yaml`
- `apps/n8n/config/production/Caddyfile`
- `apps/n8n/config/production/.env.example`

See `apps/n8n/README.md` and `docs/FDE-DELIVERY-PLAN.md` for deployment, activation, backup, rollback, and controlled-proof requirements.

## CI

`.github/workflows/ci-cd.yml` applies committed migrations to a blank PostgreSQL service and then enforces Prisma generation/validation, dependency audit, lint, unit coverage, N8N local/production validation, N8N workflow tests, production build, and Playwright E2E.

The DigitalOcean workflow is intentionally separate from CI. A green CI run does not by itself authorize deployment or workflow activation.

## Troubleshooting and resources

See `training-guide.md` for the running problem list covering pnpm development startup, Prisma 7 generation/migrations, dependency vulnerabilities, Auth.js secrets, Nx migration issues, N8N workflow safety, and DigitalOcean operations.
