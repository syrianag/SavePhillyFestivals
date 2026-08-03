# Save Philly Festivals

Save Philly Festivals is an early-stage platform for discovering Philadelphia festivals and managing their schedules, organizers, users, and inquiries. The checked-out **main** branch currently provides the database, authentication, authorization, and API foundation; its user-facing experience is still under development.

## Current application state

The application currently includes a minimal homepage plus backend services built with Next.js and PostgreSQL. Festival discovery and management are available through API route handlers, but the login screen and public, host, CRM, and admin interfaces have not yet been implemented on this branch.

> **Branch note:** this README describes the code checked out on **main**. The remote **develop** branch contains additional work that is not present in this working tree.

## Core features

- **Festival discovery API:** List published festivals chronologically with their schedules, or retrieve an individual festival by ID.
- **Festival management:** Authenticated users can create festivals. Owners and administrators can update or delete them, and signed-in users can list festivals assigned to their account.
- **Schedule management:** Store multi-day lineups with dates, start and end times, activities, and descriptions.
- **Contact intake:** Capture general or festival-specific inquiries and represent their progress as NEW, CONTACTED, or RESOLVED.
- **Credentials authentication:** Authenticate email and password credentials with Auth.js/NextAuth. Passwords are hashed with bcrypt and sessions use JWTs.
- **Role-based access:** Model ADMIN, HOST, and CRM users and attach their roles to authenticated sessions.
- **User administration:** Admin-only API handlers can list, create, update, and delete platform users without returning password hashes.
- **Development seed data:** Populate local admin, host, and CRM accounts plus a published sample festival and schedule.

## Roles

| Role | Current responsibilities |
|---|---|
| ADMIN | Manage users and update or delete any festival |
| HOST | Create festivals, list assigned festivals, and manage owned festivals |
| CRM | Receive contact assignments in the data model; CRM management endpoints and UI are not yet implemented |

## API overview

