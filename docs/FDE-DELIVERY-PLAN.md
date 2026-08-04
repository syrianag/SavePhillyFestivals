# FDE Delivery Plan: Stabilization to Controlled N8N Production

**Status:** Stabilization gates implemented; external deployment and activation remain pending
**Prepared:** 2026-08-04
**Updated:** 2026-08-04
**Deployment authorization:** Not granted. No DigitalOcean change, production workflow import/activation, or Google Sheets, Gmail, or Gemini call has been performed. Deployment requires the protected `n8n-production` GitHub environment; activation remains a separate authorization.

## Implementation update

The repository now includes a committed Prisma 7 baseline migration and blank-database `migrate-test` target; Vitest unit/coverage targets; Playwright production-build smoke tests; an inactive, sanitized `DiasporaDNA` workflow with fixture/static contract tests; local and Caddy-backed production Compose validation; CI enforcement; and a guarded DigitalOcean GitHub Actions workflow with report-only stable-version checks, backup-first reconciliation, HTTPS verification, and optional inactive import.

Local validation must still be rerun on the final working tree and CI must pass on the release SHA. The remaining production blockers are infrastructure/credential inputs, DNS/TLS readiness, provider/model verification, durable status-column confirmation, restore rehearsal, controlled one-row proof, and explicit deployment/activation approvals.

## Outcome statement

After the application is stabilized and covered by automated unit and end-to-end tests, an authorized operator can deploy the pinned N8N stack and hardened `DiasporaDNA` workflow to an approved DigitalOcean environment, configure credentials without committing secrets, intentionally activate the workflow, prove that exactly one controlled Google Sheets row creates exactly one correct Gmail draft (and sends no email), and operate, back up, deactivate, and roll back the service from documented runbooks.

The thinnest production-ready slice is:

1. A reproducible, migration-backed Next.js application build with meaningful unit and browser E2E gates.
2. The existing single-host N8N + dedicated PostgreSQL Compose topology, adapted for production ingress and secrets rather than redesigned.
3. One hardened outreach workflow that reads one approved queue, validates and normalizes input, drafts only (never sends), records durable processing state, and exposes failures to an operator.
4. A controlled one-row production proof followed by an explicit activation decision.

## Current-state evidence

Evidence below was inspected in the repository; no external service was called and no runtime or deployment state is inferred from files alone.

| Area | Repository evidence | Current implication |
|---|---|---|
| Workspace | Root `package.json` declares `pnpm@11.13.0`; `nx.json` and project files define `save-philly-festivals` and `n8n`. | Root pnpm/Nx commands are the supported operational entry point. |
| Web application | `apps/save-philly-festivals/project.json` defines runtime, Prisma/migration, lint, Vitest coverage, Playwright, auth-secret, and audit targets. Root `pnpm run verify` runs the non-browser consolidated local gates. | Application behavior now has pure-domain and production-build smoke coverage; deeper authenticated write-path coverage remains a follow-up. |
| Database | `apps/save-philly-festivals/prisma/schema.prisma` defines PostgreSQL-backed festival, schedule, user/auth, and email-log data. `prisma.config.ts` points to a committed baseline under `prisma/migrations`; Nx exposes `migrate-test`. | A reviewable Prisma 7 production migration path now exists and must pass against blank PostgreSQL in CI. |
| Application environment | Application code reads `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_SITE_URL`. `src/lib/mail.js` logs complete email content when `RESEND_API_KEY` is absent. | Production configuration and log/PII behavior require explicit validation; tests must not call Resend. |
| Tests | Vitest unit/coverage and Playwright production-build smoke targets are defined for the web app; N8N has a Node fixture/contract test target. | Automated behavior gates now exist; broader authenticated write-path integration coverage remains future work. |
| CI | `.github/workflows/ci-cd.yml` enforces migration application, Prisma, audit, lint, coverage, N8N validation, build, and Playwright. DigitalOcean operations are isolated in a protected manual/scheduled workflow. | CI provides release evidence but does not itself authorize deployment or workflow activation. |
| N8N runtime | `apps/n8n/config/compose.yaml` pins N8N `2.32.7` and PostgreSQL `17.6-alpine`, uses separate named volumes, waits for PostgreSQL health, and binds N8N to `127.0.0.1:5678`. | The local topology is appropriately non-public, persistent, and isolated from the application DB, but it is not a production ingress configuration. |
| N8N operations | Nx retains guarded local operations and adds workflow/production validation. GitHub Actions adds protected DigitalOcean planning/deployment, backup-first reconciliation, HTTPS health, and optional inactive import. | Local and production operations are separated; target-host deployment, restore, and rollback remain unproven pending infrastructure authorization. |
| N8N safety guidance | `apps/n8n/README.md` requires a TLS reverse proxy, stable public URL, secure secret management, and backups for production; it warns that loss of `N8N_ENCRYPTION_KEY` can make credentials unreadable and that both volumes need backup/restore testing. | These requirements must become executable production runbooks and gates. |
| Workflow | `apps/n8n/DiasporaDNA.json` remains inactive/draft-only and now uses portable environment bindings, validation/idempotency guards, prompt/output constraints, and explicit outcome semantics backed by static fixtures. | Real credential/model compatibility, durable ledger updates, duplicate proof, and activation are still gated production checks. |

