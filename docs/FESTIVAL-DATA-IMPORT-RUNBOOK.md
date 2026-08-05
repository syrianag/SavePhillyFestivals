# Festival CSV Import Runbook

This runbook operates the resumable, insert-only festival importer. Each target row is atomic; a failed batch records durable progress and can resume only after exact evidence is revalidated. It never publishes records and never calls notification, consent, schedule-email, integration, asset, geocoding, social, N8N, or other external systems.

## Immutable inputs

Current reviewed inputs:

| Input | SHA-256 |
|---|---|
| `docs/Festivals_Postgres_Export.csv` | `9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757` |
| `tools/data/festival-category-map.json` | `f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f` |

Compute independently before every run:

```sh
sha256sum docs/Festivals_Postgres_Export.csv tools/data/festival-category-map.json
```

Every file-bearing mode requires both expected checksums. The byte-exact category-map checksum is embedded in the prepared batch `import_profile`; apply rejects a different file or map. A completed ordinary source checksum is a no-op and cannot create another batch because the database also enforces source-checksum uniqueness.

## Authorization and safety

- `--operator-user-id` must identify a database user with role `admin` or `super_admin`.
- `local` and `test` (the default) require a loopback PostgreSQL URL whose database name contains `test` or `ci`.
- `staging` and `production` require `--allow-controlled-target`.
- Prepare never records review implicitly. Production reviewer identity is derived only from a detached Ed25519 approval verified against the configured public key; `--reviewer-user-id` is not accepted.
- Production approval binds reviewer user ID, batch/source/category/prepared digests, environment, backup provider/artifact/reference/checksum/version, restore-test reference/time, issue time, and expiry.
- Production apply requires that immutable review plus the literal confirmation `APPLY-FESTIVAL-IMPORT-PRODUCTION`.
- Reports created with `--output` use exclusive creation and mode `0600`. Report artifacts are gitignored.
- The source file contains private contact data. Keep it in approved restricted storage; do not attach it to tickets or CI output.

The CLI loads `apps/save-philly-festivals/.env.local` and `.env`. Set `DATABASE_URL` explicitly and confirm it before execution.

## Modes

All examples are run from the repository root.

### Dry run (zero writes)

Dry run parses, normalizes, detects conservative existing targets, and classifies duplicates/conflicts. Its output contains checksums and counts only. For the confirmed source with no existing-target matches, the exact result is `434 total / 102 ready / 0 duplicate / 332 quarantined`; target database matches may move additional rows from `ready` to `quarantined`.

```sh
pnpm exec nx run save-philly-festivals:festival-import -- \
  dry-run \
  --environment test \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum 9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757 \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f
```

### Prepare (durable staging)

Prepare atomically inserts or fetches one verified winner for a source checksum, writes one lineage row per CSV record, and records immutable prepared counts and per-row digests. It does not record a reviewer. `normalized_data` is recursively redacted: raw payload, contact name, contact email, and contact phone are not persisted. Source values are represented only by SHA-256 evidence.

```sh
pnpm exec nx run save-philly-festivals:festival-import -- \
  prepare \
  --environment test \
  --operator-user-id <ADMIN_OR_SUPER_ADMIN_UUID> \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum 9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757 \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f \
  --output festival-import-reports/prepare.festival-import-report.json
```

Classification rules:

- parser/normalizer errors are quarantined before duplicate classification;
- a blank/unmapped category is quarantined because every imported festival requires one approved link;
- only otherwise importable later exact normalized-hash duplicates are `duplicate` and link to an importable first row;
- if any same-normalized-name/date candidate differs materially, every member of that candidate group is quarantined;
- conservative existing-target candidates (same deterministic slug, or same case-insensitive name and primary date) are quarantined; existing festivals are never updated or merged.

### Review

Review is a separate post-prepare operation. For production, an authorized reviewer signs the canonical approval payload offline with Ed25519; the importer derives the reviewer and all recovery evidence from that verified payload, rejects wrong signers/tampering/future restore timestamps/stale or expired approvals, and requires the reviewer to be a distinct admin/super-admin. A replay must present the same signed evidence. Local/test may explicitly use `--test-reviewer-user-id`.

```sh
pnpm exec nx run save-philly-festivals:festival-import -- \
  review --environment production --allow-controlled-target \
  --batch-id <PREPARED_BATCH_UUID> \
  --file docs/Festivals_Postgres_Export.csv --expected-checksum 9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757 \
  --category-map tools/data/festival-category-map.json --expected-category-map-checksum f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f \
  --approval-file restricted/reviewer-approval.json \
  --review-public-key-file restricted/reviewer-ed25519-public.pem
```

The approval file contract is `{ "algorithm": "Ed25519", "payload": { ... }, "signature": "<base64>" }`. The canonical payload has exactly: `version`, `reviewerUserId`, `batchId`, `sourceChecksumSha256`, `categoryMapChecksumSha256`, `preparedEvidenceDigestSha256`, `environment`, `backup` (`provider`, `artifactId`, `reference`, `checksumSha256`, `version`), `restore` (`testReference`, `verifiedAt`), `issuedAt`, and `expiresAt`. Sign the UTF-8 canonical JSON generated by the importer contract; keep private signing keys outside the application host. Configure `FESTIVAL_IMPORT_REVIEW_PUBLIC_KEY` with PEM content or pass a controlled `--review-public-key-file`.