| Method | Endpoint | Purpose | Handler access |
|---|---|---|---|
| GET | /api/festivals | List published festivals with schedules | Public |
| POST | /api/festivals | Create a festival for the signed-in user | Authenticated |
| GET | /api/festivals/:id | Retrieve one festival with its schedule | Public |
| PUT, DELETE | /api/festivals/:id | Update or delete a festival | Owner or admin |
| GET | /api/host/festivals | List the signed-in user's festivals | Authenticated |
| GET | /api/schedules | List schedule entries | Public |
| POST | /api/schedules | Create a schedule entry | Authenticated |
| POST | /api/contacts | Submit a contact inquiry | Public |
| GET, POST | /api/admin/users | List or create users | Admin |
| PUT, DELETE | /api/admin/users/:id | Update or delete a user | Admin |
| GET, POST | /api/auth/* | Auth.js/NextAuth authentication routes | Public |

Access in this table reflects checks performed by the individual route handlers. See [Known limitations](#known-limitations) for the current proxy behavior and authorization gaps.

## Data model

- **User:** platform identity, hashed credentials, role, owned festivals, and assigned contacts.
- **Festival:** details, location, dates, image, host, schedules, contacts, and a DRAFT, PUBLISHED, or CANCELLED lifecycle state.
- **Schedule:** festival date, times, activity, and optional description.
- **Contact:** sender details, message, optional festival and CRM assignment, and inquiry status.

## Tech stack

- Next.js 16 App Router and React 19
- JavaScript and JSX
- Tailwind CSS 4, shadcn/ui, Base UI, and Lucide icons
- PostgreSQL with Prisma ORM 7 and the pg adapter
- Auth.js/NextAuth credentials authentication and bcrypt password hashing
- Vercel deployment configuration
- GitHub Actions for linting, builds, and production deployment

## Getting started

### Prerequisites

- Node.js 20.9 or newer (CI uses Node.js 22)
- pnpm 11 (verified with pnpm 11.13.0)
- A running PostgreSQL database

### Installation

1. Confirm the local toolchain:

   ~~~bash
   node --version
   pnpm --version
   ~~~

2. Install the exact dependency versions recorded in the pnpm lockfile:

   ~~~bash
   pnpm install --frozen-lockfile
   ~~~

   The repository explicitly allows build scripts for Prisma, Sharp, and the native module resolver in `pnpm-workspace.yaml`. Do not approve additional dependency scripts without reviewing why they are required.

3. Copy the environment template to `.env`:

   ~~~bash
   cp .env.example .env
   ~~~

   Next.js and the standalone Prisma CLI both load this file, and it is excluded from Git.

4. Set `DATABASE_URL` for your PostgreSQL instance and replace `AUTH_SECRET` with a generated value:

   ~~~bash
   openssl rand -base64 32
   ~~~

5. Generate the Prisma client and synchronize the development database:

   ~~~bash
   pnpm db:generate
   pnpm db:push
   ~~~

6. Optionally load the sample users and festival:

   ~~~bash
   pnpm db:seed
   ~~~

7. Start the development server:

   ~~~bash
   pnpm dev
   ~~~

Open [http://localhost:3000](http://localhost:3000).

### Seeded development accounts

These credentials are intended only for local development after running **pnpm db:seed**.

| Role | Email | Password |
|---|---|---|
| Admin | admin@savephillyfestivals.com | admin123 |
| Host | host@example.com | host123 |
| CRM | crm@example.com | crm123 |

## Available scripts

| Command | Description |
|---|---|
| pnpm dev | Start the development server |
| pnpm build | Create a production build |
| pnpm start | Run the production build |
| pnpm lint | Lint JavaScript and JSX in src/ |
| pnpm db:generate | Generate the Prisma client |
| pnpm db:migrate | Create and apply a development migration |
| pnpm db:push | Synchronize the schema without creating a migration |
| pnpm db:seed | Load local sample accounts and festival data |
| pnpm db:studio | Open Prisma Studio |
| pnpm db:reset | Reset the development database and reapply its schema |

## Onboarding verification

Before starting feature work, verify that dependency installation, generated database code, linting, and the production build all succeed:

~~~bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm build
~~~

If pnpm reports `ERR_PNPM_IGNORED_BUILDS`, check that `pnpm-workspace.yaml` is present and unchanged. If approval must be restored, run `pnpm approve-builds` and approve only `@prisma/engines`, `prisma`, `sharp`, and `unrs-resolver`, then repeat the frozen-lockfile install.

## Project structure

~~~text
prisma/
  schema.prisma       Database models, enums, and relationships
  seed.mjs            Local sample data
src/
  app/                App Router pages and API route handlers
  components/         Shared and shadcn/ui components
  features/           Feature module placeholders
  lib/                Authentication, Prisma client, and utilities
  proxy.js            Authentication and role-based route protection
docs/                 Engineering standards and review guidance
~~~

## Known limitations

- The homepage is currently the only browser interface; /login and the admin, host, and CRM screens referenced by the authentication configuration do not exist on main.
- Proxy route protection currently treats every path as public because "/" is matched with startsWith. Authorization inside individual API handlers still applies.
- Festival creation accepts every authenticated role, and schedule creation does not verify festival ownership.
- An individual festival can be retrieved regardless of whether it is published, and contact submissions can set fields that should normally be server-controlled.
- API inputs do not yet have a validation layer, pagination, rate limiting, or centralized error handling.
- CRM inquiry listing, assignment, and resolution endpoints are not implemented.
- Prisma migrations and automated tests are not currently committed.
- Seed runs can duplicate schedule entries because the schedule model has no matching uniqueness constraint.

## Development priorities

- Build the public festival listing and detail pages.
- Add login and role-specific dashboards.
- Correct proxy matching and close route-level authorization gaps.
- Validate and constrain API request payloads.
- Complete the CRM inquiry workflow.
- Add database migrations and automated tests for authentication, authorization, and APIs.

## Branch strategy

| Branch | Purpose |
|---|---|
| main | Production-ready code and the repository's current default branch |
| develop | Integration branch |
| feature/* | Features branched from and merged into develop |
| bugfix/* | Fixes branched from and merged into develop |
| release/* | Release candidates merged into main and develop |
