# Festival CSV to PostgreSQL Migration Plan

**Source:** `docs/Festivals_Postgres_Export.csv`
**Target:** Application PostgreSQL database managed through Prisma migrations
**Status:** Transactional importer implemented; no production database import has been executed
**Authoritative time zone:** `America/New_York`

## 1. Objective

Import the client-provided festival inventory into PostgreSQL through a repeatable, reviewable, idempotent process without automatically publishing incomplete or ambiguous records. Preserve source lineage, quarantine rows that require editorial decisions, protect contact information, and produce reconciliation evidence before activation.

The import is a data operation, not a Prisma schema migration. Prisma migrations establish any required import/occurrence tables first; a versioned application script performs the actual import in an explicit environment.

## 2. Initial source profile

A read-only structural profile on 2026-08-04 found:

| Measure | Result |
|---|---:|
| CSV records | 434 |
| Blank festival names | 0 |
| Standard `M/D/YYYY` start dates | 408 |
| Nonstandard or recurring start-date values | 18 |
| Blank start dates | 8 |
| Duplicate normalized name/start rows beyond the first | 2 |
| Blank locations | 111 |
| Blank types | 168 |
| Blank websites | 155 |
| Blank contact emails | 167 |
| Structurally over-wide rows | 0 |

Examples requiring manual resolution include a two-digit year, comma-separated dates, an impossible date (`6/37`), recurring phrases such as “Every Thursday,” and at least one row where a location appears in the start-date column. These values must not be guessed into production dates.

The profile is evidence about the current file, not a permanent contract. The import command must reproduce and record the profile from the exact file checksum used for a migration.

## 3. Safety principles

1. Never use `prisma db push`, ad hoc SQL against production, or direct CSV `COPY` into `Festival`.
2. Never auto-publish imported rows. New target records start with legacy `status = 'draft'` and workflow `draft` or `pending_review` after F-07/F-08 state integration is complete.
3. Never infer ambiguous dates, recurrence, email ownership, categories, or consent.
4. Keep source contact email and phone private; they are producer/editorial data and must not enter public DTOs, calendar organizer fields, logs, or analytics.
5. Treat `Email sent?` as source operational history only. It does not establish marketing consent, delivery evidence, or application notification state.
6. Make every import replay-safe and attributable to an immutable source checksum, category-map checksum, prepared row/count digest, row number, and normalized row hash.
7. Run the same transformation in dry-run mode before any write. The confirmed source-only result is `434 total / 102 ready / 0 duplicate / 332 quarantined`; database target matches can only add quarantines.
8. Import into a disposable migrated PostgreSQL database before a controlled target environment.
9. Back up the target database and record the backup identifier before a production import.
10. Require editorial reconciliation and owner sign-off before any imported record can become public.

## 4. Recommended target model

### Existing application fields

Map source data only into compatible server-owned fields:

| CSV column | Target | Rule |
|---|---|---|
| `Festival Name` | `Festival.name` | Trim Unicode whitespace; required. |
| `Start Date` | calendar fields | Parse only approved formats; import date-only values without UTC conversion. |
| `End Date` | calendar fields | Inclusive source end; must be on/after start. Blank end defaults to start only when the start is an unambiguous single date. |
| `2027 Dates (if applicable)` | import staging / future occurrence | Preserve raw value; do not overwrite the primary occurrence. |
| `Location` | `Festival.location` | Trim; do not attempt geocoding during migration. |
| `Type` | `Category` + `FestivalCategory` | Map through an reviewed alias table; unknown values remain quarantined/unmapped. |
| `Website` | `Festival.website_url` | Allow only valid `http`/`https`; reject credentials and unsafe protocols. Social-post URLs remain official source links only after review. |
| `Organiser/Contact ` | `Festival.contact_name` | Private editorial field; trim but retain original spelling. |
| `Contact email ` | `Festival.contact_email` | Normalize a single valid address. Rows containing multiple addresses or prose require review. |
| `Contact Phone` | `Festival.contact_phone` | Preserve as private display text initially; normalize only after country/extension review. |
| `Email sent?` | import lineage metadata | Preserve source value in staging; do not map to consent or delivery tables. |

Imported records must not set `owner_user_id` unless an authenticated user has been explicitly matched and approved. They must not create consent, organizer-integration, notification, schedule-email, or N8N outbox records.

### Import lineage tables

Before executing the import, add a reviewed Prisma migration for durable lineage such as:

- `FestivalImportBatch`
  - source filename
  - SHA-256 checksum
  - importer version/commit SHA
  - dry-run profile JSON
  - status: `prepared`, `running`, `completed`, `failed`, `rolled_back`
  - operator, started/completed timestamps
  - aggregate inserted/updated/skipped/quarantined/error counts
- `FestivalImportRow`
  - batch ID and source row number
  - normalized row hash
  - restricted raw/normalized payload or a redacted payload plus encrypted/restricted contact fields
  - disposition: `ready`, `imported`, `duplicate`, `quarantined`, `failed`
  - validation codes/messages
  - target festival ID when imported
  - timestamps

