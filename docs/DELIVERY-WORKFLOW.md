# Feature Delivery and Branching Workflow

## Policy

`main` is protected and always releasable. Nothing merges into `main` without passing the required unit, integration/contract, build, and end-to-end gates on the exact revision proposed for merge.

Use short-lived GitHub Flow branches from an up-to-date `main`:

- `feature/f01-responsive-discovery`
- `feature/f02-festival-details`
- `feature/f03-schedule-builder`
- `feature/f04-schedule-email`
- `feature/f05-consent-n8n`
- `feature/f06-calendar-export`
- `feature/f07-producer-submission`
- `feature/f08-editorial-workflow`
- `feature/f09-social-grid`
- `fix/<ticket>-<description>`
- `chore/<ticket>-<description>`

The current `chore/feature-delivery-baseline` branch is a one-time stabilization branch preserving the existing uncommitted Nx workspace migration. It must pass the same gates before it is eligible to merge. After stabilization, retire the long-lived `dev`/`develop` integration path and branch directly from protected `main`.

## Feature lifecycle

1. Create or link an issue to a `docs/Features.md` feature ID and acceptance criteria.
2. Create a short-lived branch from current `main`.
3. Add or update unit tests before or with the behavior change.
4. Implement the smallest coherent vertical slice.
5. Add API/database integration tests where persistence, authorization, or provider boundaries matter.
6. Add Playwright coverage for the user-visible critical path at mobile and desktop widths.
7. Run focused tests during development.
8. Rebase/update from `main`, then run all required gates.
9. Open a pull request using the repository template and attach UI evidence where applicable.
10. Resolve review feedback and rerun gates on the final revision.
11. Squash merge into `main` only after required checks and approvals pass.
12. Delete the remote and local feature branch after merge.
13. Tag production releases from a green `main` SHA; operational activation remains a separate approval for N8N and other external integrations.

Target branch lifetime is no more than three working days. Use feature flags for incomplete or externally gated functionality rather than keeping long-lived branches.

## Required merge gates

Every pull request must pass:

```sh
pnpm install --frozen-lockfile
pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static
pnpm exec nx run save-philly-festivals:prisma-validate --outputStyle=static
pnpm exec nx run save-philly-festivals:migrate-test --outputStyle=static
pnpm exec nx run save-philly-festivals:audit --outputStyle=static
pnpm exec nx run save-philly-festivals:lint --outputStyle=static
pnpm exec nx run save-philly-festivals:test-coverage --outputStyle=static
pnpm exec nx run n8n:test --outputStyle=static
pnpm exec nx run n8n:validate --outputStyle=static
pnpm exec nx run save-philly-festivals:build --outputStyle=static
pnpm exec nx run save-philly-festivals:e2e --outputStyle=static
```

Provider clients are mocked or disabled in CI. No test may call Resend, Google Drive, an organizer ESP, social platforms, Gemini, Gmail, or production N8N.

A flaky test blocks merge. Retries may collect diagnostics but may not convert a failing test into an accepted result.

## Feature-specific test expectations

| Feature | Unit/integration minimum | E2E minimum |
|---|---|---|
| F-01 Discovery | Query parser, date overlap, filters, sorting, pagination, approved-only queries | URL-state filters, pagination, no-results, keyboard modal, mobile/desktop |
| F-02 Details | Approved-only lookup, date/time formatting, fallback mapping | Approved detail renders; unapproved direct URL is unavailable |
| F-03 Schedule | Versioned storage, migration/reset, mixed-item dedupe, stale-item handling | Add/remove/clear and reload persistence for festival and event |
| F-04 Email | Validation, idempotency, mocked mail success/failure, safe response | Email schedule without marketing consent |
| F-05 Consent/N8N | Consent versioning, per-organizer outbox, idempotency, N8N fixtures | Consent unchecked/checked and partial-failure status |
| F-06 Calendar | Philadelphia DST, all-day/multi-day, mixed selection, escaping | Download selected schedule at mobile/desktop widths |
| F-07 Producer | Schema, ownership, state rules, mocked Drive client | Producer login, draft, upload, submit, validation errors |
| F-08 Editorial | Role/transition rules, audit entries, public visibility, mocked email | Admin review/reject/approve and resulting public visibility |
| F-09 Social | URL validation, moderation states, provider fallback/cache | Official links, approved feed, hidden post, provider failure |

## Review and approval

- At least one engineering approval for normal changes.
- Two approvals for authentication, authorization, consent, uploads, database migrations, calendar semantics, N8N, or deployment changes.
- Product-owner approval for behavior, copy, and visual acceptance.
- Authors cannot be the sole approver.
- All review conversations must be resolved.
- GitHub usernames/teams are required before repository `CODEOWNERS` enforcement can map the client contacts; email addresses alone are not valid CODEOWNERS entries.

## Database changes

- One coherent, reviewed Prisma migration per schema change.
- Prove blank-database application in CI and test representative upgrades where data transforms.
- Use expand/contract migrations for incompatible changes.
- Never edit a migration already deployed to a shared environment.
- Never use `prisma db push` as a production release mechanism.
- Include rollback or forward-recovery notes in the pull request.
- Bulk source-data imports follow `docs/FESTIVAL-DATA-MIGRATION.md`: profile and dry-run first, preserve row lineage, quarantine ambiguity, prove idempotent replay on disposable PostgreSQL, and keep imported records private until editorial approval.

## External integration activation

Merging tested integration code does not authorize production activation. Google Drive, N8N organizer workflows, social aggregation, or other provider integrations require:

- Approved credentials and least-privilege access.
- Redacted logs and configured retention.
- Monitoring and a named operator.
- Backup/restore or provider recovery procedure.
- Controlled non-production or allowlisted proof.
- Separate explicit activation approval.

## Final handoff

`docs/Client-UserGuide.md` is published and covers the delivered application. It will cover visitor, producer, editor/admin, integration-operator, troubleshooting, privacy, and recovery workflows using the final application rather than speculative screens.