### Apply and resume

Apply requires the exact prepared batch, exact source bytes, exact category-map bytes, matching environment, and the original operator. These bindings are also checked before a completed replay no-op. Before any write it re-verifies every source-row and normalized-row hash.

```sh
pnpm exec nx run save-philly-festivals:festival-import -- \
  apply \
  --environment test \
  --batch-id <PREPARED_BATCH_UUID> \
  --operator-user-id <ADMIN_OR_SUPER_ADMIN_UUID> \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum 9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757 \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum f7f9c5923c9f1abf5c65a4587e610e0b203d9c7fdeb9bc3516a9e9a16199242f \
  --output festival-import-reports/apply.festival-import-report.json
```

Each ready row is one atomic transaction containing:

1. an insert-only `Festival` with deterministic UUID/slug, legacy `status = draft`, workflow `draft`, revision `0`, no owner, and private contact fields;
2. exactly one primary all-day `FestivalOccurrence` in `America/New_York`;
3. exactly one reviewed category link;
4. an initial `FestivalTransition` from null to `draft`, attributed to the operator;
5. a revision-0 `FestivalRevision` built with the application’s `FESTIVAL_REVISION_SNAPSHOT_SELECT` and `buildFestivalRevisionSnapshot` contract;
6. imported lineage linked to the target.

A target candidate appearing between prepare and apply is quarantined atomically rather than updated. Every apply claims a unique expiring attempt token; every row transaction, completion, and failure transition is fenced by that token and renews its heartbeat. If apply fails, rerun with `--resume`. If the process dies, `--resume` can reclaim only an expired `running` lease after full evidence revalidation; an unexpired attempt remains protected and stale tokens cannot write. Resume imports only durable `ready` rows and treats its own compatible deterministic prior target as idempotent recovery. Completed replay revalidates source/map before returning reconciliation and performs zero writes.

### Report

```sh
pnpm exec nx run save-philly-festivals:festival-import -- \
  report --environment test --batch-id <BATCH_UUID> --format json

pnpm exec nx run save-philly-festivals:festival-import -- \
  report --environment test --batch-id <BATCH_UUID> --format csv \
  --output festival-import-reports/review.festival-import-report.csv
```

Reports include row numbers, dispositions, safe issue codes, checksums, and reconciliation status. They intentionally omit normalized payloads, issue messages, URLs, contact values, and target IDs.

## Production procedure

1. Rehearse against disposable PostgreSQL with the exact release and exact inputs.
2. Run focused unit tests and `pnpm festival:import:test`.
3. Freeze the source and category-map files; independently confirm both checksums.
4. Confirm the release SHA, maintenance window, database operator, distinct reviewer, and restoration owner.
5. Create and verify a restorable backup; record its reference and SHA-256.
6. Dry-run against production with `--environment production --allow-controlled-target`.
7. Prepare with the same source/map and operator; prepare records no approval.
8. Review the prepared redacted report and immutable digest.
9. Have the distinct reviewer create the canonical detached Ed25519 approval containing exact batch and backup/restore evidence; run `review` with the approval and configured public key.
10. Apply with the same flags plus `--batch-id` and `--confirmation APPLY-FESTIVAL-IMPORT-PRODUCTION`.
11. Save the redacted apply report in restricted operational evidence.
12. Replay apply once with the exact source/map and verify a completed no-op with unchanged counts.
13. Verify public catalog/detail endpoints exclude all imported drafts.

## Reconciliation acceptance

Completion is blocked unless reconciliation verifies:

- source count equals durable lineage count;
- no row remains `ready`;
- each imported row has one private draft festival, revision `0`, initial operator transition, revision snapshot, primary all-day occurrence, and category link;
- no imported record is published or owner-associated;
- schedules, producer/workflow notifications, organizer integrations, mailing consents, assets/files, and social feeds total zero.

## Integration rehearsal

The database must already exist and be server-provisioned. The script refuses non-loopback URLs and names without `test`/`ci`, runs `prisma migrate deploy`, seeds only a disposable admin and the six categories, prepares/applies a generated fixture containing private contact data, replays, and verifies redaction/public exclusion/constraints.

```sh
DATABASE_URL='postgresql://.../save_philly_festivals_import_test' \
  pnpm festival:import:test
```

The script does not create or drop the PostgreSQL database.

## Recovery: resume, then archive and forward

There is no importer delete or rollback command. Do not delete imported festivals, lineage, transitions, revisions, or occurrences. A failed batch or expired `running` lease is reclaimed with `apply --resume` only after its stable evidence and durable counts are investigated; active leases cannot be stolen and raw exception messages are never persisted or printed by the CLI.

If a completed batch is wrong:

1. stop editorial processing and retain all evidence;
2. transition affected festivals to `archived` through the normal audited workflow so they remain private;
3. document the batch and affected lineage rows;
4. prepare a reviewed forward repair in application workflows or a separately approved repair tool;
5. reconcile all dependent records explicitly;
6. use the verified full-database restore only for broad corruption and only under the approved recovery-point/data-loss decision.

This preserves audit history and avoids unsafe deletion after editorial edits or downstream references.
