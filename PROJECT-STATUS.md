# Philly Fests — Project Status

**Last updated:** 2026-08-05
**Release branch:** `main` at `f065a13`
**Working tree:** clean; all feature branches merged and deleted
**Status:** All scoped feature work (F-01 – F-09) plus the festival data importer is complete, tested, and merged. The application is **not yet released to production** — remaining work is external activation, legal copy, and operational sign-off, not feature development.

---

## 1. How to read this document

| Section | Answers |
|---|---|
| 2. Delivered scope | What was built and where it landed |
| 3. Validation evidence | What was proven, and how |
| 4. Outstanding work | What blocks production launch |
| 5. Owner actions | What only the client/owners can do |
| 6. Known limitations | What the client should not be surprised by |
| 7. Operating the system | Commands and runbooks |
| 8. Key decisions | Why the system works the way it does |

---

## 2. Delivered scope

Every feature in `docs/Features.md` is implemented and merged to `main`. Each merged via a short-lived branch that passed full gates on the exact merge commit; each branch was deleted after merge.

| ID | Feature | Merge commit |
|---|---|---|
| F-01 | Responsive festival discovery | `079e043` |
| F-02 | Festival detail pages | `77d0e1a` |
| F-03 | Accountless schedule builder | `49b9348` |
| F-04 | Email schedule (transactional) | `2fd7748` |
| F-05 | Organizer mailing consent + N8N | `a7a8b18` |
| F-06 | Calendar (.ics) export | `f917244` |
| F-07 | Authenticated producer submission | `baaf517` |
| F-08 | Editorial review and publication | `a444553` |
| F-09 | Moderated social-media grid | `0ddb590` |
| — | Audited festival CSV importer | `a8b6369` |
| — | Release hardening + client user guide | `f065a13` |

### Notable architectural properties

- **Editorial integrity is enforced in PostgreSQL, not just application code.** Festival state changes require a matching immutable transition and revision snapshot in the same transaction; publication requires exactly one valid primary occurrence; approval does **not** publish.
- **Social posts are first-party cached text cards.** No provider scripts, iframes, or embeds. Only locally approved posts render; hidden/rejected are excluded by the database query.
- **The importer is insert-only and never auto-publishes.** Deterministic IDs, immutable lineage, fenced apply leases, signed production review, and idempotent replay.
- **Time is `America/New_York` throughout.** All-day ICS end dates are exclusive.

---

## 3. Validation evidence (on merge commit `f065a13`)

| Gate | Result |
|---|---|
| Unit / contract tests | **292 passed** (39 files) |
| N8N workflow tests | **15 passed**, no external calls |
| N8N workflow validation | Both workflows inactive and credential-free |
| End-to-end (Chromium, Firefox, mobile Chromium) | **134 passed, 1 skipped** (skip is a desktop-only calendar widget on mobile) |
| PostgreSQL 17 migrations | **11 migrations** applied from blank schema + representative upgrade |
| Importer integration | Concurrent prepare converged; injected mid-batch failure resumed; replay wrote zero rows; lineage/reports stayed redacted |
| Seed idempotency | Two runs, stable counts |
| Production build | Succeeds |
| Lint | **0 errors, 0 warnings** (previously 4 warnings) |
| Dependency audit | No known vulnerabilities |

Tests never contact Resend, Google Drive, Curator.io/Flockler, organizer ESPs, Gemini, or production N8N. Provider adapters fail closed under test even if credentials exist in the environment.

### Database migrations on `main`

```
20260804000000_baseline
20260804010000_default_user_role_public
20260804020000_schedule_email_requests
20260804030000_organizer_mailing_consent
20260804040000_calendar_export_semantics
20260804050000_producer_submission_workflow
20260804060000_editorial_workflow
20260804070000_moderated_social_feed
20260805000000_festival_data_import
20260805010000_user_management_audit
20260805020000_schedule_email_retry
```

---

## 4. Outstanding work before production launch

### 4.1 Engineering — blocking

| # | Item | Why it matters |
|---|---|---|
| E-1 | **Safari/WebKit verification** | WebKit and the mobile projects were removed from the matrix on 2026-08-12: the host lacks `libevent-2.1-7t64` and `libavif16`, the CI runner installed only Chromium, and the WebKit/mobile projects therefore never launched — they reported `Executable doesn't exist`, not coverage. **This release is not Safari-verified, and nothing in CI checks Safari.** Restoring it means installing the host packages and adding the project back to both `playwright.config.js` and the `playwright install` list. |
| E-2 | ~~**Run the full browser matrix in CI**~~ | Resolved for the agreed matrix. `.github/workflows/ci-cd.yml` installs Chromium and Firefox and runs without `E2E_BROWSERS`, so both gate merges (116 tests). The matrix is deliberately two browsers, not five. |
| E-3 | **Production environment provisioning** | Hosting, DNS/TLS, secret manager, database, backup destination, and approved RPO/RTO are not yet configured. The deploy workflow is intentionally manual and environment-gated until they are. |