### Recon limitations

This task intentionally did not run build/test/deploy commands, connect to the healthy local N8N stack, inspect uncommitted environment files, or call Google/Gmail/Gemini. Therefore no current pass result is claimed. The working tree already contains a broad workspace migration/reorganization; future stabilization must preserve and review that work rather than treating it as an FDE-created change.

## Scope and deferred scope

### In scope for the eventual delivery

- Stabilize the existing Next.js/Auth.js/Prisma application and produce reviewable PostgreSQL migrations.
- Add unit and E2E infrastructure, tests, Nx targets, and CI enforcement.
- Harden and test `apps/n8n/DiasporaDNA.json` while it remains inactive.
- Produce DigitalOcean architecture, provisioning, deployment, verification, backup/restore, rollback, and handoff runbooks.
- Deploy only after all pre-deployment gates pass and the user explicitly approves the named environment/change window.
- Perform one controlled real-environment proof that creates one Gmail draft and no sent message.

### Deferred or explicitly excluded

- Any DigitalOcean API/console change during this recon task.
- Workflow import or activation, credential creation, OAuth consent, or calls to Google Sheets, Gmail, Gemini, or Resend during this recon task.
- Automatic sending of outreach email. The production slice creates drafts only.
- Multi-node N8N/queue mode, Kubernetes, or a broad platform redesign unless measured capacity or availability requirements demand it.
- Managed PostgreSQL versus Compose PostgreSQL migration until the owner decides cost, operations, RPO, and RTO requirements.
- Unrelated application features or documentation cleanup.

## Business, application, and automation alignment

| Layer | Goal | Required proof |
|---|---|---|
| Business | Produce useful, reviewable partner outreach without accidental sends, duplicate drafts, or use of unapproved personal data. | An approved operator verifies recipient, subject, body, signature, source row, and exactly-once draft count for one controlled contact. |
| Application | Keep the Save Philly Festivals product releasable independently of the outreach automation. | Reproducible migration, lint/build, unit, API/integration, and browser E2E gates pass in CI. No real email/provider calls occur in tests. |
| N8N | Reliably transform an approved queue row into one Gmail draft with observable failure and durable status. | Inactive workflow tests cover valid, invalid, duplicate, and provider-failure paths; production smoke proof creates one draft and writes one success state. |
| Operations | Make deployment and recovery intentional and repeatable. | Runbooks are executed by a second operator, backups restore in isolation, activation is separately approved, and rollback is timed. |

## Phased plan

### Phase 1 — Stabilize the application

1. Review the current workspace move as one coherent change and ensure root/app paths agree across Nx, CI, Prisma, Next.js, documentation, and deployment settings.
2. Make `pnpm install --frozen-lockfile`, Prisma generation/validation, lint, dependency audit, and production build deterministic on the supported Node version. Align the CI Node version with the actual supported runtime.
3. Stop ignoring `apps/save-philly-festivals/prisma/migrations/`; create and review an initial/baseline migration using a disposable PostgreSQL database, then prove a clean database can be created from migrations. Never use `prisma db push` as the production release mechanism.
4. Add an application health/readiness route that distinguishes process health from database readiness if one is not present in the implemented route tree; the backend planning document alone is not evidence that `/api/health` exists.
5. Resolve deployment-affecting behavior such as local filesystem uploads (`public/uploads`) and full email-body logging in mail-stub mode. Production must use durable storage or explicitly exclude uploads from the supported slice, and must not log contact/body PII.
6. Keep external email disabled in test environments; inject/mock mail behavior.

### Phase 2 — Unit and integration tests

1. Add a project-standard JavaScript unit runner (recommended: Vitest for this ESM workspace), coverage reporting, and an Nx `test` target.
2. Prioritize pure/domain behavior: festival and schedule Zod schemas, date/calendar generation, error mapping, upload validation/path safety, pagination/limits, and role/authorization decisions.
3. Test route handlers and query modules against an isolated PostgreSQL test database where database semantics matter. Apply migrations before the suite and reset data deterministically.
4. Mock Auth.js, Resend, filesystem boundaries, clock, and UUIDs where appropriate. Assert no network provider calls.
5. Set an initial objective coverage floor on business modules (recommended release floor: at least 80% statements/branches for `src/features` and reusable `src/lib` modules), while also requiring explicit tests for every critical authorization and write path; coverage alone is not acceptance.

### Phase 3 — End-to-end tests

