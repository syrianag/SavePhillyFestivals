# N8N Automation Application

N8N is the second Nx application. It has dedicated PostgreSQL storage and is isolated from the Next.js application database.

## Safety model

- Local N8N binds only to `127.0.0.1:5678`.
- Production publishes Caddy on `80/443`; PostgreSQL and N8N port `5678` are not directly public.
- Images are pinned. Upgrade checks report stable-version drift but never modify production.
- `DiasporaDNA.json` is inactive and Gmail is draft-only.
- Platform deployment, workflow import, controlled proof, and activation are separate approvals.
- `N8N_ENCRYPTION_KEY` must remain stable and be escrowed securely.
- No provided command deletes persistent volumes.

## Local operation

```sh
pnpm run n8n:init
pnpm run n8n:validate
pnpm run n8n:test
pnpm run n8n:plan
CONFIRM_DEPLOY=n8n pnpm run n8n:deploy
pnpm run n8n:health
pnpm run n8n:logs
pnpm run n8n:stop
```

`n8n:init` creates ignored local secrets and refuses to overwrite them. `n8n:test` statically validates the inactive workflow and fixtures without external calls.

## DiasporaDNA contract

`DiasporaDNA.json` uses environment-configured Sheet/tab/model bindings and contains no exported credential IDs or source-instance metadata. It normalizes and bounds input, requires ready status, rejects invalid/duplicate/prompt-injection inputs, validates generated content, creates a Gmail draft only, and emits explicit success/failure status data.

Before activation, an operator must:

1. Bind approved Google Sheets, Gemini, and Gmail credentials after inactive import.
2. Verify the configured Gemini model is available in the deployed N8N version; the repository does not claim provider compatibility.
3. Configure the approved Sheet and required durable status columns.
4. Confirm status/draft-ID updates persist to the chosen ledger and replay creates no duplicate draft.
5. Run one controlled allowlisted-row proof and verify one draft and zero sends.
6. Obtain separate activation approval.

## Production Compose

Validate both models without changing services:

```sh
pnpm run n8n:validate
pnpm run n8n:validate:production
```

Production files:

- `config/compose.yaml` — pinned N8N/PostgreSQL base and loopback local port.
- `config/compose.production.yaml` — HTTPS URLs, proxy settings, pruning, and pinned Caddy.
- `config/production/Caddyfile` — TLS reverse proxy and security headers.
- `config/production/.env.example` — names-only host configuration template.

On the DigitalOcean host, create `apps/n8n/.env.production` with mode `0600`. Never commit it. Configure DNS before deployment and allow only required `80/443`; restrict SSH and do not expose `5432` or `5678`.

## GitHub Actions deployment

Run **N8N DigitalOcean Operations** manually with one of:

- `check-upgrades`: compare the Compose pin with N8N’s stable dist-tag; report only.
- `plan`: validate all N8N gates and print a no-change plan.
- `deploy`: require `DEPLOY_N8N_PRODUCTION` plus approval in the `n8n-production` GitHub environment.

Required environment secrets:

- `N8N_DO_HOST`
- `N8N_DO_USER`
- `N8N_DO_SSH_PRIVATE_KEY`
- `N8N_DO_KNOWN_HOSTS`
- `N8N_DO_REMOTE_DIR`

Deploy validates configuration, takes timestamped logical PostgreSQL and N8N-data backups when existing services are running, reconciles pinned images, and verifies HTTPS health. Optional workflow import uses the inactive export; the workflow does not activate it.

## Rollback and recovery

Before every deployment, record the release SHA, image versions, backup directory, operator, and rollback owner. For rollback, restore the previous versioned Compose assets and pinned image, reconcile services, and verify HTTPS health. Database or N8N-data restoration must be performed from a tested backup in an approved maintenance window while preserving the corresponding encryption key.

Never use `docker compose down --volumes` as a rollback step.

## Resources

- [N8N Docker Compose installation](https://docs.n8n.io/hosting/installation/server-setups/docker-compose/)
- [N8N environment variables](https://docs.n8n.io/hosting/configuration/environment-variables/)
- [N8N security guidance](https://docs.n8n.io/hosting/securing/overview/)
- [N8N backup and restore](https://docs.n8n.io/hosting/cli-commands/)
- [Caddy reverse proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy)
- [GitHub deployment environments](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