Use `@@unique([batch_id, source_row_number])`. Make batch checksum replay behavior explicit: the same completed checksum is a no-op unless an operator supplies an audited override.

Raw-row retention contains personal contact data and requires privacy-owner approval. If durable raw storage is not approved, retain the immutable source file in restricted storage, store only checksum/redacted normalized data in PostgreSQL, and define a deletion date.

### Repeated and future dates

The current `Festival` model represents one primary date interval. Do not flatten recurring phrases or the 2027 column into one misleading interval.

Recommended follow-up before importing recurrences:

- Add a `FestivalOccurrence` model linked to one canonical festival, with timed/all-day calendar semantics, source text, status, and sequence metadata; or
- Create separately reviewed annual festival records with deterministic lineage if the product intentionally treats each year as a separate listing.

Until that decision is implemented, import only an unambiguous primary occurrence and retain future/recurring text in staging. Quarantine rows whose primary start value is recurring or misplaced.

## 5. Transformation rules

### Text

- Decode as UTF-8 with optional BOM.
- Normalize line endings, collapse quoted internal line breaks to spaces, and trim leading/trailing Unicode whitespace.
- Preserve apostrophes, accents, ampersands, and non-ASCII names.
- Reject embedded NUL/control characters.
- Enforce application field-length limits before writes.
- Store text as plain data; never render it as trusted HTML.

### Slugs and identity

- Generate slugs server-side from the normalized festival name.
- Resolve collisions deterministically with a short normalized-row hash, never `Date.now()`.
- Use source batch/row lineage for import identity; do not use name alone as a database identity.
- Flag likely duplicates using normalized name, primary start date, normalized location, and website host.
- Never merge duplicate candidates automatically when contact/location/date data differ.

### Dates and Philadelphia time

- Parse unambiguous `M/D/YYYY` values as date-only Philadelphia calendar dates.
- Support `M/D/YY` only through an explicit reviewed year rule; record that normalization in row evidence.
- Never pass date-only values through browser-local `Date` parsing.
- Store date-only values in `all_day_start`/`all_day_end` with `calendar_date_type = all_day` and `time_zone = America/New_York`.
- Source end dates are inclusive.
- Reject impossible dates, end-before-start, mixed prose/date values, and values shifted into the wrong column.
- Do not infer event times because the source has no authoritative times.

### Categories

Create a reviewed mapping file, for example `tools/data/festival-category-map.json`, containing source aliases and canonical category slugs. Normalize capitalization and harmless whitespace only. Produce an unmapped-type report; do not create uncontrolled categories from misspellings during the import.

### URLs, email, and phone

- URL: permit only valid `http`/`https`, with no embedded username/password.
- Email: lowercase one syntactically valid mailbox. Quarantine multiple addresses, prose such as “contact form,” or social-DM instructions into an editorial contact note rather than `contact_email`.
- Phone: preserve source string privately; a later normalization pass may generate E.164 after region and extension rules are approved.

## 6. Import implementation

The versioned implementation is application code, not a route:

- `apps/save-philly-festivals/src/features/festival-import/` — parser, normalizer, profile, repository, transactional service, and redacted report contracts;
- `apps/save-philly-festivals/scripts/festival-import.mjs` — `dry-run`, `prepare`, `apply`, and `report` modes;
- `apps/save-philly-festivals/scripts/festival-import-test.mjs` — disposable PostgreSQL rehearsal;
- `tools/data/festival-category-map.json` — reviewed byte-exact category aliases;
- unit fixtures under `apps/save-philly-festivals/tests/fixtures/festival-import/`.

Use the exact commands and current checksums in `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md`. Every file-bearing command requires explicit expected source and category-map SHA-256 values.

The apply target must require:

- an approved local/staging/production environment classification;
- exact expected file checksum;
- pre-created prepared batch ID;
- a detached Ed25519 post-prepare approval whose verified signature derives the distinct reviewer identity and binds source/map/prepared evidence plus complete backup provider/artifact/version and restore-test evidence;
- explicit confirmation token for production;
- a local/test database guard for automated tests;
- one atomic transaction per target row, an expiring fenced attempt token/heartbeat on every row and terminal transition, durable failed-batch counts, and explicit evidence-revalidating `--resume` recovery of failed or expired-running attempts;
- no external email, Drive, N8N, geocoding, social, or other provider calls.

Use Prisma transactions and parameterized queries only. Do not construct SQL from CSV values.

## 7. Phased execution

### Phase A — Profile and decisions

1. Freeze a copy of the source and record SHA-256, byte count, row count, encoding, header names, and importer commit SHA.
2. Produce reports for malformed dates, recurring dates, duplicate candidates, unmapped categories, invalid URLs/emails, blank critical fields, and column-shift candidates.
3. Have the data owner decide each quarantined row or approve a documented default.
4. Approve raw contact-data retention and access rules.
5. Decide the 2027/recurrence target model.

### Phase B — Build and test importer