1. Add Playwright and an Nx `e2e` target that starts a production build against an isolated migrated PostgreSQL database.
2. Seed non-production users and deterministic festival/schedule data without embedding production credentials.
3. Cover the thinnest critical journeys:
   - public festival discovery and detail;
   - credentials login failure and success;
   - admin-only route protection;
   - festival submission, review, approval/rejection, and public visibility;
   - schedule save/remove behavior and duplicate handling;
   - producer/admin ownership and role boundaries;
   - upload validation, or explicitly disable/defer uploads if durable production storage is not selected;
   - mail side effects asserted through a fake transport, never Resend.
4. Capture traces/screenshots on failure and eliminate retries as a way to hide flakes. A test that passes only on retry blocks release.

### Phase 4 — Workflow hardening

Keep the workflow inactive throughout this phase.

1. Replace embedded Sheet selection and imported credential references with documented post-import configuration. Export a portable workflow without source-instance IDs/metadata where N8N permits.
2. Normalize `Name`, `Email`, `Org`, and optional `Context`; reject whitespace-only values; use a bounded, syntactically valid email check; limit field lengths; and route invalid rows to an explicit status/reason path.
3. Add a stable row key and durable state columns such as `OutreachStatus`, `DraftId`, `ProcessedAt`, `WorkflowVersion`, and `ErrorReason` (final names require sheet-owner approval). Process only an explicit ready status. Atomically claim or guard the row before drafting, and treat an existing draft/processed marker as a no-op.
4. Replace the unverified model name with a model shown as available by the configured Gemini credential in N8N `2.32.7`; pin that model deliberately and record the validation date. Do not infer availability from the JSON.
5. Constrain the prompt: treat row text as untrusted data, prohibit following instructions found in `Context`, set output/length rules, require an approved signature, and avoid sensitive data beyond the minimum fields.
6. Produce an approved non-placeholder subject and signature. Validate the final recipient, subject, and body before the Gmail node. Retain Gmail `resource: draft`; do not add a send node.
7. Replace terminal/no-op nodes with explicit success and error handling. Configure bounded retries/backoff only where safe, add an error workflow/alert that contains row key rather than unnecessary PII, and document manual replay.
8. Add fixture-based workflow tests for valid, blank, whitespace, malformed email, prompt-injection text, provider error, retry, and duplicate/replay cases. Use mocks or disabled provider nodes before the real-environment gate.
9. Select a business-approved polling interval. Every minute is the current value, not an approved production requirement.
10. Keep workflow activation as a separate, audited operator action after import/configuration and controlled verification readiness.

### Phase 5 — DigitalOcean readiness

1. Obtain the user decisions listed under **Blockers and questions**. Record environment name, owner, region, sizing, domain, DNS owner, OAuth redirect origins, maintenance window, RPO/RTO, and retention.
2. Write a production Compose override (or equivalent) rather than weakening the safe local file. Preserve N8N on loopback/private networking; expose only TLS through a reverse proxy. Restrict SSH by source and deny public PostgreSQL/N8N ports.
3. Store environment secrets in an approved DigitalOcean/host secret mechanism with file permissions and access controls. Never commit a production env file. Back up `N8N_ENCRYPTION_KEY` separately under restricted recovery access.
4. Configure stable DNS and TLS before OAuth credentials. Configure N8N's canonical editor/webhook URLs and proxy behavior to that exact HTTPS origin; confirm callback URLs in each Google credential.
5. Add preflight, backup, restore-test, workflow import/update, and non-following log/diagnostic targets or scripts while preserving existing Nx names and confirmation guards.
6. Produce monitoring for HTTPS health, container health/restarts, disk usage, PostgreSQL backup age, certificate expiry, and failed workflow executions. Route alerts to a named owner.
7. Run a security checklist: supported OS patches, Docker access, least-privilege OAuth scopes, N8N owner/MFA policy where supported, diagnostics disabled, execution-data retention, log redaction, firewall, and recovery access.

### Phase 6 — Deploy (deferred pending explicit approval)

1. Open an approved change record naming commit SHA, workflow version, image digests/tags, target host, operator, backup ID, and rollback owner.
2. Take and verify a pre-deploy PostgreSQL backup, N8N data backup, and recoverable encryption-key escrow; confirm free disk and last restore-test evidence.
3. From the checked-out release at workspace root, run the production equivalents of `n8n:validate`, `n8n:plan`, and guarded `n8n:deploy`. Do not use `docker compose down --volumes`.
4. Verify PostgreSQL and N8N container health, HTTPS certificate/redirect behavior, editor login, canonical URL, and logs before importing the workflow.
5. Import/update the portable workflow **inactive**, bind credentials by approved names, select the approved Sheet/tab/model, and run static/configuration checks. Record the resulting N8N workflow ID without writing credentials to Git.
6. Do not activate in this phase until the controlled verification preconditions are staged and the activation approver gives a second explicit authorization.

