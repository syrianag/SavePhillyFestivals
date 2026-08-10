# Activation Gate

Step-by-step procedure for taking Save Philly Festivals from a verified build to live data and
a production deployment.

**Read this before running anything.** Several steps are irreversible against shared data, and
two of them require evidence you must genuinely produce rather than assert.

- Every command runs from the **repository root** unless stated otherwise.
- `pnpm --filter save-philly-festivals <cmd>` does **not** work in this repo. Use
  `pnpm exec nx run save-philly-festivals:<target>`.
- There is **one database**. `--environment staging` is a safety *flag*, not a separate
  database. Any apply writes to the same Neon instance the deployed site reads.

---

## Gate 0 — Preconditions

### 0.1 Confirm the working tree is clean and gates pass

```sh
git status --short
pnpm run verify
```

`verify` runs: `prisma validate` → `pnpm audit` → coverage → n8n contract tests → n8n validate
→ lint → build. **All must pass.** A red gate is a stop, not a warning.

### 0.2 Confirm environment configuration

The app reads `apps/save-philly-festivals/.env.local`, then `.env`. The repository root env
files are **not** read by anything — do not put configuration there.

Check presence without printing values:

```sh
cd apps/save-philly-festivals
for n in DATABASE_URL AUTH_SECRET NEXT_PUBLIC_SITE_URL LOCAL_ADMIN_EMAIL LOCAL_ADMIN_PASSWORD; do
  echo "$n present: $(grep -c "^$n=" .env.local)"
done
cd -
```

Each must report `1`. Never `cat` these files or grep them with a `NAME=.*` pattern.

### 0.3 Decide the email posture — do this before any data operation

Bulk publishing queues one notification per workflow transition, addressed to each festival's
`contact_email`. For a 400-row import that is roughly **1,200 emails to real organizers who
never signed up.**

Confirm the provider is not configured in the target environment:

```sh
pnpm exec vercel env ls production
pnpm exec vercel env ls preview
```

**`RESEND_API_KEY` must be absent** from any environment you are about to operate against. With
no key, `src/lib/mail.js` returns `provider_unconfigured` and sends nothing.

Do not rely on that alone. The bulk scripts also pass **no notification provider**, which is a
second independent guarantee. Do not "helpfully" wire one in.

---

## Gate 1 — Database schema

### 1.1 Regenerate the Prisma client

```sh
pnpm exec nx run save-philly-festivals:prisma-generate
```

Required after any schema change or a fresh clone — `src/generated/prisma` is gitignored. **A
running dev server caches the old client; restart it after regenerating** or you will get
`Unknown argument` errors for new columns.

### 1.2 Create migrations without applying them

```sh
pnpm exec prisma migrate dev --create-only --name <descriptive_name> \
  --config apps/save-philly-festivals/prisma.config.ts
```

**Then read the generated SQL before applying it.** Prisma's shadow-database diff can include
unrelated statements — index renames, and in at least one real case a `DROP FOREIGN KEY` and a
`DROP INDEX` that had nothing to do with the intended change.

Cut the migration down to what you actually intend and note in a comment what you removed and
why. Cross-check with:

```sh
pnpm exec prisma migrate status --config apps/save-philly-festivals/prisma.config.ts
```

### 1.3 Apply migrations

```sh
pnpm run db:migrate:deploy
```

Uses `prisma migrate deploy`. **`prisma db push` is not a release mechanism** — never use it
against shared data.

Additive nullable columns are backward compatible with already-deployed code. Anything that
drops or renames a column requires a coordinated deploy and belongs behind Gate 4.

---

## Gate 2 — Festival data import

This is the heaviest gate in the system. It exists because the import writes hundreds of rows
carrying third-party contact details into shared data.

### 2.1 Provision categories referenced by the map

```sh
pnpm run db:ensure-import-categories
```

`festival-import-repository.js` resolves categories by slug and **aborts the entire apply** with
`category_not_found` if one is missing. This script is insert-only and idempotent. Run it every
time the category map changes.

### 2.2 Compute the checksums

```sh
sha256sum docs/Festivals_Postgres_Export.csv
sha256sum tools/data/festival-category-map.json
```

