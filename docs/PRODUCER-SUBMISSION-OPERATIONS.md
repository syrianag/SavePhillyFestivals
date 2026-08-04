# F-07 Producer Submission Operations

## External activation

F-07 is safe with uploads disabled. This tree intentionally does **not** include a production malware scanner/full image-decoder implementation, so production upload capability remains disabled regardless of `PRODUCER_UPLOAD_SCANNER_READY` or other readiness flags. A future activation must inject a real scanner boundary with a `scan()` implementation and configure:

- `GOOGLE_DRIVE_UPLOADS_ENABLED=1`
- `GOOGLE_DRIVE_PRIVATE_FOLDER_ID` identifying one fixed folder
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`

The application performs a bounded live verification (maximum five-minute success cache) before capability reports operational and before upload. It fetches Drive folder metadata and the folder permission list, verifies the exact configured folder ID is an untrashed writable Drive folder, and rejects `anyone`, `domain`, public-readable, read-only, pending, deleted, unrelated-user, or otherwise unexpected permissions. The transport uses the `drive.file` OAuth scope, uploads only to the configured parent, creates no public permissions, and returns no Drive URL or credential.

### Independent deployment audit

Before any future upload activation, deployment operations must independently inspect the folder in Google Drive—not rely only on application capability—and record evidence that:

1. the configured ID is the intended dedicated folder;
2. link sharing is off;
3. no `anyone` or `domain` permission exists;
4. no user/group other than the dedicated service account has access;
5. the service account has only the folder access needed to add/delete F-07 objects;
6. the injected scanner/decoder has a production health check and rejects or quarantines unsafe input;
7. an upload followed by compensation deletion succeeds in that environment.

Repeat this audit after Drive ownership, shared-drive, service-account, or scanner changes. F-07 must not be described as production upload-ready until this evidence and a real scanner implementation exist.

Submission notifications use `PRODUCER_SUBMISSION_TEAM_ALIAS` as the team mailbox and the existing server-only Resend transactional boundary. Missing provider/mailbox configuration is durably recorded as `provider_unconfigured`; it does not undo `pending_review`.

## Canonical origin, request limits, and deployment controls

Production requires a valid absolute HTTP(S) `NEXT_PUBLIC_SITE_URL`. Producer mutation origin validation fails closed when it is absent or invalid. Request-derived origin fallback is allowed only outside production and only for exact loopback hosts (`localhost`, `127.0.0.1`, or `[::1]`) used by local/test/E2E runs.

Next/Node `Request.formData()` buffers multipart bodies. F-07 does **not** claim a streaming multipart parser. The upload handler requires a valid bounded `Content-Length`, reads the body through an application byte bound before invoking `formData()`, and rejects missing/invalid length with `411` and declared/actual overflow with `413`.

The production ingress (CDN/load balancer/platform) must independently reject upload request bodies above **10 MiB + 64 KiB** before they reach Next.js. Configure this at the deployment edge; `vercel.json` cannot express a universal body limit for every deployment target.

The application limiter is a bounded per-process defense for create, submit, and upload abuse. It intentionally provides no distributed or cross-instance guarantee. Production create, submit, and upload fail closed unless `PRODUCER_EDGE_RATE_LIMIT_VERIFIED=1` confirms that identity/IP-aware rate limiting is independently enabled at the deployment edge. Capability output also reports mutations/uploads disabled when that proof flag is absent. Setting the flag does not make the in-process limiter distributed; deployment owners must retain independent edge evidence and monitoring.

## Orphan reconciliation

If Drive upload succeeds and database asset persistence fails, F-07 attempts `deletePrivate`. If compensation also fails, it writes a restricted `FestivalAssetReconciliation` record containing the opaque reconciliation marker, provider file ID, server filename, checksum, cleanup state, attempts, and timestamps. This model has no public presenter, relation from `Festival`, producer route, or public API.

The application logs only the opaque marker. Provider IDs, filenames, user IDs, and contact data must not appear in routine logs. `retryPrivateAssetReconciliation()` is a service-only operations boundary that atomically claims retryable records and records cleaned/failed outcomes. It is intentionally not exposed as an HTTP endpoint; any future script or admin endpoint must independently require privileged operations authorization and must never return provider identifiers.

Alert on `[PRODUCER ASSET RECONCILIATION]`, pass only the marker to an authorized operations workflow, and retain reconciliation records for audit even after cleanup succeeds.

## Disposable PostgreSQL verification

Only use a disposable local database whose name contains `test`. With Docker available:

```sh
docker run --rm --name spf-f07-postgres -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=spf_f07_test -p 55432:5432 -d postgres:17
DATABASE_URL=postgresql://test:test@127.0.0.1:55432/spf_f07_test pnpm exec nx run save-philly-festivals:migrate-test --outputStyle=static
docker stop spf-f07-postgres
```

The migration test resets only that safety-approved disposable schema, applies pre-F-07 migrations, seeds representative legacy draft/pending/submitted/approved/rejected/published/unknown statuses, applies F-07, verifies status mapping and database constraints/triggers, and executes generated Prisma operations for producer notifications, conditional moderation, and reconciliation fields. It then resets and runs `prisma migrate deploy`/`migrate status` as a separate migration-history check. Never point this command at a shared, staging, or production database.