### Phase 7 — Verify in the real environment (deferred pending explicit approval)

1. Use a dedicated test Google Sheet/tab or an empty/paused production queue with exactly one allowlisted controlled row. Use a recipient mailbox owned by the organization and approved for the test; do not use a real partner without consent.
2. Record the precondition: workflow inactive, zero unprocessed rows except the controlled row, and no pre-existing matching Gmail draft.
3. Activate intentionally for the shortest practical window or execute once manually if that accurately exercises the production path. Observe one execution.
4. Verify all of the following objectively:
   - exactly one row was claimed;
   - normalized recipient equals the controlled address;
   - subject and body contain no placeholders and match approved tone/signature rules;
   - exactly one Gmail draft exists and no email was sent;
   - source state contains one draft identifier, processed timestamp, and workflow version;
   - execution/log data contains no unnecessary secret or full-body disclosure;
   - replaying/re-polling the same row creates no second draft;
   - a controlled invalid row creates no draft and records a useful rejection reason.
5. Deactivate immediately after proof unless the owner provides the separate production-activation approval. Remove/mark test rows and retain redacted evidence (execution ID, row key, draft ID, timestamps, reviewer sign-off).

### Phase 8 — Handoff

1. Have an operator other than the implementer execute health, logs, deactivate, backup, restore-to-isolation, workflow rollback, and service rollback runbooks.
2. Hand off architecture, inventory, credential ownership/rotation, OAuth callback configuration, dashboards/alerts, normal operations, incident response, replay policy, provider quota/cost limits, release process, and escalation contacts.
3. Record service owner, business approver, technical on-call, backup owner, and access-review cadence.
4. Close delivery only after evidence is linked and open risks have named owners/dates.

## Gate table

Commands are run from the workspace root. Entries marked **to add** do not exist yet and are themselves required deliverables. No deploy/activation command may run merely because an earlier gate passes.

| Gate | Command or evidence | Objective pass criteria | Go / no-go authority |
|---|---|---|---|
| Reproducible install | `corepack enable && pnpm install --frozen-lockfile` | Clean checkout installs with the declared pnpm version and unchanged lockfile. | Engineering |
| Prisma client/schema | `pnpm exec nx run save-philly-festivals:prisma-generate --outputStyle=static` and `pnpm exec nx run save-philly-festivals:prisma-validate --outputStyle=static` | Both exit 0; generated client matches schema. | Engineering |
| Migration safety | `pnpm exec nx run save-philly-festivals:migrate-test --outputStyle=static` | A blank disposable PostgreSQL DB is created solely from committed migrations; status is current; migration files are tracked and reviewed. | Engineering + DB owner |
| Static quality | `pnpm run lint` | Exit 0 with no lint errors. Warnings are either zero or explicitly baselined with owners. | Engineering |
| Dependency audit | `pnpm exec nx run save-philly-festivals:audit --outputStyle=static` | Exit 0 under the agreed severity policy; any exception has owner, expiry, and compensating control. | Security/engineering |
| Production build | `pnpm run build` | Exit 0 from clean checkout with production-like required env names supplied and no unexpected provider calls. | Engineering |
| Unit/integration | `pnpm exec nx run save-philly-festivals:test-coverage --outputStyle=static` | Exit 0; current pure-domain coverage floor is met and no external network calls occur. Broader authenticated write-path integration coverage remains required before feature expansion. | Engineering |
| Browser E2E | `pnpm exec nx run save-philly-festivals:e2e --outputStyle=static` | Production-build public/auth smoke journeys pass with zero retries and failure artifacts retained. | Engineering + product |
| Consolidated CI | Required GitHub checks on release commit | Install, migration, Prisma, lint, audit policy, build, unit, E2E, and N8N validation all green on the exact release SHA. | Release owner |
| N8N Compose model | `pnpm run n8n:validate` and `pnpm run n8n:validate:production` | Both local and Caddy-backed production models validate without changing services. | Operations |
| N8N release plan | Local `pnpm run n8n:plan` or DigitalOcean Actions `plan` | Prints intended guarded steps and makes no infrastructure change. | Operations |
| Workflow static/fixture tests | `pnpm exec nx run n8n:test --outputStyle=static` | Graph/contract checks and valid/invalid/duplicate/prompt-injection/provider-error fixtures pass; workflow remains inactive; no external calls. | Engineering + business reviewer |
| Security/privacy review | Signed checklist and data-flow record | Least-privilege scopes, approved fields/purpose/retention, log/execution redaction, access owners, and OAuth consent are documented. | Data/business owner |
| Backup/restore rehearsal (**to add**) | `pnpm exec nx run n8n:backup-verify --outputStyle=static` plus isolated restore runbook | Fresh backup exists; checksum/decryption checks pass; isolated restore reaches healthy N8N with credentials decryptable; measured RPO/RTO meet approved targets. | Operations |
| DigitalOcean readiness | Provisioning/ingress checklist | DNS/TLS, firewall, SSH, patching, storage, monitoring, secret injection, OAuth callbacks, capacity, and cost approval are evidenced. | Infrastructure owner |
| Deploy authorization | Approved change record + `CONFIRM_DEPLOY=n8n pnpm run n8n:deploy` only in the named environment | All prior gates pass on release SHA; backup ID and rollback owner recorded; user explicitly authorizes deployment. | User/change approver |
| Post-deploy platform smoke | `pnpm run n8n:health`, Compose status, HTTPS and login checks | Health returns HTTP 2xx through intended path; containers healthy; TLS valid; no crash loop or severe log error; workflow inactive. | Operator |
| Controlled workflow proof | One-row verification checklist | Exactly one correct Gmail draft, zero sends, durable success state, duplicate replay creates zero additional drafts, invalid row creates zero drafts. | Business owner + operator |
| Production activation | Separate activation record | Queue reviewed, polling approved, alerts live, operator staffed, rollback tested, and explicit activation approval recorded. | Business owner/change approver |
| Handoff | Second-operator runbook exercise | Second operator can operate and recover without implementer assistance; owners and evidence links are complete. | Service owner |