The CSV digest must match `CONFIRMED_FESTIVAL_CSV_SHA256` in `festival-import-profile.js`. **If
it does not match, stop** — either the source file changed or you have the wrong file. Do not
edit the CSV to make validation pass; it holds organizer contact details and its digest is an
integrity control.

The category map digest changes whenever you edit the map. Recompute it every run.

### 2.3 Dry run

```sh
pnpm exec nx run save-philly-festivals:festival-import --args="dry-run \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum <CSV_SHA256> \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum <MAP_SHA256> \
  --environment staging --allow-controlled-target"
```

Touches nothing. Review `ready` versus `quarantined` before continuing.

If `unmapped_category` errors appear, fix `tools/data/festival-category-map.json` — add aliases
or set `defaultCategorySlug` — then re-run 2.1, 2.2, and 2.3. Date errors
(`blank_start_date`, `invalid_start_date`) are genuine source defects that no mapping change
reaches; those rows stay quarantined.

### 2.4 Prepare

```sh
pnpm exec nx run save-philly-festivals:festival-import --args="prepare \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum 9e1935a118c87b38fd40e5fd0cc1db3118500e1d12911340f416d152ede62757 \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum 4b0e8ac4eec2ab76d12c83b54fb29ab12a4d2ece8f75bb4bcee2bd140bb9fa9b \
  --operator-user-id 39db5829-4f98-42aa-b912-a832f77055c6 \
  --environment staging --allow-controlled-target"
```

Writes staged rows to `FestivalImportBatch` / `FestivalImportRow`. **No festivals are created
yet.** Record the returned `batch.id` and `preparedDigestSha256`.

Staged rows are reviewable in the admin UI at `/admin/imports`.

### 2.5 Take a real backup and verify a restore

**Do this now, before review. It is not optional, and the next step will require you to attest
to it under signature.**

1. Take a database snapshot (Neon branch/snapshot, or `pg_dump`).
2. Record: provider, artifact ID, reference, SHA-256 checksum, version.
3. **Restore it somewhere and confirm the restore actually works.** Record the restore
   reference and the UTC timestamp of verification.

A backup you have not restored from is a hypothesis, not a backup.

### 2.6 Produce the signed reviewer approval

`staging` and `production` both require a **detached Ed25519 approval**. The `--test-reviewer-user-id`
shortcut is restricted to `local`/`test` environments and will be refused here.

Generate a reviewer keypair once and store the private key outside the repository:

```sh
openssl genpkey -algorithm ed25519 -out reviewer-key.pem
openssl pkey -in reviewer-key.pem -pubout -out reviewer-pub.pem
```

Build the approval payload with **exactly** these keys:

```json
{
  "version": 1,
  "reviewerUserId": "<UUID of the reviewer>",
  "batchId": "<batch.id from 2.4>",
  "sourceChecksumSha256": "<CSV_SHA256>",
  "categoryMapChecksumSha256": "<MAP_SHA256>",
  "preparedEvidenceDigestSha256": "<preparedDigestSha256 from 2.4>",
  "environment": "staging",
  "backup": {
    "provider": "<e.g. neon>",
    "artifactId": "<snapshot id>",
    "reference": "<restorable reference>",
    "checksumSha256": "<backup SHA-256>",
    "version": "<backup version>"
  },
  "restore": {
    "testReference": "<where you restored it>",
    "verifiedAt": "<UTC ISO-8601 of the verified restore>"
  },
  "issuedAt": "<UTC ISO-8601 now>",
  "expiresAt": "<UTC ISO-8601, within 7 days of issuedAt>"
}
```

Sign the **canonical JSON** of that payload with Ed25519 and base64 the signature. The approval
file is `{ "algorithm": "Ed25519", "payload": { … }, "signature": "<base64>" }`.

The verifier enforces all of the following, so get them right:

| Rule | Constant |
|---|---|
| `restore.verifiedAt` must precede `issuedAt` | — |
| Approval must not be older than 7 days | `FESTIVAL_IMPORT_APPROVAL_MAX_AGE_MS` |
| Clock skew tolerance | 5 minutes |
| `expiresAt` after `issuedAt`, within 7 days | — |
| Checksums must bind to this exact batch | prevents replay onto another import |
| Production only: reviewer ≠ operator | distinct-person requirement |

