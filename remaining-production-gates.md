# Remaining Production Gates

This checklist must be completed before deploying or activating the production N8N workflow. A successful CI run does not itself authorize deployment or activation.

## 1. GitHub production environment

- [ ] Create the GitHub environment `n8n-production`.
- [ ] Require at least one designated production reviewer.
- [ ] Restrict deployment branches/tags to the approved release strategy.
- [ ] Confirm the deployment workflow cannot bypass environment approval.

## 2. GitHub environment secrets

Configure these secrets in `n8n-production` without exposing their values in Git, logs, tickets, or screenshots:

- [ ] `N8N_DO_HOST`
- [ ] `N8N_DO_USER`
- [ ] `N8N_DO_SSH_PRIVATE_KEY`
- [ ] `N8N_DO_KNOWN_HOSTS`
- [ ] `N8N_DO_REMOTE_DIR`

Additional checks:

- [ ] Use a dedicated least-privilege deployment account.
- [ ] Verify `N8N_DO_KNOWN_HOSTS` from a trusted channel rather than accepting a first connection interactively.
- [ ] Test key rotation and access revocation.

## 3. DigitalOcean host readiness

- [ ] Approve the DigitalOcean project, region, Droplet size, storage, owner, and monthly budget.
- [ ] Apply current operating-system security updates.
- [ ] Install supported Docker Engine and Docker Compose versions.
- [ ] Restrict SSH to approved source addresses or an approved access gateway.
- [ ] Permit public ports `80` and `443` only as required for redirect, TLS, and N8N HTTPS.
- [ ] Do not expose PostgreSQL `5432` or N8N `5678` publicly.
- [ ] Confirm adequate disk space for the application, database, execution history, and backups.
- [ ] Configure disk, container-health, restart, certificate-expiry, and backup-age monitoring.

## 4. DNS and TLS

- [ ] Select and approve the canonical N8N hostname.
- [ ] Point DNS to the approved DigitalOcean ingress address.
- [ ] Verify inbound `80/443` reach the Caddy service.
- [ ] Confirm Caddy obtains and renews a valid certificate.
- [ ] Verify HTTP redirects to HTTPS.
- [ ] Verify the canonical editor and webhook URLs use the exact HTTPS hostname.
- [ ] Update Google OAuth redirect URIs to the final hostname.

## 5. Production environment and secrets

On the host, create `apps/n8n/.env.production` from `apps/n8n/config/production/.env.example` and set mode `0600`.

- [ ] Generate a long PostgreSQL password.
- [ ] Generate a stable, high-entropy `N8N_ENCRYPTION_KEY`.
- [ ] Escrow the encryption key separately under restricted recovery access.
- [ ] Set the approved `N8N_HOST` and `N8N_URL`.
- [ ] Set the approved timezone and execution-retention period.
- [ ] Set names or identifiers for the production Sheet and tab.
- [ ] Do not commit `.env.production` or copy development secrets into production.
- [ ] Confirm secrets do not appear in Compose output or GitHub logs.

Loss or replacement of `N8N_ENCRYPTION_KEY` can make stored N8N credentials unreadable.

## 6. Release and CI evidence

On the exact release SHA:

- [ ] `pnpm install --frozen-lockfile` passes.
- [ ] `pnpm audit` reports no unapproved vulnerabilities.
- [ ] Prisma generation and schema validation pass.
- [ ] The committed migrations apply to a blank PostgreSQL database.
- [ ] Vitest unit tests and coverage pass.
- [ ] ESLint has no errors; warnings are reviewed and accepted or fixed.
- [ ] The Next.js production build passes.
- [ ] Playwright E2E passes with zero retries.
- [ ] `pnpm run n8n:validate` passes.
- [ ] `pnpm run n8n:validate:production` passes.
- [ ] `pnpm run n8n:test` passes.
- [ ] Record the release SHA and image pins in the change record.

## 7. N8N upgrade review

The repository currently pins N8N independently from the reported stable release.