## Workflow audit: findings and required changes

Source: `apps/n8n/DiasporaDNA.json`.

| Finding | Evidence | Risk | Required change / acceptance |
|---|---|---|---|
| Activation control is currently safe | Top-level `active` is `false`; Gmail node uses `resource: draft`. | Import behavior or a later manual activation can still begin one-minute polling. | Preserve inactive export/import. Separate deploy, configure, controlled proof, and steady-state activation approvals. Assert there is no Gmail send node. |
| Polling is aggressive and unapproved | Google Sheets Trigger uses `mode: everyMinute`, event `rowAdded`. | Quota/cost/noise and rapid processing of an accidentally populated queue. | Obtain business SLA, select interval, document quota, and stage an empty/controlled queue before activation. |
| Validation is presence-only | `If` requires `Name`, `Email`, and `Org` `notEmpty` with strict/case-sensitive settings. | Whitespace, malformed email, oversized data, and unsafe context can pass. | Trim/normalize, validate email and bounds, handle optional context, and write explicit rejected status/reason. |
| Invalid branch is dead | Only the true output of `If` is connected. | Invalid rows silently disappear with no remediation trail. | Connect false branch to status/error handling and an operator-visible metric/queue without excessive PII. |
| Terminal node has no useful effect | `If1` tests literal boolean `true`; it has no outgoing connection. | It provides neither verification nor status update and can mislead operators. | Remove it or replace it with a durable success update containing draft ID/timestamp/workflow version. |
| Credential bindings are instance-specific | JSON includes IDs/names for Google Sheets trigger OAuth, Google Gemini(PaLM) API, and Gmail OAuth; `meta.instanceId` and workflow IDs are also exported. | Import is not portable and can bind incorrectly or expose source-instance metadata. No secret values are visible, but references are environment-specific. | Sanitize portable export where supported; bind approved credentials after inactive import; document credential names, owners, scopes, and rotation. Never commit tokens/client secrets. |
| Sheet is environment-specific | A concrete document ID, tab GID, cached names, and URLs are embedded. | Wrong-environment processing and unnecessary repository exposure of operational metadata. | Configure the approved production sheet/tab after import or inject through a documented environment/config mechanism; use a dedicated test tab for proof. |
| Model validity is unproven | Model is `models/gemini-3.6-flash`; the repository has no compatibility test or provider evidence. | Activation can fail at generation time or unexpectedly change cost/behavior. | In the authorized environment, select a model listed by the credential/node in N8N `2.32.7`, execute a controlled compatibility test, then pin/document it. Until then this is a blocker, not a claim that the model is valid or invalid. |
| Duplicate prevention is absent | No lookup/claim/status/draft-ID node exists; only Trigger → If → Agent → Gmail → `If1`. | Trigger replay, retries, import/state loss, or manual execution can create duplicate drafts. | Add stable row key, explicit ready/processing/completed states, existing-draft guard, and replay test. Make retries idempotent. |
| Error handling is absent | No error trigger/workflow, provider error branch, bounded retry policy, or failure status is represented. | Rows can remain ambiguous; blind retries can duplicate drafts. | Add safe bounded retries, failure state, redacted alert, and documented manual replay after checking draft/status. |
| Output has placeholders | Subject is `[Replace with your Subject]`; prompt requires `[Your Name / Organization Name - replace before sending]`. | The controlled proof cannot meet “correct draft,” and an operator could send incomplete copy. | Use approved subject/signature configuration and a pre-Gmail assertion rejecting placeholders/empty output. |
| Prompt input is untrusted | `Name`, `Org`, and `Context` are interpolated directly into instructions. | Prompt injection, inappropriate content, data leakage, or excessive output. | Delimit data, state it is untrusted and must not override instructions, constrain content/length, and validate output. |
| PII goes to multiple processors | Name, organization, context, and email originate in Sheets; prompt sends name/org/context to Gemini; Gmail receives recipient/body; N8N stores execution data. | Privacy, consent, retention, access, and vendor-processing obligations are undefined. | Approve lawful purpose/notice, minimize fields (do not send email to Gemini unless needed), define N8N execution retention/redaction, restrict access, and document Google/Gemini data handling before real use. |
| Recipient mapping depends on upstream item linkage | Gmail uses `$('Google Sheets Trigger').item.json.Email`, while body uses agent output. | Graph edits or item fan-out could associate a body with the wrong source item. | Normalize and carry one immutable row envelope through the path; assert row key and recipient immediately before Gmail; fixture-test multiple rows even if steady-state processing is serialized. |
| No success evidence is persisted | Gmail result is not written back to Sheets or another durable ledger. | Operators cannot reconcile rows to drafts or safely determine whether replay is needed. | Persist non-secret Gmail draft ID, row key, timestamp, workflow version, and terminal status; provide reconciliation procedure. |
| Execution retention is unspecified | Workflow settings specify execution order/binary mode/MCP only. | PII may be retained too long or unavailable for incident review. | Set and document successful/failed execution retention and pruning at instance/workflow level according to approved policy. |

