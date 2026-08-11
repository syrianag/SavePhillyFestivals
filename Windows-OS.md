# Windows Development Notes

Notes for running this repo natively on Windows (PowerShell), collected while diagnosing a
"`pnpm dev` runs but I don't see my project" report on 2026-08-10. Pair with `training-guide.md`
(cross-platform problem log) and `Known-Issues.md` (product-level callouts). This file is
Windows-specific setup/tooling friction only.

---

## "pnpm dev works, but I don't see anything" — verified cause

This was checked directly against this checkout on 2026-08-10 and is **not a Windows bug**:

- `next dev` starts cleanly (`✓ Ready in 4.5s`, no errors) with the existing
  `apps/save-philly-festivals/.env`.
- `pnpm exec nx show projects` correctly lists both `save-philly-festivals` and `n8n` — Nx sees
  the project fine.
- A direct read-only count against the database showed:

  ```text
  total festivals: 415
  unpublished: 405, approved: 6, pending_review: 1, draft: 2, rejected: 1
  ```

The public site (search, calendar, map, festival detail pages) only shows festivals with
`workflow_state: "published"` — see `src/features/editorial-workflow/publication-policy.js`.
405 of 415 imported festivals are `unpublished`. So the homepage/search/map look empty by design,
not because the dev server or the project setup is broken. This is documented as a deliberate
operator action in [`Known-Issues.md`](Known-Issues.md#-read-first-the-public-site-is-currently-empty).

To see festival cards while developing locally, either:
- Log in as admin/producer and transition a few festivals to `published` through the workflow UI, or
- Seed/verify a local dev DB (`pnpm run db:seed && pnpm run db:verify-admin`) rather than pointing
  `.env`/`.env.local` at the shared Neon database, so you aren't looking at production import data.

If instead the dev server itself won't start or the browser can't connect at all, that's a
different problem — check `apps/save-philly-festivals/.env.local` (or `.env`) has a working
`DATABASE_URL` and `AUTH_SECRET` (`pnpm run auth:secret` generates the latter); Auth.js throws at
import time if `AUTH_SECRET` is missing, which crashes the whole dev server, not just the auth route.

---

## Genuine Windows-specific gotchas in this repo

### Inline env vars in commands don't work in PowerShell

Several docs (`README.md`, `training-guide.md`) show POSIX-style inline env assignment:

```sh
DATABASE_URL='postgresql://...' pnpm run migrate:test
E2E_BROWSERS=chromium pnpm run e2e
CONFIRM_DEPLOY=n8n pnpm run n8n:deploy
```

This syntax is bash-only. In native PowerShell, set the variable first, then run the command:

```powershell
$env:DATABASE_URL = 'postgresql://...'; pnpm run migrate:test
$env:E2E_BROWSERS = 'chromium'; pnpm run e2e
$env:CONFIRM_DEPLOY = 'n8n'; pnpm run n8n:deploy
```

Claude Code's Bash tool here runs Git Bash, so the POSIX form works inside tool calls — this only
bites when copy-pasting from the docs into a native PowerShell window.

### `deploy:web` needs a POSIX shell

`package.json`'s `deploy:web` script is `sh -c '...'`. There is no `sh` in a stock PowerShell/cmd
environment; it only works if Git for Windows' Git Bash is installed and its `sh.exe` is resolvable
on `PATH` (common, but not guaranteed). If `pnpm run deploy` fails with something like
`'sh' is not recognized`, run it from Git Bash or WSL instead of PowerShell, or dispatch the same
gated workflow directly via `gh workflow run deploy.yml -f release_sha=... -f backup_reference=...`.

### Case-insensitive filesystem hides import-casing bugs until deploy

Windows (and default macOS) filesystems are case-insensitive; Linux (CI, Vercel) is not. An import
like `from "@/components/ui/Button"` when the file is actually `button.jsx` will resolve silently
here and fail only in CI/production. If a build passes locally on Windows but fails on Vercel/CI
with a module-not-found error, check casing first.

### Playwright: skip `install-deps` on Windows

`training-guide.md`/`README.md` mention `playwright install-deps` for WebKit/Firefox system
libraries — that installer targets Linux package managers and does nothing useful on Windows.
On Windows, `pnpm exec playwright install` (no `install-deps`) is sufficient; the browsers are
self-contained.

### pnpm + Windows, generally fine, two things to know

- pnpm's node_modules layout uses directory junctions on Windows, not symlinks, so it does **not**
  require Developer Mode or an elevated shell — if you've had that requirement bite you on other
  JS tooling, it isn't a factor here.
- If `corepack enable` fails with a permissions error, run that one command from an elevated
  PowerShell (it writes shims into the Node install directory); nothing else in the workflow needs
  elevation.

### Docker Desktop for N8N

`apps/n8n` requires Docker Engine + Compose. On Windows that means Docker Desktop with the WSL2
backend enabled (the Hyper-V backend also works but is slower for bind mounts). Local N8N binds to
`127.0.0.1:5678` only — if `pnpm run n8n:health` can't reach it, confirm Docker Desktop is actually
running (it does not auto-start on boot by default) before checking anything in the compose config.
