# Save Philly Festivals Web Application

This directory is the Next.js 16 deployment unit for the `save-philly-festivals` Nx project.

## Layout

```text
apps/save-philly-festivals/
├── e2e/                  # Playwright smoke tests
├── prisma/
│   ├── migrations/       # Committed PostgreSQL migration history
│   ├── schema.prisma
│   └── seed.js
├── public/               # Static assets and development-only local uploads
├── scripts/              # App-local maintenance scripts
├── src/
│   ├── app/              # App Router routes and handlers
│   ├── components/
│   ├── features/
│   ├── generated/        # Generated Prisma Client; ignored
│   └── lib/
├── tests/unit/           # Vitest tests
├── playwright.config.js
├── prisma.config.ts
├── project.json
└── vitest.config.js
```

## Environment

Copy `.env.example` to `.env.local`, set a PostgreSQL `DATABASE_URL`, then generate a local Auth.js secret from the workspace root:

```sh
pnpm run auth:secret
```

Never commit `.env.local`. Production secrets belong in the deployment platform’s secret manager. Tests use controlled values and do not call real authentication or email providers.

## Local database and login

Apply migrations, seed development data, and verify the admin hash/role without printing the password:

```sh
pnpm run migrate:test
pnpm run db:seed
pnpm run db:verify-admin
```

Default development accounts are:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@savephillyfestivals.org` | `admin123` |
| Producer | `producer@savephillyfestivals.org` | `producer123` |

These defaults are for development only. Override them in the ignored `.env.local` with `LOCAL_ADMIN_EMAIL`, `LOCAL_ADMIN_PASSWORD`, `LOCAL_PRODUCER_EMAIL`, and `LOCAL_PRODUCER_PASSWORD`, then rerun `pnpm run db:seed`. Production seeding refuses the default admin password when `NODE_ENV=production`.

The seed is idempotent: users and domain reference data are updated, and known schedules are updated rather than duplicated.

## Nx targets

Run from the workspace root:

```sh
pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static
pnpm exec nx run save-philly-festivals:prisma-validate --outputStyle=static
pnpm exec nx run save-philly-festivals:migrate-test --outputStyle=static
pnpm exec nx run save-philly-festivals:lint --outputStyle=static
pnpm exec nx run save-philly-festivals:test --outputStyle=static
pnpm exec nx run save-philly-festivals:test-coverage --outputStyle=static
pnpm exec nx run save-philly-festivals:build --outputStyle=static
pnpm exec nx run save-philly-festivals:e2e --outputStyle=static
```

`migrate-test` applies the committed migration history and checks migration status. Point `DATABASE_URL` to a disposable blank PostgreSQL database. Production uses `prisma migrate deploy`, never `prisma db push`.

Playwright builds and starts the application on port 3100 and covers public routes, login rendering, admin route protection, and the Auth.js session endpoint. Install Chromium once with `pnpm exec playwright install chromium`.

## Deployment

Configure the hosting platform’s application root as `apps/save-philly-festivals` while installing dependencies from the workspace root with `pnpm-lock.yaml`. The production build output is `.next` under this directory.

Local filesystem uploads under `public/uploads` are not durable production storage. Select durable object storage before treating uploads as a production-supported capability.