## Environment variables and credential inventory (names only)

No values belong in Git, tickets, screenshots, or this document.

### Existing application environment names

- `DATABASE_URL`
- `AUTH_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `NODE_ENV`

### Existing N8N operations/runtime environment names

- `N8N_POSTGRES_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_HOST`
- `N8N_PORT`
- `N8N_PROTOCOL`
- `N8N_SECURE_COOKIE`
- `N8N_URL`
- `N8N_HEALTH_PATH`
- `GENERIC_TIMEZONE`
- `TZ`
- `WEBHOOK_URL`
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS`
- `N8N_RUNNERS_ENABLED`
- `N8N_DIAGNOSTICS_ENABLED`
- `CONFIRM_DEPLOY` (one-invocation guard, not a stored secret)

### Production N8N names to evaluate/add during readiness

These are not currently wired by the inspected Compose file; exact inclusion must follow the selected proxy/topology and N8N `2.32.7` documentation.

- `N8N_EDITOR_BASE_URL`
- `N8N_PROXY_HOPS`
- `N8N_LOG_LEVEL`
- `EXECUTIONS_DATA_PRUNE`
- `EXECUTIONS_DATA_MAX_AGE`
- `N8N_METRICS`

### N8N credential objects (configure in N8N, never in workflow JSON as secrets)

Final names must include environment and owner to prevent accidental cross-binding, for example a naming convention rather than the source-instance names.

- Google Sheets Trigger OAuth2 credential
- Google Gemini API credential
- Gmail OAuth2 credential
- N8N owner/operator account and recovery/MFA material
- TLS/DNS automation credential if the selected reverse proxy requires one
- Backup destination credential if off-host backups require one

For each credential record owner, approved Google project/account, scopes, OAuth redirect URI, rotation/revocation steps, expiry behavior, and least-privilege justification. Google Sheets should access only the approved queue where feasible; Gmail must be draft-capable and must not be granted broader access without approval.

## DigitalOcean architecture and Nx runbook alignment

### Proposed thinnest topology (subject to user approval)

```text
Operator browser / Google OAuth callbacks
                  |
          DNS + HTTPS :443
                  |
      TLS reverse proxy on Droplet
                  |
          127.0.0.1:5678
                  |
                N8N 2.32.7
                  |
       private Compose PostgreSQL 17.6
                  |
      persistent storage + off-host backup
```

- Public ingress: `443` only for N8N; optionally `80` solely for redirect/certificate challenge. Restrict `22` to approved sources/access mechanism. Do not expose `5432` or `5678` publicly.
- Preserve the loopback binding in `apps/n8n/config/compose.yaml`; terminate TLS at a reviewed reverse proxy. Production needs a separate override/configuration, not edits that make local N8N public.
- Keep the N8N database dedicated; it is separate from the Prisma application database by current architecture.
- A single Droplet is the thinnest slice, not an availability guarantee. Region, Droplet size, volume/storage design, managed database alternative, and recovery targets remain user decisions.

### Alignment with existing Nx targets