- [ ] Run the GitHub Actions `check-upgrades` operation.
- [ ] Review N8N release notes between the pinned and proposed versions.
- [ ] Review breaking changes, database migrations, community-node compatibility, and security advisories.
- [ ] Test any proposed upgrade locally or in staging.
- [ ] Take and verify backups before changing the production pin.
- [ ] Do not allow the scheduled check to upgrade production automatically.

## 8. Backup and rollback rehearsal

- [ ] Define approved RPO, RTO, retention, and off-host backup destination.
- [ ] Take a logical PostgreSQL backup.
- [ ] Back up N8N application data.
- [ ] Record checksums and protect backup access.
- [ ] Restore both backups in an isolated environment using the escrowed encryption key.
- [ ] Verify N8N starts and stored credentials remain decryptable.
- [ ] Time the restore and compare it with the approved RTO.
- [ ] Document container/image rollback and workflow rollback procedures.
- [ ] Never use `docker compose down --volumes` as a rollback operation.

## 9. Deployment plan and authorization

- [ ] Run the GitHub Actions `plan` operation.
- [ ] Review the target host, remote directory, Compose files, image pins, backup steps, health checks, and rollback owner.
- [ ] Open an approved change record with operator, reviewer, release SHA, change window, backup reference, and rollback owner.
- [ ] Enter `DEPLOY_N8N_PRODUCTION` only after approval.
- [ ] Approve the protected `n8n-production` environment deployment.
- [ ] Verify containers and the public HTTPS health endpoint after reconciliation.

## 10. Inactive workflow import and configuration

- [ ] Import `apps/n8n/DiasporaDNA.json` while it remains inactive.
- [ ] Confirm N8N did not activate it during import.
- [ ] Bind approved Google Sheets, Gemini, and Gmail credentials by environment-specific names.
- [ ] Use least-privilege OAuth scopes and organization-owned accounts.
- [ ] Configure the approved Sheet and tab.
- [ ] Verify the configured Gemini model is available in the deployed N8N version and credential.
- [ ] Confirm the Gmail node creates drafts only and contains no send operation.
- [ ] Configure durable columns or an approved ledger for ready, processing, success, failure, draft ID, processed timestamp, workflow version, and error reason.
- [ ] Confirm invalid and duplicate rows produce no Gmail draft.

## 11. Controlled production proof

Use an organization-controlled recipient and a dedicated test row. Do not use a real partner without consent.

- [ ] Start with the workflow inactive and no unintended ready rows.
- [ ] Confirm no matching draft already exists.
- [ ] Execute exactly one allowlisted test row in a controlled window.
- [ ] Verify exactly one Gmail draft is created and no email is sent.
- [ ] Verify recipient, subject, body, tone, signature, and source row.
- [ ] Verify no unresolved placeholders are present.
- [ ] Verify the durable ledger records draft ID, processed time, workflow version, and success.
- [ ] Replay or re-poll the same row and verify no second draft is created.
- [ ] Test one invalid row and verify it creates no draft and records a useful reason.
- [ ] Review logs/execution data for unnecessary PII or secret disclosure.
- [ ] Deactivate immediately after the proof unless separate activation approval has been granted.

## 12. Production activation and handoff

Activation is a separate audited decision from deployment and import.

- [ ] Obtain explicit business-owner and change-approver activation authorization.
- [ ] Approve polling frequency, provider quotas, expected volume, and cost limits.
- [ ] Confirm monitoring and failure alerts reach a named operator.
- [ ] Document duplicate reconciliation and manual replay procedures.
- [ ] Document credential rotation, OAuth revocation, backup, restore, rollback, and incident response.
- [ ] Assign service owner, business approver, technical on-call, backup owner, and escalation contacts.
- [ ] Have a second operator execute the health, logs, deactivate, backup, restore, and rollback runbooks.
- [ ] Retain redacted evidence and approvals with the release record.

## Go/no-go rule

Production deployment is **no-go** if any infrastructure, CI, backup, security, or authorization gate above is incomplete. Workflow activation is **no-go** until deployment is healthy, the controlled proof passes, durable duplicate prevention is demonstrated, and separate activation approval is recorded.