### 4.2 Engineering — recommended before launch

| # | Item |
|---|---|
| E-4 | Automated accessibility scanning (e.g. `@axe-core/playwright`) across discovery, detail, calendar, producer, editorial, and moderation screens. Targeted a11y tests exist; a full audit does not. |
| E-5 | Centralized structured/redacted logging, request correlation, metrics export, and health/readiness endpoints with alert thresholds. |
| E-6 | Performance budgets (Core Web Vitals, response times, bundle/image sizes) enforced in CI. Discovery is now database-paginated, but no budgets are asserted. |
| E-7 | Retention/deletion jobs for schedule email requests, consent + IP evidence, notification records, social cache, and import evidence. Periods are documented but not yet executed by a job. |
| E-8 | Retire stale remote branches `origin/dev`, `origin/dev-b/api`, `origin/develop`, per `docs/DELIVERY-WORKFLOW.md`. |

### 4.3 External activation — all currently fail-closed

None of these are live. Each is implemented, tested against fixtures, and **disabled pending approval**.

| Integration | Blocked on | Runbook |
|---|---|---|
| Resend transactional email | API key, verified sender/domain, quotas, controlled delivery proof | `docs/SCHEDULE-CALENDAR-EMAIL.md` |
| N8N organizer mailing lists | Organizer authorizations, ESP/list config, N8N deployment + TLS/secrets, backup/restore proof, named operator | `docs/PRODUCT-DECISIONS.md` |
| Curator.io / Flockler social sync | Purchased plan, eligible accounts, endpoint proof, privacy review, moderation staffing | `docs/SOCIAL-FEED-OPERATIONS.md` |
| Google Drive producer uploads | Private Drive, service identity, folder permission audit, operational scanner, canonical origin, distributed rate limiting | `docs/PRODUCER-SUBMISSION-OPERATIONS.md` |
| Production CSV import | Restricted source transfer, quarantine review, backup/restore proof, distinct operator + reviewer, signed approval, maintenance window | `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md` |

---

## 5. Owner actions required

These cannot be completed by engineering alone.

1. **Approve a Git history purge of the organizer contact CSV.**
   `docs/Festivals_Postgres_Export.csv` is no longer tracked and is git-ignored, but it exists in earlier commits. A full purge requires a history rewrite (invalidates all clones/forks) plus an access review. **Deliberately not done automatically.** Until then, treat repository access as access to organizer contact details.
2. **Approve legal copy.** `/privacy` and `/terms` are live but labeled *"Draft policy — pending legal approval."* Retention periods, service-provider disclosures, privacy-request procedures, liability, IP, disputes, and governing law are unresolved. Organizer-consent wording needs the same sign-off.
3. **Review quarantined import rows.** The reviewed source classifies **434 rows → 102 ready / 332 quarantined / 0 duplicates**. Quarantines are intentional (ambiguous dates, unmapped categories, conflicting duplicates) and require data-owner decisions. Nothing ambiguous is ever guessed.
4. **Approve the festival category map.** Only six seeded categories are mapped; all other source types quarantine by design rather than being guessed. Expanding the map is a product decision.
5. **Confirm owner assignments and replace personal addresses.** All assignments use `pratt.edu` addresses from `docs/Client-Hand-Off.md`. Organization-owned role aliases are needed for long-term support and recovery.
6. **Name technical operators** for database, deployment, N8N, Drive, and security operations, plus a backup/restore owner.
7. **Sign off measurable targets:** WCAG 2.2 AA, Core Web Vitals, availability/RPO/RTO, browser matrix, analytics, provider quotas and cost thresholds.

### Owner assignments (proposed, from `docs/PRODUCT-DECISIONS.md`)

| Domain | Primary | Backup |
|---|---|---|
| Product & visual acceptance | Simran Kaur — `skaur@pratt.edu` | Mengqi Cao — `mcao13@pratt.edu` |
| Producer / editorial workflow | Uraiba Zafar — `uzafar@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |
| Consent, privacy, communications | Mengqi Cao — `mcao13@pratt.edu` | Simran Kaur — `skaur@pratt.edu` |
| Social moderation | Iris Sun — `wsun16@pratt.edu` | Uraiba Zafar — `uzafar@pratt.edu` |
| Release acceptance & incidents | Simran Kaur — `skaur@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |

---

## 6. Known limitations

1. **Not Safari-verified** in this environment (see E-1).
2. **Privacy/terms copy is draft.**
3. **Imported festivals land as private drafts with no owner** and require full editorial review.
4. **No festival content editor in the admin UI.** Editors change state, review assets, and configure feeds; they cannot edit festival fields there.
5. **The Map view on the home page is not implemented** and is shown as unavailable.
6. **Schedules are browser-local by design** — no cross-device sync; clearing browser data removes them.
7. **Calendar exports are snapshots** and do not update when festival details change.
8. **The organizer-consent management token is shown once**; losing it removes self-service revocation.
9. **Producer uploads and production mutations fail closed** without verified edge rate limiting and a canonical site URL.
10. **The organizer CSV remains in Git history** until the approved purge (see Owner action 1).

---

## 7. Operating the system

### Everyday commands

```sh
pnpm install --frozen-lockfile
pnpm run dev                 # local development
pnpm run test                # unit + contract tests
pnpm run test:coverage       # with coverage
pnpm run lint
pnpm run build
pnpm run e2e                 # Chromium + Firefox
E2E_BROWSERS=chromium pnpm run e2e                           # narrowed run
pnpm run n8n:test && pnpm run n8n:validate
```

### Database and importer (disposable PostgreSQL only)

```sh
docker run --rm --name spf-pg \
  -e POSTGRES_USER=tester -e POSTGRES_PASSWORD=tester \
  -e POSTGRES_DB=save_philly_festivals_test \
  -p 55432:5432 -d postgres:17-alpine

DATABASE_URL=postgresql://tester:tester@127.0.0.1:55432/save_philly_festivals_test pnpm run migrate:test
DATABASE_URL=postgresql://tester:tester@127.0.0.1:55432/save_philly_festivals_test pnpm run festival:import:test
```

> **Never** point `migrate:test` or the importer test at a shared or production database. A safety guard rejects non-loopback hosts and database names without `test`/`ci`.

### Reviewed importer inputs

| Input | SHA-256 |
|---|---|
| Festival source CSV (restricted, not in Git) | `9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757` |
| `tools/data/festival-category-map.json` | `f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f` |

### Documentation index

| Document | Purpose |
|---|---|
| `docs/Client-UserGuide.md` | **Primary client handoff guide** — visitor, producer, editor/admin workflows |
| `docs/Features.md` | Requirements and acceptance criteria |
| `docs/PRODUCT-DECISIONS.md` | Decisions, rationale, owner assignments |
| `docs/DELIVERY-WORKFLOW.md` | Branching, merge gates, review policy |
| `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md` | Importer operation, safety, recovery |
| `docs/FESTIVAL-DATA-MIGRATION.md` | Import plan and source profile |
| `docs/SOCIAL-FEED-OPERATIONS.md` | Provider choice, moderation SLA, retention |
| `docs/PRODUCER-SUBMISSION-OPERATIONS.md` | Producer/Drive operations |
| `docs/SCHEDULE-CALENDAR-EMAIL.md` | Schedule, calendar, and email behavior |

---

## 8. Key decisions

1. **Extended the existing Next.js + Prisma/PostgreSQL app** rather than migrating to WordPress/Webflow from the handoff. The handoff's CMS suggestions were implementation recommendations, not requirements.
2. **`America/New_York` is authoritative**; all-day ICS end dates are exclusive; automatic alarms omitted from MVP.
3. **Approval and publication are separate states.** Approved records remain private.
4. **Social aggregation ingests server-side into a moderated cache** instead of embedding vendor widgets — protects privacy, availability, accessibility, and CSP.
5. **Recovery is archive/forward-only.** Editorial and import history is append-only and immutable; there is no destructive rollback command.
6. **Imported records are never auto-published**, and ambiguous data is quarantined rather than guessed.
7. **Accounts are deactivated, not deleted**, with immutable audit and super-admin-only privileged management.
8. **Nothing merges to `main` without full gates on the exact merge commit**, and feature branches are deleted after merge.

---

## 9. Suggested next steps

1. Decide whether Safari coverage is required before launch; if so, install the WebKit host packages and add the project back to both `playwright.config.js` and the CI `playwright install` list (E-1).
2. Schedule the CSV history purge and access review (Owner action 1).
3. Route legal copy for `/privacy`, `/terms`, and consent wording to approval (Owner action 2).
4. Begin quarantine review with the data owner (Owner action 3).
5. Provision the production environment, then run one controlled activation at a time, each with its runbook and named operator.