| Existing target | Production runbook use | Required readiness work |
|---|---|---|
| `n8n:init` | Local-only bootstrap. | Do not generate production secrets casually on-host without approved escrow. Add a production secret-provisioning procedure that refuses overwrite and never prints values. |
| `n8n:validate` | Preflight Compose syntax/model without service changes. | Validate base plus production override, canonical URL/TLS/proxy variables, required secret names, image pins, and no public DB/N8N binding. Add workflow static validation separately. |
| `n8n:health` | Post-deploy and routine health check. | Point `N8N_URL` at the canonical HTTPS endpoint for external ingress checks and add an on-host container/readiness check. Do not equate `/healthz` alone with workflow/provider readiness. |
| `n8n:plan` | Human-readable no-change review. | Make environment-aware; print host/environment, versions, intended Compose files, backup age, ingress, workflow activation state, and rollback artifact. Redact values. |
| `n8n:deploy` | Guarded image pull and Compose reconciliation. | Preserve `CONFIRM_DEPLOY=n8n`; add environment/host confirmation, preflight backup requirement, immutable release reference, timeout, and post-deploy health. It deploys containers only, not workflow activation. |
| `n8n:stop` | Incident containment without deleting volumes. | Document when stop versus workflow deactivation is appropriate and expected outage. Preserve data. |
| `n8n:logs` | Live troubleshooting. | Add bounded/non-following retrieval for automation, redaction guidance, retention, and execution-ID correlation. Current target follows indefinitely. |

Required new operational capabilities, preferably exposed through Nx to keep one interface: `n8n:workflow-validate`, `n8n:workflow-import-inactive`, `n8n:backup`, `n8n:backup-verify`, `n8n:restore-plan`, and `n8n:rollback-plan`. Import and activation must remain separate; no generic target should silently activate a workflow.

### Required runbooks

1. Provision/harden Droplet and operator access.
2. Configure DNS, TLS, firewall, reverse proxy, and canonical N8N/OAuth URLs.
3. Provision/rotate/revoke secrets and Google credentials without exposing values.
4. Validate/plan/deploy/health using Nx from a pinned release SHA.
5. Import/update workflow inactive, bind environment resources, and diff workflow versions.
6. Controlled one-row verification and evidence capture.
7. Intentional activation/deactivation and queue pause.
8. Routine health, logs, failed-execution triage, duplicate reconciliation, and provider quota handling.
9. Backup, checksum, retention, isolated restore, and disaster recovery.
10. Container/workflow rollback and incident communications.

## Backup and rollback

### Backup requirements

- Back up PostgreSQL logically with a consistent `pg_dump`-based procedure and protect any physical/snapshot backup used for faster recovery.
- Back up the `n8n_data` volume as required by the existing README, plus the portable workflow export and deployment configuration. Do not rely only on a Droplet snapshot.
- Escrow `N8N_ENCRYPTION_KEY` separately with recovery-only access; test that restored credentials decrypt. A database backup without the matching key is not a successful recovery artifact.
- Encrypt backups in transit/at rest, store them off-host, checksum them, define retention, and alert on age/failure.
- Test restore into an isolated environment on a schedule and before upgrades. Record duration, data timestamp, workflow inactive state, login, credential decryption, and health.
- The owner must approve RPO/RTO and retention; until then backup readiness is blocked.

### Rollback order

1. **Contain:** Deactivate `DiasporaDNA` and pause/mark the source queue. If control-plane access is unavailable, use `pnpm run n8n:stop`; do not delete volumes.
2. **Reconcile side effects:** Search by durable row key/draft ID, remove any duplicate controlled drafts if authorized, and record what happened. Rollback cannot “unsend” email, which is why this slice drafts only.
3. **Workflow rollback:** Import the last approved portable JSON as inactive, bind credentials/resources, validate, then perform a controlled proof before any reactivation.
4. **Service rollback:** Revert Compose/reverse-proxy configuration and pinned N8N image to the last approved release. Because N8N startup may migrate its database, never assume an image downgrade is schema-compatible.
5. **Data rollback when required:** Restore PostgreSQL and N8N data from the matched pre-change backup with the matching encryption key. Restore first in isolation where time permits, then verify health/credentials/workflow inactive before cutover.
6. **Close:** Confirm queue state, draft reconciliation, monitoring, root cause, and owner approval before activation.

A rollback rehearsal passes only when a second operator can execute it within the approved RTO and demonstrate that no workflow becomes active implicitly.

## Risks