> **This signature is an attestation, not a formality.** It states that a backup with that
> checksum exists and that a restore from it was verified at that time. Signing it without
> having done the work falsifies a safety record, and the falsehood only surfaces during an
> emergency restore that then fails. If you are tempted to fill in plausible-looking values to
> get past this gate, stop — the gate is doing its job.

### 2.7 Review

```sh
pnpm exec nx run save-philly-festivals:festival-import --args="review \
  --batch-id <BATCH_ID> \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum <CSV_SHA256> \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum <MAP_SHA256> \
  --approval-file <path/to/approval.json> \
  --review-public-key-file <path/to/reviewer-pub.pem> \
  --environment staging --allow-controlled-target"
```

Alternatively set `FESTIVAL_IMPORT_REVIEW_PUBLIC_KEY` instead of passing the key file.

### 2.8 Apply

```sh
pnpm exec nx run save-philly-festivals:festival-import --args="apply \
  --batch-id <BATCH_ID> \
  --file docs/Festivals_Postgres_Export.csv \
  --expected-checksum <CSV_SHA256> \
  --category-map tools/data/festival-category-map.json \
  --expected-category-map-checksum <MAP_SHA256> \
  --operator-user-id <ADMIN_UUID> \
  --environment staging --allow-controlled-target"
```

For `--environment production`, add `--confirmation APPLY-FESTIVAL-IMPORT-PRODUCTION`.

If a run fails or is interrupted, re-run with `--resume`. Completed batches are a no-op, so
re-running is safe.

**After apply, every festival is `workflow_state: "draft"` and therefore invisible to the
public site.** That is by design. Continue to Gate 3.

---

## Gate 3 — Making data publicly visible

### 3.1 Understand the publication gate

`src/features/editorial-workflow/publication-policy.js` is the single source of truth:

```js
export const publishedDiscoveryWhere = Object.freeze({ workflow_state: "published" });
```

Search, calendar, map, and the festival grid all filter on `published`. **`approved` is not
`published`** — this is the single most common source of "the import worked but the site is
empty."

Reaching `published` from `draft` requires three transitions — `pending_review` → `approved` →
`published` — each writing `FestivalTransition` and `FestivalRevision` audit rows.

### 3.2 Dry-run the publish

```sh
pnpm exec nx run save-philly-festivals:festival-publish-batch --args="dry-run \
  --batch-id <BATCH_ID> --environment staging --allow-controlled-target"
```

Confirm the count matches expectations and that no notification provider is wired.

### 3.3 Publish

```sh
pnpm exec nx run save-philly-festivals:festival-publish-batch --args="apply \
  --batch-id <BATCH_ID> --operator-user-id <ADMIN_UUID> \
  --environment staging --allow-controlled-target"
```

Skips already-published festivals, so it is re-runnable after a partial failure.

**Never substitute a raw `UPDATE ... SET workflow_state='published'`.** That skips the audit
trail the editorial feature exists to maintain.

### 3.4 Confirm no email was sent

```sql
SELECT delivery_status, failure_code, count(*)
FROM "FestivalWorkflowNotification" GROUP BY 1, 2;
```

Expect `failed` / `provider_unconfigured`. Cross-check the Resend dashboard shows zero sends in
the window. Outbox rows existing is correct — the audit trail is preserved; only delivery is
suppressed.

---

## Gate 4 — Map coordinates

### 4.1 Dry run

```sh
pnpm exec nx run save-philly-festivals:festival-geocode --args="dry-run"
```

Shows the query built for each festival and an estimated runtime.

### 4.2 Geocode

```sh
pnpm exec nx run save-philly-festivals:festival-geocode --args="apply"
```

Uses OpenStreetMap Nominatim: no API key, no billing. **Rate limited to one request per 1.1
seconds by their usage policy — do not remove the throttle.** Roughly 8 minutes for 400 rows.

Results outside a Philadelphia bounding box are rejected rather than mispinned. Festivals that
fail to resolve keep null coordinates and are simply omitted from the map. Re-runs only process
festivals with no coordinates; `--refresh` re-geocodes everything.

### 4.3 Map provider note