1. Add lineage schema through a forward Prisma migration.
2. Implement pure parsing/normalization functions with fixture tests.
3. Implement dry-run output with no writes.
4. Implement atomic insert-or-fetch prepare, idempotent row writes, deterministic slug collision handling, and explicit failed-batch resume.
5. Add PostgreSQL integration tests for constraints, concurrent prepare, injected mid-batch failure/resume, replay, duplicates, and quarantine.
6. Assert public festival APIs cannot expose imported drafts or private contact/import metadata.

### Phase C — Rehearse

1. Apply all application migrations to disposable PostgreSQL.
2. Run dry-run and review every count.
3. Apply the import to disposable PostgreSQL.
4. Re-run the same batch and prove zero additional festival/category/link rows.
5. Compare source, staging, and target counts by disposition.
6. Manually inspect a stratified sample: single-day, multi-day, missing optional fields, Unicode, duplicate candidate, invalid URL/email, nonstandard date, and recurring date.
7. Run unit, integration, build, desktop/mobile E2E, and public/private data-leak tests.

### Phase D — Controlled target import

1. Freeze application writes or use a maintenance window if concurrent editorial changes can collide.
2. Take and verify a database backup; record backup ID and restore command.
3. Confirm the exact release SHA, importer version, source checksum, category map checksum, operator, and prepared batch digest.
4. Execute dry-run against the target and compare it with rehearsal evidence.
5. Have a distinct reviewer sign the canonical immutable Ed25519 approval for the prepared batch plus backup and restore-test evidence; verify it against the configured public key.
6. Apply the approved batch; if it fails after durable row commits, investigate and explicitly resume with the exact inputs.
7. Run reconciliation queries and application smoke tests.
8. Keep imported rows private pending editorial review.
9. Record completion evidence and assign quarantined rows to an owner.

## 8. Validation and acceptance criteria

The migration is accepted only when:

- All 434 source rows have exactly one recorded disposition.
- Imported + duplicate + quarantined + failed counts equal the source row count.
- No failed row lacks an actionable error code.
- Replaying the same completed batch inserts zero additional target rows.
- Every imported festival has batch/row lineage.
- No ambiguous/nonstandard date is silently converted.
- No imported record is publicly discoverable before editorial publication.
- No private contact, raw import payload, Drive identifier, or import error appears in public API responses, pages, calendar exports, logs, or analytics.
- Category mapping has zero unexplained aliases; unmapped values remain explicit.
- Source and target sample checks receive data-owner sign-off.
- Blank-database migrations, representative upgrade, importer unit/integration tests, production build, and desktop/mobile E2E all pass on the exact revision.
- A second operator can execute dry-run, apply, reconciliation, and rollback/forward-recovery instructions.

## 9. Reconciliation queries and reports

The implementation should generate, without exposing contact values in routine logs:

- batch summary by disposition and validation code;
- source row count versus lineage row count;
- target festivals by import batch;
- duplicate source-key and target-link checks;
- rows without target lineage;
- imported records unexpectedly public;
- invalid or missing calendar intervals;
- unmapped category/type values;
- quarantined-row review CSV with sensitive columns restricted to authorized editors.

Do not print full raw rows, contact emails, phones, or URLs containing query tokens to CI logs.

## 10. Archive and forward recovery

The importer intentionally provides no delete or rollback command. A failed technical run or expired `running` lease is resumable only with explicit `--resume` after exact input/operator/signed-review revalidation. Apply attempts are token-fenced so stale processes cannot write after recovery; a wrong completed batch uses archive-and-forward recovery that preserves lineage and workflow audit history:

1. Stop editorial processing for the affected batch.
2. Transition affected festivals to `archived` through the normal audited workflow so they remain private.
3. Retain the batch, row lineage, transitions, revisions, occurrences, and category evidence.
4. Correct data through a reviewed forward repair and explicitly reconcile dependent records.
5. Verify public exclusion and preserve the recovery report.

Do not delete imported records even before editorial edits: references and audit evidence may already exist. A verified full-database restore is the emergency option for broad corruption only when the approved recovery point meets the data-loss window. Practice restore in isolation before production execution. See `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md`.

## 11. Ownership and approvals

Using the client contacts from `docs/Client-Hand-Off.md`:

- Workflow/data review: Uraiba Zafar (`uzafar@pratt.edu`), backup Iris Sun (`wsun16@pratt.edu`).
- Product/visual acceptance: Simran Kaur (`skaur@pratt.edu`), backup Mengqi Cao (`mcao13@pratt.edu`).
- Privacy/contact-data review: Mengqi Cao (`mcao13@pratt.edu`), backup Simran Kaur (`skaur@pratt.edu`).
- Release acceptance: Simran Kaur, backup Iris Sun.

Before execution, also assign an organization-controlled database operator and backup/restore owner. Personal university addresses should not be the sole long-term operational dependency.

## 12. Relationship to feature delivery

- F-07 establishes authenticated producer ownership and private draft data.
- F-08 establishes the editorial review/publication state machine required before imported records can be approved or published safely.
- The importer may be developed and rehearsed earlier, but production application should occur only after F-08 resolves workflow/public-visibility compatibility and the lineage/occurrence model is approved.
- `docs/Client-UserGuide.md` should document imported-record review and reconciliation only after the final workflow is implemented and accepted.