| Risk | Severity | Mitigation / owner needed |
|---|---|---|
| Baseline migration requires release review | High | Review generated SQL and retain the passing blank-database migration gate; engineering/DB owner. |
| Authenticated write-path integration coverage is still limited | High | Extend the implemented Vitest/Playwright framework before expanding production write workflows; engineering. |
| Workflow can duplicate Gmail drafts | Release blocker | Durable claim/idempotency/status plus replay test; workflow owner. |
| Model name/compatibility unverified | Release blocker | Validate model through authorized target credential after approval; workflow owner. |
| Outreach subject/signature need business approval | High | Static placeholder checks are implemented; business owner must approve final copy before controlled proof. |
| Production Sheet/model/credential binding is pending | High | Portable environment bindings exist; operator must configure approved values after inactive import. |
| PII in provider prompts, N8N executions, and logs | High | Data minimization, approval, retention/redaction, access controls; privacy/business owner. |
| Current mail stub logs full email content | High in shared environments | Replace with redacted fake transport/logging before production; application owner. |
| Local uploads are not durable across redeploy/host loss | High if uploads are in production scope | Select object/durable storage or explicitly defer/disable uploads; product/infrastructure owner. |
| Single-Droplet topology is a single point of failure | Medium/high based on SLA | Accept explicitly with tested restore or fund HA/managed services; service owner. |
| DigitalOcean workflow is unproven against the target host | High | Execute plan, protected deployment, backup, HTTPS, and rollback rehearsal after infrastructure inputs are approved; operations. |
| GitHub environment protection is not yet configured | High | Create `n8n-production`, require reviewers, and add names-only deployment secrets before any deploy; release owner. |
| N8N/provider upgrades or retries change behavior | High | Pin versions/model, test fixtures, back up first, bounded idempotent retries; engineering/operations. |
| Google OAuth scope/account ownership unclear | High | Named organizational owners, least privilege, callback verification, revocation runbook; business/security. |
| One-minute polling may exceed need/quota | Medium | Approve interval and monitor execution/provider quotas; business owner. |

## Blockers and questions requiring user input

No deployment or real-provider verification should be scheduled until these are answered.

1. **Release scope:** Is the Next.js application itself being deployed to DigitalOcean now, or is DigitalOcean limited to N8N? What environment names exist (development/staging/production)?
2. **DigitalOcean ownership:** Which DigitalOcean account/project, region, billing owner, and infrastructure administrator are approved? Is a Droplet already provisioned, and if so what non-secret inventory/access facts may be documented?
3. **Capacity/SLA:** Expected rows/day, concurrency, uptime target, maintenance window, budget, RPO, RTO, and backup retention?
4. **Topology decision:** Approve single-Droplet Compose PostgreSQL for the initial slice, or require DigitalOcean Managed PostgreSQL/HA? If single-host, is the availability tradeoff accepted?
5. **Domain/DNS/TLS:** What exact N8N hostname is approved, who controls DNS, and which TLS/reverse-proxy standard should be used? These determine Google OAuth callback URLs.
6. **Access/security:** Approved SSH/access method and source ranges, operator list, N8N owner/MFA policy, secret manager/escrow, alert channel, and on-call owner?
7. **Google ownership:** Which organizational Google Cloud project, Sheet, tab, Gmail drafting account, and Gemini billing/quota owner are approved? Who can create/approve OAuth consent and credentials?
8. **Credential scopes:** What least-privilege Sheets and Gmail scopes are approved? Is the Gmail account permitted to draft for the intended contacts, and who reviews drafts before sending?
9. **Controlled proof data:** Which organization-owned recipient address and synthetic/consented `Name`, `Org`, and `Context` should be used? A real partner row must not be used without approval.
10. **Queue contract:** Approve exact columns/status values, stable row key, ready/processing/completed/error semantics, duplicate policy, and who may enqueue rows.
11. **Polling/business copy:** Required processing latency, approved subject convention, organization signature, sender identity, tone/content rules, and final human-review process?
12. **AI/privacy:** Is sending name, organization, and context to Gemini approved? What data is prohibited, what notice/consent applies, and what N8N execution retention is required?
13. **Model/cost:** Which Gemini model is approved once target availability is verified, and what spend/quota alert thresholds apply?
14. **Application production blockers:** Are file uploads part of the initial production scope? What is the approved durable storage? Is Resend in production scope, and what from-address/domain is verified?
15. **Migration baseline:** Does an existing application PostgreSQL database contain data that must be baselined, or may the first environment be created from a new initial migration?
16. **Activation authority:** Name the business approver and technical operator who must separately authorize deployment, controlled verification, and steady-state activation.

## Definition of done

Delivery is done only when all of the following are true:

- The exact release SHA installs reproducibly and passes migration, Prisma, lint, audit policy, production build, unit/integration, browser E2E, N8N Compose, and workflow fixture gates in required CI.
- Reviewable Prisma migrations can build a blank database and have an approved production migration/rollback plan.
- `DiasporaDNA` is portable, inactive by default, model-validated, input/output constrained, idempotent, observable, privacy-approved, and draft-only.
- DigitalOcean DNS/TLS/firewall/secrets/storage/monitoring are evidenced; fresh backups restore successfully with decryptable N8N credentials within approved RPO/RTO.
- An explicitly authorized controlled row creates exactly one correct Gmail draft, sends zero emails, records durable success, and creates no duplicate on replay; an invalid row creates no draft and records a reason.
- Steady-state activation is a separate recorded decision, not a side effect of deployment or import.
- A second operator successfully executes the operating and rollback runbooks, and service/business/security/backup owners accept the handoff.

Until every applicable item above has evidence and approval, the outcome is **no-go**, even if the code compiles or the N8N health endpoint returns 200.
