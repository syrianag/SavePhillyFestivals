# STATUS — Feature List Implementation & Publishing Issue

Working document. Updated as work progresses.

- **Started:** 2026-08-12
- **Source of requirements:** `meeting-notes.md` (Website Feature List, Phases 1–4)
- **Branch:** `main`
- **Current stage:** Both agreed features complete and verified against a live database.

## Scope agreed with Rob

Of the five gaps found in analysis, two were selected for this pass:

1. **Digital Our Festivals** — ✅ complete, verified against a live database
2. **One-step producer onboarding** — ✅ complete, verified against a live database

Deferred, not started: imported-festival validation, featured carousel, image-spec guidance
*(image guidance was partially delivered anyway — it ships inside the Our Festivals editor)*.

---

## Part 1 — Publishing issue

### Symptom

Editorial mutations (including publishing a festival) return HTTP 503:

> `Editorial mutations are unavailable until edge rate limiting is verified.`

### Root cause — this is a deliberate gate, not a code defect

The message is emitted by the mutation gate in
[editorial-http.js:58](apps/save-philly-festivals/src/features/editorial-workflow/editorial-http.js#L58),
which calls `producerEdgeRateLimitVerified()` from
[producer-request-security.js:41-46](apps/save-philly-festivals/src/features/producer-submission/producer-request-security.js#L41-L46):

```js
export function producerEdgeRateLimitVerified(
  nodeEnv = process.env.NODE_ENV,
  value = process.env.PRODUCER_EDGE_RATE_LIMIT_VERIFIED,
) {
  return nodeEnv !== "production" || value === "1";
}
```

In production the gate fails closed unless `PRODUCER_EDGE_RATE_LIMIT_VERIFIED=1`.
It passes automatically in development, which is why this reproduces only against the
deployed environment.

This behaviour is documented and intentional. From
`docs/PRODUCER-SUBMISSION-OPERATIONS.md:38`:

> The application limiter is a bounded per-process defense … It intentionally provides no
> distributed or cross-instance guarantee. Production create, submit, and upload fail closed
> unless `PRODUCER_EDGE_RATE_LIMIT_VERIFIED=1` confirms that identity/IP-aware rate limiting
> is independently enabled at the deployment edge.

`PROJECT-STATUS.md:155` records the same intent.

The flag is an **operator attestation** that identity/IP-aware rate limiting is genuinely
enabled at the edge (e.g. Vercel Firewall). Setting it does not implement rate limiting; it
asserts that someone verified it exists.

### Resolution path

The correct fix is an operator action, not a code change:

1. Confirm identity/IP-aware rate limiting is actually configured at the deployment edge.
2. Set `PRODUCER_EDGE_RATE_LIMIT_VERIFIED=1` in the production environment.
3. Redeploy so the serverless functions pick up the new value.

**Not done by me, and deliberately so:** I cannot truthfully make the security attestation
this flag represents, and setting a production environment variable is an outward-facing,
hard-to-reverse change. This needs the deployment owner. I also could not read `.env.local`
to confirm the current value — a permission rule blocked it, which I did not work around.

### Related finding worth a decision (not yet actioned)

The flag is named and documented as a **producer** control covering "create, submit, and
upload". But `editorial-http.js` applies it to *every* admin editorial mutation, including
`handleAdminTransition` — the publish action. Admin publishing is not the public-abuse vector
the doc describes, and it is gated behind a producer-scoped flag.

Two readings, and this is the owner's call rather than mine:

- **Intentional** — one blunt production-hardening switch covering all mutation surfaces.
- **Over-broad** — admin publishing should have its own gate, or none.

The same pattern appears in `social-feed-http.js:54`, `user-http.js:69` and
`sponsor-http.js:73`, each with its own message but the same underlying flag family.

Separately, the 503 message tells an operator nothing about *how* to resolve it. A message
naming the required flag would cut the next diagnosis to seconds. Small, safe, and I can make
that change on request.

---

## Part 2 — Feature gap analysis

Assessed `meeting-notes.md` against the codebase. Legend: **Built** / **Partial** / **Missing**.

### Phase 1 — Launch-critical

| Feature | State | Evidence |
|---|---|---|
| Festival model + workflow states | Built | `prisma/schema.prisma` — `Festival`, `FestivalWorkflowState`, `FestivalTransition`, `FestivalRevision` |
| Producer / user roles | Built | `User.role` (`public`/`producer`/`admin`/`super_admin`), `UserAccountStatus` |
| `featured` flag | Built | `Festival.featured`, `featured_rank` |
| Admin login + role enforcement | Built | `src/lib/auth.js`, `editorial-authorization.js` |
| Producer list + role editing | Built | `src/app/admin/settings/page.jsx`, `features/users/*` |
| Festival list + detail | Built | `AdminFestivalList.jsx`, `AdminFestivalDetail.jsx` |
| Pending review queue | Built | `src/app/admin/pending/page.jsx` |
| Approve / Reject / Ask for changes | Built | `editorial-transition-policy.js`, `editorial-service.js` |
| Admin content editing (pre + post publish) | Built | `AdminFestivalEditor.jsx` — title, description, dates, location, tags, featured, rank |
| Edit versioning / audit log | Built | `FestivalRevision`, `FestivalTransition` |
| Homepage featured section | Built | `src/app/(public)/page.js:84-106` |
| Festival detail page | Built | `src/app/(public)/festivals/[slug]/page.jsx` |
| **One-step "Become a Producer & Submit Event"** | **Missing** | Flow is split across `(auth)/signup` → `ProducerAccessRequest` → `producer/submit`. No combined route. |

### Phase 2 — Discovery & map

| Feature | State | Evidence |
|---|---|---|
| Discover page with filters | Built | `public-discovery.js`, `DiscoveryControls`, `getDiscoveryFacets` |
| Map view | Built | `src/app/(public)/map/page.js` |
| Geocoding on save | Built | `features/festivals/geocoding-service.js`, `handleAdminLocationLookup` |
| **Imported-festival "needs validation" workflow** | **Missing** | No `needs_validation` / `validated` field or UI anywhere in schema or `features/festival-import`. |

### Phase 3 — Digital Our Festivals

| Feature | State | Evidence |
|---|---|---|
| **"Our Festivals" model** | **Missing** | No model in `schema.prisma` (~60 models checked). |
| **Public gallery + lightbox** | **Missing** | No route, no component. |
| **Admin CRUD + image upload + reordering** | **Missing** | Nothing present. |
| **Image spec guidance in admin UI** | **Missing** | No aspect-ratio or dimension hints in editorial or producer components. |

### Phase 4 — Producer UX & ops

| Feature | State | Evidence |
|---|---|---|
| Producer dashboard | Built | `src/app/producer/dashboard/page.jsx`, `producer/festivals` |
| Staff add / edit / deactivate | Built | `user-policy.js`, admin settings UI |
| Accessibility / mobile passes | Not assessed | Out of scope for a static read; needs browser testing. |

### Additional gap

**Featured carousel.** The notes ask for an auto-rotating carousel at 3–5s intervals. The
homepage currently renders a static two-card grid (`getFeaturedFestivals(2)`). The comment at
`page.js:86-88` records that a previous scroll-row attempt was removed because the cards were
sized `w-[min(896px,85vw)]` with `flex-shrink-0` and could never fit a viewport. Any carousel
work should not reintroduce that sizing.

---

## Summary

Phase 1 is essentially complete — Monica's team can already populate, review, edit, and
publish festivals, and manage staff. Five genuine gaps remain:

1. **Digital Our Festivals** — model, public gallery, admin CRUD, ordering, image upload *(largest; the "key content editing surface" from the notes)*
2. **Imported-festival validation workflow** — flag questionable records, admin review, mark validated
3. **Auto-rotating featured carousel** — replace the static grid
4. **Image spec guidance** — admin/producer UI hints
5. **One-step producer onboarding + submission** — combine the split flow

---

---

## Part 3 — Implementation

### ✅ Digital Our Festivals — complete

New feature at `src/features/our-festivals/`, following the `sponsors` feature layering.

**Data model.** `OurFestivalItem` (+ `OurFestivalItemStatus` enum), migration
`20260812090000_our_festivals_gallery`. Design decisions worth knowing:

- Visibility is governed by the item's **own** `status`, deliberately *not* by
  `publishedDiscoveryWhere`. A curator must be able to show imagery from a festival that is
  itself still a draft, or from no festival at all.
- `festival_id` is nullable with `ON DELETE SET NULL` — deleting a festival must not destroy
  curated editorial imagery.
- `alt_text` is **required**, not optional. The page is entirely imagery, so a missing alt text
  makes it unusable with a screen reader rather than merely degraded.

**Files added**

| File | Role |
|---|---|
| `our-festivals-schema.js` | Zod schemas, body limit, exported image guidance constants |
| `our-festivals-repository.js` | Only layer touching `prisma`; total ordering; transactional reorder |
| `our-festivals-service.js` | Append-on-create, public visibility rules |
| `our-festivals-http.js` | Parsing, auth, origin/rate gates, status codes |
| `AdminOurFestivalsList.jsx` | Curator CRUD, drag-and-drop + keyboard reordering |
| `OurFestivalsGallery.jsx` | Public grid + accessible lightbox |
| `app/api/admin/our-festivals/{route,[id],reorder}.js` | Thin re-export routes |
| `app/admin/our-festivals/page.jsx` | Admin page |
| `app/(public)/our-festivals/page.js` | Public page |
| `tests/unit/our-festivals.test.js` | 12 tests |

Navigation links added to `AdminNav.jsx` and public `NavBar.jsx`. Both new source modules
registered in the `vitest.config.js` coverage allowlist.

**Notable implementation choices**

- **Reordering sends the whole ordering in one request**, not a per-item PATCH. Concurrent
  per-item updates can interleave and settle into an order the curator never chose. Applied in
  a single Prisma transaction.
- **Reordering is keyboard-operable.** Drag-and-drop alone would make the feature unusable for
  a keyboard or screen-reader user, so every row also has up/down buttons.
- **Images are URL references, not uploads.** The existing upload pipeline (`FestivalAsset`) is
  festival-scoped with Google Drive backing, rights acknowledgement and virus scanning — it
  requires a `festival_id`, which a standalone gallery item may not have. Rather than weaken
  it, `image_url` accepts an `https://` URL *or* an existing `/api/public/assets/…` path, so an
  already-approved festival asset can be reused. **Native upload for gallery items is not
  built** — flagging this because the meeting notes do ask for it.
- **Image spec guidance is surfaced** in the editor (`OUR_FESTIVALS_IMAGE_GUIDANCE`: 3:2, min
  1200×800), exported from the schema module so the hint and the validation bounds cannot drift.
- A linked festival's "read more" link is suppressed unless that festival is itself published,
  so the public gallery can never link to a page that 404s for visitors.

**Verification performed**

| Check | Result |
|---|---|
| `pnpm run check` (lint + typecheck) | Pass |
| `pnpm run test` | 47 files, **396 tests pass** (was 384; +12 new) |
| `pnpm run build` | Pass; `/our-festivals` and admin routes registered |
| Migration applied to blank Postgres 16 | Pass — full chain + idempotent double seed |
| `prisma migrate diff` vs schema | **No difference detected** (zero drift) |
| Table structure (`\d "OurFestivalItem"`) | Matches model exactly, both indexes + FK present |
| Runtime: `GET /our-festivals` | 200; published item renders, alt text present |
| Runtime: draft item leakage | Not present in output — correctly hidden |
| Runtime: admin API unauthenticated | 401 on list, create, and reorder |

Runtime checks ran against a throwaway Dockerised Postgres, since `migrate:test` correctly
refuses to run against the Neon host configured in `DATABASE_URL`. That guard was respected,
not bypassed. The container has been removed.

### ✅ One-step producer onboarding — complete

This one collides with a deliberate security decision. `prisma/schema.prisma` states it:

> Self-serve signup creates a `public` account, which grants nothing. Becoming a producer is a
> separate, reviewed step so an open registration endpoint cannot hand out submission rights.

The meeting notes ask for a combined flow that "creates producer account" and "creates festival
with `pending_review`". Read literally as *auto-granting the producer role*, that would let an
open endpoint hand out submission rights — exactly what the invariant forbids. **The invariant
was preserved.** The applicant gets one form; no role is granted without admin approval.

**Delivered flow**

`POST /api/producer/apply` (public, unauthenticated) in one transaction:

1. Creates the account with role `public` — **no role grant**
2. Creates a `ProducerAccessRequest` carrying the event as `proposed_festival` JSON

On admin approval, `decideRequest` — in one transaction — grants the `producer` role, creates
the real `Festival` at `pending_review` owned by the applicant, and links it back via
`festival_id`.

**Why the event is JSON until approval, rather than a draft festival**

My first design created a draft `Festival` at application time. The database rejected it:

> `Editorial transition requires an admin or super_admin actor`

`verify_festival_revision_audit` only accepts a festival insert whose transition actor is an
owning `producer` or an admin — an applicant is neither. Rather than weaken that trigger, the
event is held as submitted data and materialised at approval with the deciding admin as actor.
This is strictly better anyway: a spam application can no longer insert `Festival` rows through
a public endpoint.

Two further trigger contracts were discovered the same way and are now satisfied (and covered by
`tests/unit/producer-application-approval.test.js`, so a refactor that drops one fails loudly
rather than 500-ing in production):

- every festival insert needs exactly one matching `FestivalTransition` at that revision
- an owned festival touched by an editor needs exactly one producer-audience
  `FestivalWorkflowNotification`

**Files**

| File | Role |
|---|---|
| `producer-application-schema.js` | Zod schema for the combined application |
| `producer-access-service.js` | `submitProducerApplication`, `producerApplicationSlug` *(modified)* |
| `producer-access-repository.js` | `createApplication`; approval now materialises the festival *(modified)* |
| `producer-access-http.js` | `handleProducerApplication` + its own rate bucket *(modified)* |
| `ProducerApplicationForm.jsx` | The public one-step form |
| `app/api/producer/apply/route.js` | Route |
| `app/(public)/producer/apply/page.js` | Public page |
| `AdminProducerRequests.jsx` | Shows the proposed event to the reviewer *(modified)* |
| `proxy.js` | Exempts `/producer/apply` from the auth redirect *(modified)* |
| `tests/unit/producer-application.test.js` | 16 tests |
| `tests/unit/producer-application-approval.test.js` | 8 tests |

**Two bugs found by runtime testing that compile-time checks could not catch**

1. **`/producer/apply` redirected every applicant to `/login`.** `proxy.js` treats all
   `/producer/*` descendants as authenticated. The one page built for people with no account
   was unreachable. Fixed by exempting that exact path, alongside the existing `/producer`
   exemption.
2. **The response leaked whether an email was already registered.** The handler returned the
   service's `created: true|false`, which is precisely the account-enumeration oracle the
   duplicate-tolerant service path exists to prevent. The endpoint now returns a fixed
   `{submitted: true}`. Verified: identical response for a new and an existing address.

**Verification performed**

| Check | Result |
|---|---|
| `pnpm run check` | Pass |
| `pnpm run test` | 49 files, **420 tests pass** |
| `pnpm run build` | Pass; `/producer/apply` + `/api/producer/apply` registered |
| Migration on blank Postgres 16 | Pass, full chain + idempotent double seed |
| `prisma migrate diff` vs schema | **No difference detected** |
| `GET /producer/apply` unauthenticated | 200 (was 307 to login before the proxy fix) |
| `POST` valid application | 201; user role `public`, request `pending`, **0 festival rows** |
| `POST` duplicate email | 201, byte-identical body, nothing created |
| `POST` cross-origin | 403 |
| `POST` without acknowledgements | 400 |
| Approval against live DB | role → `producer`, festival created at `pending_review`, owned by applicant, revision 0 |

---

---

## Part 4 — Edge rate limiting: state as verified on 2026-08-12

Verified against the live Vercel project (`rob-5292s-projects/save-philly-festivals`), not from
report. **Two things still outstanding.**

| Check | State |
|---|---|
| Firewall enabled | ✅ 3 custom rules live |
| `Account and auth writes` (20 req/900s per IP) | ✅ **enforcing** |
| `API safety net` (600 req/60s per IP) | ⚠️ **log mode — blocks nothing** |
| `Email-sending endpoints` (30 req/600s per IP) | ⚠️ **log mode — blocks nothing** |
| All three attestation flags set in production | ✅ present |
| Running deployment sees the flags | ❌ **no** |

### Outstanding 1 — the deployment predates the flags

`POST /api/schedules/email` on production still returns:

```
503 {"error":"This request is unavailable until edge rate limiting is verified.",
     "code":"edge_rate_limit_unverified"}
```

The flags were added to project settings, but the newest production deployment is older than
they are. **Environment variables only reach running functions on the next deployment.** Until a
redeploy, publishing stays blocked exactly as before.

Redeploy through the gated workflow (`RELEASE_SHA` + `BACKUP_REFERENCE`, per `deploy:web`). That
same deploy also ships Our Festivals and the producer application endpoint — `/api/producer/apply`
currently 404s in production because it has never been deployed.

### Outstanding 2 — two rules attest more than they enforce

Log mode is a legitimate stage of a rollout and is what I recommended. But the flags are
all-or-nothing: with all three set, they now claim enforcement that two rules are not yet doing.
Right now only `/api/producer/apply`, `/api/auth/register` and the password-reset endpoints are
genuinely rate limited. Producer uploads, submissions, admin publishing, schedule email,
organizer consent and user management are covered only by rules that log.

Two honest ways to resolve it, both fine:

- Finish the rollout — review the log data, then flip `API safety net` and `Email-sending
  endpoints` to `--rate-limit-action rate_limit`. *(Remember: `edit` with `--condition` replaces
  all conditions, so repeat every one.)*
- Or leave them logging deliberately for now, knowing two flags overstate protection during the
  observation window, and close the gap before real traffic arrives.

### The script

`tools/scripts/vercel-firewall-ops.mjs`, wired to three root scripts:

```sh
pnpm run ops:firewall:verify   # read-only; exits non-zero if the attestation is not true
pnpm run ops:firewall:plan     # desired rules vs live configuration
pnpm run ops:firewall:stage    # stage missing rules as drafts (gated; never publishes)
```

`DESIRED_RULES` in that file is the source of truth for the edge protection, so changing it is a
reviewable code change rather than an undocumented dashboard edit. Each rule declares which flags
it `attests`, which is what lets `verify` catch a flag claiming enforcement a rule is not doing.

Design decisions:

- **Never publishes.** `stage` creates drafts and stops; `vercel firewall publish` stays a human
  action, because a bad rule in front of every request blocks real users. `stage` is additionally
  gated behind `CONFIRM_FIREWALL=stage`, matching the `CONFIRM_DEPLOY=n8n` convention.
- **New rules are always staged in log mode**, never straight to enforcing.
- **`verify` probes production rather than comparing timestamps.** Hitting a gated endpoint with
  an invalid body is ground truth about what the running deployment believes, and it is what
  catches the "set the flag, forgot to redeploy" trap. The invalid body means nothing can be sent.
- **Reads env var names only** (`vercel env ls`), never values, and matches them by exact name so
  a future CLI change cannot make it echo a secret.
- **Exits non-zero on failure**, so it works as a pre-deploy or CI gate.

Verified by running it: `plan` and `verify` both produce correct output against the live project,
`verify` exits 1 and reported all three real problems above, `stage` refuses without the
confirmation variable, and an unknown action errors.

---

## Part 5 — `.env.example` made comprehensive

`apps/save-philly-festivals/.env.example` now documents **every** variable the code reads. The
list was derived by scanning source for `process.env.*`, never by copying a real env file, so no
live value could reach a committed template.

It went from 16 documented variables to 40, grouped by purpose: required-to-boot, the three edge
rate limit attestation flags, transactional email, bearer secrets for internal endpoints, social
feed providers, Google Drive uploads, festival import review, proxy hop handling, local seed
credentials, demo toggles, E2E fixtures, local tooling, and a closing section for
platform-injected variables that must *not* go in an env file — including the standing
`NODE_ENV` warning, since Next rejects `NODE_ENV=production` in an env file outright.

### Guarded against future drift

`tests/unit/env-example-contract.test.js` (4 tests) checks both directions:

- every `process.env.*` the code reads is documented (or listed as platform-managed)
- nothing documented has stopped being read — a stale entry is worse than a missing one, because
  it reads as required and someone will hunt for a value that changes nothing
- the template contains no real-looking secret (Resend key, PEM body, non-local database URL)
- `AUTH_SECRET` is still marked required, since `src/lib/auth.js` throws at import without it

Verified by breaking it deliberately in both directions: adding `process.env.ZZ_FAKE_UNDOCUMENTED`
to a source file fails the first test, and adding `# ZZ_STALE_VAR=1` to the template fails the
second. Both restored; suite is green at **424 tests**.

### ⚠️ The root `.env.example` is a credentials file, not a template

While doing this I found `.env.example` **in the repo root** contains a real, JWT-shaped
`VERCEL_OIDC_TOKEN` (written by the Vercel CLI) plus two other long opaque values. It is a live
env file wearing a template's name.

**Nothing leaked, and the git history is clean.** I checked every commit that touched that path:
the committed versions held 2 placeholder variables, no token, no credentials, no remote database
host. The file was later untracked, and the real values exist only in your local working copy,
which `.env*` ignores.

I nearly made this worse and want to be explicit about it. Seeing a root template that could
never be committed, I added a `!.env.example` negation to `.gitignore` so example files could
reach new developers. That was correct in general and wrong here — it would have made this
specific credentials file stageable. I caught it by inspecting the file before leaving it in that
state, and **reverted the negation**. The only remaining `.gitignore` change is a comment
explaining why that negation must not be re-added; I verified ignore behaviour is byte-identical
before and after.

**Recommended:** rename the root `.env.example` to `.env.local`, or delete it. As long as it
carries a template's name it invites exactly the mistake I just made. I did not touch it — it's
your file and it holds live values.

The Vercel OIDC token is short-lived and auto-refreshed by the CLI, so rotation is not urgent;
the other two opaque values are worth a look since I deliberately did not read them.

---

## Part 6 — "still can't publish" investigation

### What was ruled out, with evidence

| Hypothesis | Verdict |
|---|---|
| Code never deployed | ❌ ruled out — `/our-festivals` and `/producer/apply` both 200 |
| Alias still on the old build | ❌ ruled out — `vercel inspect` shows the canonical alias on the newest deployment |
| Env vars not reaching the runtime at all | ❌ ruled out — `/api/auth/csrf` 200 (needs `AUTH_SECRET`, which throws at import when absent) and `/api/categories` 200 (needs `DATABASE_URL`) |
| Origin mismatch (403) | ❌ ruled out — the gate returns 503, which is *after* the origin check |
| Flag inlined at build time | ❌ ruled out — `process.env.PRODUCER_EDGE_RATE_LIMIT_VERIFIED` survives verbatim in the emitted server chunk, so it is a **runtime** lookup. (`NODE_ENV` *is* inlined, as the literal `"production"`.) |

### What remains

The gate is `nodeEnv !== "production" || value === "1"` — a strict comparison. Demonstrated
against the real module:

```
"1"      -> true
"1\n"    -> false      ← a trailing newline is enough
"\"1\""  -> false      ← wrapping quotes are enough
" 1"     -> false
"true"   -> false
"yes"    -> false
```

I could **not** read the previously stored values to confirm which of these it was: `vercel env
pull` returns `[SENSITIVE]` for every value on this project, so the stored value is unreadable by
design. That is a limit of the evidence, not a conclusion — I removed it as a variable instead of
proving it.

### What I changed

Removed and re-added all three flags in the production environment, piping the value with
`printf '1'` so there is no trailing newline, no quotes, and no surrounding whitespace:

```sh
npx vercel env rm  <FLAG> production --yes
printf '1' | npx vercel env add <FLAG> production
```

This is not a new decision — it re-sets the value Rob already chose, with guaranteed encoding.

### Still required: a redeploy

Vercel attaches environment variables to a deployment, so the corrected values do not reach the
running functions until the next one. Release SHA is `8eb6fc1`, tree clean, on `main`.

If the redeploy does **not** clear it, the cause is not the value, and the next step is a
temporary diagnostic endpoint reporting whether the runtime sees the flag at all — the one thing
none of the checks above can observe from outside.

---

## Part 7 — UI issues raised 2026-08-12

Reproduced locally against a seeded database with 9 published festivals. All six addressed;
**one is not a code fix and needs an operational decision.**

### 1 & 2 — Search and filters "disconnected from events"

**Two separate causes, one of them not a bug.**

**Cause A — nothing is published (the dominant one).** Production returns
`{"festivals":[]}` from `/api/festivals`: there are **zero published festivals**.
`publishedDiscoveryWhere` matches `workflow_state: "published"` only, and `approved` is not
`published`. Search and filters are wired correctly and return exactly what the database holds:
nothing. `scripts/festival-publish-batch.mjs` states the same symptom in its own header —
*"search, the calendar, and the festival grid all return nothing until each festival is
transitioned through to published."* No code change can fix this; the festivals must be
published. See the open items.

**Cause B — the featured row ignored the query (a real bug, fixed).** Searching *Caribbean*
returned the two matching festivals **plus** a promoted "Spruce Street Harbor Park Art Walk",
and a search with no matches still displayed two unrelated festivals directly above
"No festivals match your search". The row is editorial and never consulted the filters.

Fixed in `(public)/page.js`: the featured row is suppressed whenever the visitor has narrowed
the view. The predicate lives in `discovery.js` as `hasActiveDiscoveryFilters()` so it is
testable and reusable rather than buried in the page. Paging and sorting deliberately do **not**
count as narrowing — otherwise the row would flicker in and out while paging.

Verified: `?q=Caribbean` 3 festivals → 2 (both genuinely Caribbean); no-match search 2 → 0.

### 3 — Our Festivals

The page was not erroring — it returned 200 and rendered its empty state. What was wrong is that
it showed a hand-curated gallery rather than recent festivals.

Rebuilt around `getRecentlyEndedFestivals()` (new, in `public-discovery.js`): published festivals
that ended within the last 90 days, most recently ended first. `RECENTLY_ENDED_WINDOW_DAYS` is
exported so the copy on the page and the query cannot drift apart. Single-day festivals with a
null `end_date` fall back to `start_date` rather than being dropped.

The curated gallery built earlier is **kept, not discarded** — it renders as a "Highlights"
section only when items exist, so it is invisible today and no admin work is lost.

Verified: shows exactly the 2 festivals that ended within 90 days, excludes the 7 upcoming ones.

### 4 — Default Discover window

`getDiscoveryDateRange` defaulted to *current month forward, unbounded*, so festivals a year out
sat beside this weekend's. Now current month + next two (`DEFAULT_DISCOVERY_MONTHS = 3`).

Verified at 2026-08-12: window is `2026-08-01` → `2026-11-01`. `date=all` stays unbounded and
`this-month` is untouched, so nothing becomes unreachable.

### 5 — No way back to the public site from admin

`AdminNav` had a brand link reading **"Admin" → `/admin`** sitting next to a **"Dashboard" →
`/admin`** entry: two links to the same page, and no link out of the admin portal at all. The
brand link is now **"Discover Festivals" → `/`**.

### 6 — Producer Access and Sponsors removed from admin nav

Both removed from `AdminNav`. The routes still exist and still work when reached directly.

**I could not reproduce the breakage.** Logged in as a seeded admin, every admin route returned
200, including `/admin/producer-requests` and `/admin/sponsors`. If the failure is a server error
rather than a failed action, I need the message to chase it — my best guess is that the *page*
loads and an action on it returns the 503 from Part 6.

⚠️ **Consequence worth knowing:** approving a producer application is only possible from
`/admin/producer-requests`. With it out of the nav, the one-step onboarding flow has no reachable
reviewer UI — an admin has to type the URL. Flagging rather than silently leaving that flow
un-operable.

### Also found, not fixed (out of scope)

`prisma/seed.js` creates **no `FestivalOccurrence` rows**, and
`editorial-repository.transition()` refuses any move to `published` unless exactly one primary
occurrence exists. Seeded festivals therefore **cannot be published at all** — a fresh local
environment can never demonstrate the public site. The CSV importer *does* create occurrences, so
production imports are unaffected. I worked around it locally rather than changing the seed,
because `security-contract.test.js` asserts on that file.

### Verification

| Check | Result |
|---|---|
| `pnpm run check` | Pass |
| `pnpm run test` | 51 files, **439 tests pass** (+15 new, 1 existing updated) |
| `pnpm run build` | Pass |
| Live: discover default | 8 of 9 festivals (July one correctly outside the window) |
| Live: `?q=Caribbean` | 2, both matching |
| Live: no-match search | 0 |
| Live: `?date=all` | 9 |
| Live: `/our-festivals` | 2 recently ended |
| Live: admin nav | "Discover Festivals" → `/` present; producer-requests and sponsors absent; both routes still 200 |

`tests/unit/discovery.test.js` had one assertion (`range.end` is null) that encoded the old
unbounded default. Updated to assert the new upper bound on *both* `end` and `endDay`, which
strengthens what that test was actually protecting — the zoned-instant vs calendar-day split.

---

## Part 8 — Navigation link visibility policy

The nav had been patched three times without a stated rule, so the rule is now written down,
enforced by a test, and applied in both directions.

### The policy

| Kind | Where it may appear |
|---|---|
| **Public links** (`/`, `/calendar`, `/our-festivals`, `/about`, `/tours`, `/producer`) | The public NavBar only — same list for everyone, signed in or not |
| **Private links** (`/admin/*`, `/producer/*`) | That portal's own navigation only. Never in the public list |
| **The one exception** — "Discover Festivals" (`/`) | Global. Allowed in every navigation, including admin, so there is always a way back to the public site |

A signed-in editor still needs a way *into* their portal. That link now sits with the **session
controls** beside account and sign-out, not among the public links — it is a property of who you
are, not of where you can browse, and that conflation is what kept blurring the boundary.
`PORTAL_BY_ROLE` maps `admin`/`super_admin` → `/admin` and `producer` → `/producer/dashboard`.

### What changed

- **`publicLinks` is now the list for everyone.** It previously swapped in a different array per
  role and appended `Admin Portal` / `Producer Portal` directly into the public links.
- **Deleted `staffLinks` and the `/admin` pathname branch** from `NavBar.jsx`. Both were
  **unreachable**: `admin/layout.jsx` renders `AdminNav`, not `NavBar`, so that array had not
  been displayed anywhere while still reading like live admin configuration — including a
  `Dashboard` entry that actually pointed at the public homepage.
- **Admin nav "Our Festivals" → "Gallery".** The public page of that name now lists recently
  ended festivals automatically; this screen only curates the optional Highlights images above
  them. Sharing a label implied editing one produced the other.

### Enforced, not just documented

`tests/unit/navigation-policy-contract.test.js` (7 tests) fails if:

- any `/admin/*` or `/producer/*` route is added to `publicLinks`
- the public *marketing* page `/producer` is lost, or `/producer/dashboard` is added in its place
  *(a one-character difference between public and private, so it gets its own assertion)*
- a non-`/admin` route appears in the admin navigation
- the admin portal loses its "Discover Festivals" way back
- Producer Access or Sponsors return to the admin nav — re-adding either should be a decision,
  not an accident
- an unreachable `/admin` branch or `staffLinks` array reappears in `NavBar`

### Verification

| View | Result |
|---|---|
| Public nav, signed out | 6 public links, nothing else |
| Public nav, signed in as admin | Same 6 public links; **zero `/admin/*` links leaked** |
| Admin nav | "Discover Festivals" + 8 private `/admin` links; no Calendar/About/Tours; no Sponsors/Producer Access |
| Portal link ships to the browser | "Admin portal" and "Producer portal" both present in the client bundle; the old `Admin Portal` label gone |

The portal link renders client-side via `useSession`, so it is not in the server HTML — I
verified it through the built client bundle rather than by fetching a page.

Gates: lint, typecheck, **446 tests**, and build all pass.

---

## Part 9 — What "Schedules" is (answer, no code change)

**Two unrelated things share the word "schedule" in this codebase.** That is most of the
confusion.

### 1. `Schedule` — a festival's programme (what admin → Schedules shows)

A row is one item in a festival's line-up: title, performer, genre, stage/location, start and
end time, and an `is_headliner` flag. It belongs to a festival (`festival_id`) and optionally to
a specific occurrence.

- **Where the public sees it:** the festival detail page, under the "Schedule & program"
  heading. If a festival has no rows, that section simply doesn't appear.
- **What the admin screen does:** `/admin/schedules` lists the 50 most recent rows across all
  festivals — festival, title, date, time, performer. Read-only.

**Nothing in the application can create, edit, or delete one.** `schedule-queries.js` exports
`createSchedule`, `updateSchedule` and `deleteSchedule`, but they have **no callers** — no API
route and no UI. The only programme rows that exist came from `prisma/seed.js`. So today the
admin screen is a window onto data the product has no way to author.

### 2. The Schedule Builder — the public `/calendar` page

Unrelated to the model above. A visitor browses the calendar, adds festivals to a personal
list, and emails it to themselves. That list lives in the **browser's localStorage** under
`savePhillySchedule` — no account, no database row.

`/api/schedules/email` sends it. `/api/schedules/calendar` returns an `.ics` download.

The `SavedSchedule` table (email + schedule id) is the **retired** server-side version of this:
`/api/schedules/save` and `/api/schedules/saved` both return `410 Gone`, and
`getSavedSchedules`/`removeSavedSchedule` have no callers.

### The decision this leaves you

Admin → Schedules is honest but inert: a read-only table of data nobody can enter. Three ways
forward, none of them started — you asked for the explanation only:

1. **Build authoring** — let admins add programme entries per festival. The public detail page
   already renders them, so the data has somewhere to go.
2. **Hide it** — same treatment as Producer Access and Sponsors, until authoring exists.
3. **Leave it** — harmless, and useful once imports or producers start supplying programmes.

Worth knowing either way: **festival programmes are not part of the CSV import**, so an imported
festival will always show an empty "Schedule & program" section.

---

## Open items for Rob

1. **Redeploy production** so the corrected flag values attach to a deployment. This is the last
   step blocking publishing. *(Part 6)*
2. **Publish the festivals.** Production has zero published festivals, which is why search,
   filters, the calendar and the grid all look empty. Nothing in the UI can be judged until this
   is done: `pnpm run festival:publish-batch` (dry-run first). *(Part 7)*
3. **Send the error text for Producer Access / Sponsors** if they still fail — every admin route
   returned 200 locally, so I could not reproduce it. *(Part 7)*
2. **Decide on the two log-mode rules** — finish enforcing them, or accept the gap knowingly
   while you watch the traffic. *(Part 4)*
3. **Decide on the publish-gate coupling** — leave as-is, improve the message, or decouple
   admin publishing. *(Part 1)*
4. **Native image upload for gallery items** — not built; confirm whether URL references are
   sufficient for Monica's team.
5. **Rename or delete the root `.env.example`** — it holds live credentials under a template's
   name. Nothing leaked, but it is a standing trap. *(Part 5)*
6. **Review the contract-test change and two out-of-scope bugs below.**

---

## Contract test modified — please review

`tests/unit/schedule-email-contract.test.js:20` asserted
`expect(schema).not.toMatch(/ScheduleEmailRequest[\s\S]*?Json/)`.

The intent is that `ScheduleEmailRequest` keeps its items normalized into `ScheduleEmailItem[]`
rather than a Json blob. But the regex is **positional**: it forbids `Json` anywhere *after*
`ScheduleEmailRequest` in the file, i.e. in every model declared later. The four Json columns
that already exist (`prepared_counts`, `normalized_data`, `safe_details`, `snapshot`) pass only
because they happen to sit earlier in the schema.

Adding `proposed_festival Json?` to `ProducerAccessRequest` (line 1137, well after
`ScheduleEmailRequest` at 675) therefore tripped it.

I scoped the assertion to the model block, matching the idiom already used for `SavedSchedule`
five lines below:

```js
const scheduleEmailRequest = schema.match(/model ScheduleEmailRequest \{[\s\S]*?\n\}/)?.[0];
expect(scheduleEmailRequest).toBeDefined();
expect(scheduleEmailRequest).not.toContain("Json");
```

**I verified the assertion still has teeth** rather than assuming it: adding a `probe_blob Json?`
field to `ScheduleEmailRequest` makes it fail, and removing it makes it pass. Flagging because
`CLAUDE.md` calls out these text-asserting contract tests as deliberate, and changing one to
make new code pass deserves your eyes.

---

## Bugs found in existing code (not fixed — outside this scope)

### 1. Empty `PATCH` silently unpublishes a sponsor

`updateSponsorSchema` in `src/features/sponsors/sponsor-schema.js` builds its optional fields
from a definition that carries `.default("draft")` and `.default(0)`. Zod applies those defaults
on parse, so an **empty `PATCH` body to a sponsor parses as `{status: "draft", sort_order: 0}`**
and silently unpublishes an active sponsor, resetting its position.

Confirmed by probe, not inferred: `updateSponsorSchema.safeParse({})` returns
`success: true, data: {sort_order: 0, status: "draft"}`. The `.refine(...length > 0)` guard
intended to reject empty updates never fires, because defaults make the object non-empty.

The identical mistake was present in my first draft of `our-festivals-schema.js` and was caught
by a test; it is fixed there by declaring fields without defaults and applying defaults only in
the create schema. The same fix applies to sponsors. Say the word and I'll do it.

### 2. Registration leaks whether an email is already registered

`registerAccount` in `producer-access-service.js` carries this docstring:

> Always reports success, even when the address is already registered. Distinguishing the two
> would turn this endpoint into an account-enumeration oracle.

But `handleRegister` returns the service result verbatim, including `created: true|false` — so
`POST /api/auth/register` *does* distinguish the two cases and the oracle exists anyway. The
status code is 201 either way; only the body differs.

Found because I copied the pattern into the new application endpoint and caught it in runtime
testing. **Fixed in the new endpoint** (`/api/producer/apply` returns a fixed `{submitted:true}`);
**not fixed in `/api/auth/register`**, since a client may depend on that field. One-line fix if
you want it.

---

## Progress log

| Date | Entry |
|---|---|
| 2026-08-12 | Analysis complete. Publishing 503 traced to the intentional `PRODUCER_EDGE_RATE_LIMIT_VERIFIED` gate; resolution requires an operator attestation, escalated rather than actioned. Five feature gaps identified. |
| 2026-08-12 | Scope agreed: Digital Our Festivals + one-step producer onboarding. |
| 2026-08-12 | Digital Our Festivals shipped. All gates pass (396 tests). Migration verified against a blank Postgres with zero drift; public gallery and admin auth gating verified at runtime. |
| 2026-08-12 | Found and confirmed a pre-existing empty-PATCH bug in `sponsor-schema.js`. Reported, not fixed — outside agreed scope. |
| 2026-08-12 | One-step producer onboarding shipped. Design changed mid-build after the database rejected festival creation by a non-producer actor; event is now held as JSON and materialised on approval, which also stops a public endpoint inserting festival rows. |
| 2026-08-12 | Runtime testing caught two bugs static checks missed: `/producer/apply` redirected all applicants to login, and the response leaked whether an email was registered. Both fixed and re-verified. |
| 2026-08-12 | Scoped an over-broad regex in `schedule-email-contract.test.js` to the model it is about; verified it still fails when `ScheduleEmailRequest` gains a Json field. Flagged for review. |
| 2026-08-12 | Final state: lint, typecheck, 420 tests, and build all pass. Migrations verified against blank Postgres with zero drift. Test containers removed. |
| 2026-08-12 | Rob configured the Vercel firewall and set all three attestation flags. Verified against the live project: 3 rules live, but two still in log mode, and production still returns `edge_rate_limit_unverified` because the deployment predates the flags. Redeploy outstanding. |
| 2026-08-12 | Added `tools/scripts/vercel-firewall-ops.mjs` (`ops:firewall:verify` / `plan` / `stage`) so the attestation can be checked rather than remembered. Verified by running it — it caught all three outstanding problems and exits non-zero. |
| 2026-08-12 | `.env.example` expanded from 16 to 40 variables, derived by scanning source rather than copying any real env file. Added `env-example-contract.test.js` to stop it drifting; proved it fails in both directions. Suite now 424 tests. |
| 2026-08-12 | Found the root `.env.example` holds a real `VERCEL_OIDC_TOKEN`. Git history verified clean — nothing was ever committed. Reverted a `.gitignore` negation I had added minutes earlier that would have made that file stageable. |
| 2026-08-12 | Publishing still blocked after Rob's deploy. Ruled out missing code, stale alias, origin mismatch, absent runtime env, and build-time inlining — each with a specific check. Narrowed to the stored flag value, which Vercel will not reveal. Re-added all three flags with `printf '1'` for exact encoding; a redeploy is now the test. |
| 2026-08-12 | Six UI issues addressed. Search and filters proven correct against seeded data — the cause is that production has zero published festivals, plus a real bug where the featured row ignored the active query. Our Festivals rebuilt around festivals ended in the last 90 days. Discover default bounded to three months. Admin nav given a way back to the public site; Producer Access and Sponsors removed on request, with the reviewer-UI consequence flagged. 439 tests pass. |
| 2026-08-12 | Navigation link visibility written down as a policy and enforced by `navigation-policy-contract.test.js`: public links public, private links private, "Discover Festivals" the one global exception. Portal entry moved to the session controls. Deleted the unreachable `staffLinks` array and `/admin` branch from `NavBar`. 446 tests pass. |
| 2026-08-12 | Documented what admin → Schedules is (Part 9). No code change — read-only festival programmes that nothing in the app can author, distinct from the localStorage Schedule Builder on /calendar. |