The map uses **Leaflet with OpenStreetMap raster tiles**, deliberately. The CSP sets
`script-src 'self' 'unsafe-inline'` with no external origins, so the Google Maps and ArcGIS
JavaScript SDKs are blocked outright — the most likely cause of an earlier map rendering as an
unusable grey box.

Leaflet is bundled from npm (served from `'self'`) and its tiles are HTTPS images already
allowed by `img-src 'self' blob: data: https:`. **This requires no CSP change.**

Switching to Google Maps would require: a Google Cloud API key with billing, a Map ID for
Advanced Markers and vector maps, adding `https://maps.googleapis.com` and
`https://maps.gstatic.com` to both `script-src` and `connect-src`, and HTTP-referrer
restriction on the public key. Treat that as a security decision, not a styling one.

---

## Gate 5 — Deployment

### 5.1 Preview deploy

```sh
pnpm exec vercel deploy --yes
```

Safe and non-promoting. Verify against the returned URL — note that Deployment Protection may
require `vercel curl` rather than plain `curl`:

```sh
pnpm exec vercel curl <PREVIEW_URL>/map
pnpm exec vercel curl <PREVIEW_URL>/calendar
```

### 5.2 Production deploy

Production is a **dispatched GitHub workflow**, never a local command:

```sh
RELEASE_SHA=<commit that passed all gates> \
BACKUP_REFERENCE=<verified backup reference> \
pnpm run deploy:web
```

Refuses unless both variables are set, and requires the GitHub CLI (`gh`). If `gh` is not
installed, run the Deploy workflow from the GitHub Actions UI instead.

`.github/workflows/deploy.yml` targets the `production` environment and pulls `DATABASE_URL`,
`AUTH_SECRET`, and `NEXT_PUBLIC_SITE_URL` from repository secrets.

### 5.3 Before any push — check repository visibility

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://api.github.com/repos/OWNER/REPO
```

`200` means **public**. A push to a public repository is permanent; deleting later does not
remove the object from history or from anything that mirrored it.

Verify what you are about to publish:

```sh
git ls-files --cached --others --exclude-standard | grep -iE "(^|/)\.env"
git check-ignore -v <path-to-any-sensitive-file>
```

Only `.env.example` files should appear. Client call transcripts, import reports, organizer
contact CSVs, and database exports must never be committed.

---

## Gate 6 — n8n automation activation

Separate from the web app, with its own gate.

```sh
pnpm run n8n:validate
pnpm run n8n:plan
CONFIRM_DEPLOY=n8n pnpm run n8n:deploy
pnpm run n8n:health
```

- `apps/n8n/DiasporaDNA.json` is **intentionally inactive and creates Gmail drafts only.**
- **Activation is always a separate, operator-approved action.** A green CI run does not
  authorize deployment or activation.
- **Never run `docker compose down --volumes`** — it destroys the n8n database.

---

## Post-activation verification

Verify by exercising behavior, not by inspecting row counts.

| Check | How | Expected |
|---|---|---|
| Data is public | Search a known festival name on the live site | The festival is returned |
| Published count | `SELECT count(*) FROM "Festival" WHERE workflow_state='published'` | Matches the publish report |
| Audit trail intact | Transitions for one published festival | 3 rows + matching revisions |
| No email sent | Notification rows | All `provider_unconfigured` |
| Map renders | Open `/map` | Tiles and pins visible, no console errors |
| Calendar filters | Click a date with festivals, then Clear | List filters, then restores |

### Known limitation to communicate

Imported festivals have **no description, no city, and no imagery** — the CSV contract is 11
columns and carries none of those. Text search therefore matches only on name, location, and
mapped category. Set that expectation before a client tests search, rather than letting them
discover it.

---

## Rollback

| Situation | Action |
|---|---|
| Import applied, data wrong | Transition festivals to `unpublished` or `archived` through the editorial service. Do not delete — `deleteFestival` is disabled by design. |
| Migration wrong | Restore from the backup recorded in Gate 2.5. This is the moment that backup attestation either saves you or proves to have been fiction. |
| Deployment bad | Roll back to the previous deployment in Vercel; the immutable prior build is still there. |
| Emails sent by mistake | Stop the process, note scope, notify recipients. Not recoverable — which is why the provider is omitted rather than merely unconfigured. |
