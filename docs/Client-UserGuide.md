# Philly Fests — Client User Guide

**Audience:** Simran Kaur (`skaur@pratt.edu`), Mengqi Cao (`mcao13@pratt.edu`), Uraiba Zafar (`uzafar@pratt.edu`), Iris Sun (`wsun16@pratt.edu`)
**Scope:** Features F-01 through F-09 in `docs/Features.md`, plus the audited festival CSV importer
**Authoritative time zone:** `America/New_York`
**Status:** Application features implemented and accepted. Several external provider integrations are configured but intentionally switched off and will stay off until the owners named below complete the activation steps in section 7.

This guide describes what the software actually does today. It does not describe a live production website. Nothing in this document should be read as a statement that the site, its email sending, its social feeds, or its data import are running in production.

---

## 1. What the site does today

Philly Fests is a Philadelphia festival discovery site with three connected parts:

1. **A public site** where anyone can search festivals, read festival pages, build a personal schedule in their own browser, email that schedule to themselves, and download it as a calendar file.
2. **A private producer area** where a signed-in festival organizer creates a draft festival listing and submits it for review.
3. **A private editorial/admin area** where Philly Fests staff review submissions, move them through a controlled approval workflow, publish or unpublish them, moderate social posts, and manage user accounts.

Everything a visitor can see in public is limited to festivals an editor has explicitly **published**. Drafts, pending submissions, approved-but-not-yet-published festivals, rejected festivals, and imported records are never publicly visible.

### Audiences

| Audience | Who they are | Where they work | Account needed? |
|---|---|---|---|
| Visitor | Anyone browsing festivals | `/`, `/calendar`, `/festivals/<slug>`, `/about`, `/tours`, `/privacy`, `/terms` | No |
| Producer | A festival organizer submitting a listing | `/producer` (info), `/producer/dashboard`, `/producer/submit`, `/producer/festivals` | Yes — verified account with the `producer` role |
| Editor / Admin | Philly Fests staff | `/admin`, `/admin/festivals`, `/admin/festivals/<id>`, `/admin/settings` | Yes — `admin` or `super_admin` role |
| Super admin | Staff who manage privileged accounts | `/admin/settings` | Yes — `super_admin` role |
| Integration operator | The technical owner who eventually turns on external providers | Deployment secrets, N8N, runbooks in `docs/` | Yes, plus separate activation approval |

---

## 2. Visitor guide

No account is ever required for anything in this section.

### 2.1 Finding festivals (`/`)

The home page is the discovery page. It is server-rendered, and every filter you choose is written into the page URL, so a filtered result can be bookmarked, shared, or reached with the browser Back button.

| Control | What it does | URL parameter |
|---|---|---|
| Search box | Matches festival name, description, location, city, and category name | `q` |
| Date | `Any date`, `Next 7 days`, `This month`, `Next month`, `Custom range` | `date` |
| Start date / End date | Custom range boundaries (`YYYY-MM-DD`) | `start`, `end` |
| Category | Populated from the categories on currently published festivals | `category` |
| Neighborhood or location | Free-text with suggestions from published festivals | `location` |
| Sort results | `Relevance` (only offered when there is a search term), `Soonest`, `Newest`, `Name` | `sort` |
| Apply / Clear | Submits the form, or returns to an unfiltered `/` | — |

Notes that matter in practice:

- **Default sort** is `Soonest`. If a search term is present, the default becomes `Relevance`.
- **Date filtering uses overlap**, so a multi-day festival that merely crosses into the requested window is included rather than dropped.
- **Pagination** shows 24 festivals per page with `Previous` / `Next` links and a "Page X of Y" indicator. Filters are preserved as you page.
- The results heading shows a live count such as "12 festivals found".
- If nothing matches, you get a "No festivals match your search" panel with a **Clear all filters** link.
- If the database cannot be reached, you get a "Festival listings are temporarily unavailable" message instead of a broken page.
- The first two results are also shown as larger "Featured" cards above the About section.
- A `Calendar` link in the view switcher goes to `/calendar`. The `Map` view is shown as unavailable — it is not implemented.

Example shareable URL: `/?q=jazz&date=next-month&sort=soonest&page=2`

### 2.2 Festival detail pages (`/festivals/<slug>`)

Each published festival has a stable public page. A festival that is not published (or a slug that does not exist) returns a normal "not found" page.

The page shows, when the data exists: a hero image or a "Festival photo coming soon" fallback, category badges, name, description, dates and times, location and address, an official website link, official social channel links, optional Story / Mission / History sections, tags, and the program of individual events. Missing optional content produces a written fallback ("Category to be announced", "Official website coming soon", "No official social channels listed.", "Tags to be announced", "Program details are coming soon.") rather than an empty or broken section.

Two save buttons are available:

- **Save the whole festival** — in the page header.
- **Save an individual program event** — on each program item.

If a moderated social feed is enabled and has approved posts, it appears **below** the official social channel links, so the organizer's own accounts are always the first thing a visitor sees.

**Canceled festivals** that were previously published remain reachable at their URL and display a red "Canceled" tombstone with the editor's public cancellation message. On a canceled page, the schedule/save actions, website link, social channels, and social feed are all hidden, and the program section says schedule actions are unavailable.

### 2.3 Building a schedule (`/calendar`)

The Calendar page is the schedule builder. It lists published festivals grouped by date, with a month widget and a search/filter bar, and a **Schedule Builder** panel (in the left sidebar on desktop, above the results on mobile).

How saving works:

- Your selection lives **only in your own browser**, under the local-storage key `savePhillySchedule`. There is no account and nothing is sent to the server just by saving.
- Only non-sensitive identifiers are stored — the item type (`festival` or `event`) and its ID. **Your email address and any consent record are never written to browser storage.**
- The panel states this directly: *"Your schedule is saved only in this browser on this device and may be removed when browser data is cleared."*
- Saving the same item twice does not create a duplicate. A whole festival and one of its individual events count as two distinct selections, which is intentional.
- Removing an item uses the ✕ button on its row. **Clear all** empties the schedule after a confirmation prompt.
- If two saved events overlap in time, you get a yellow **Time overlap warning**. It is a warning only — both items stay saved.
- If a saved item is no longer published, it is shown as an "Unavailable festival/event" row you can remove. It does not break the page.
- Corrupted or unrecognized stored data is discarded safely and the schedule resets rather than failing.

### 2.4 Emailing a schedule

In the Schedule Builder panel, enter an email address under **Email this schedule** and press **Email schedule**.

- This is a **transactional** message. The help text says so: *"Send every saved item to your inbox. This is transactional and does not sign you up for marketing."*
- The server re-checks every saved ID and includes only festivals and events that are currently published. Items that are no longer available are reported as omitted, e.g. *"Schedule emailed. 2 unavailable selections were omitted; your saved schedule remains intact."*
- Retrying the same address with the same selection will not send a duplicate; the request carries an idempotency key.
- If delivery fails you get an honest error, and **your saved schedule is never changed, cleared, or duplicated** by a failed send.
- Because production email sending is not activated (see section 7), a send attempt in an unconfigured environment reports a delivery failure rather than silently pretending to succeed.

### 2.5 Exporting to Google, Apple, or Outlook calendars

Press **Export to Calendar** in the Schedule Builder. The server generates the file and the browser downloads `philly-fests-schedule.ics`.

To import it:

| Calendar app | Steps |
|---|---|
| Google Calendar | Settings → Import & export → Import → select `philly-fests-schedule.ics` → choose a calendar → Import |
| Apple Calendar (macOS/iOS) | Open the downloaded `.ics` file → choose the calendar to add it to → OK |
| Outlook (desktop or web) | File → Open & Export → Import/Export → Import an iCalendar (.ics) file, or on the web: Calendar → Add calendar → Upload from file |

What to expect:

- One calendar entry per saved item, in the order you saved them, using Philadelphia time (`America/New_York`). Timed events are written as precise instants, so summer/winter and daylight-saving changes do not shift them.
- **All-day end dates are exclusive.** This is how the iCalendar standard works, and every major calendar app applies it. A one-day August 8 festival is written with an end of August 9; an August 8–10 festival is written with an end of August 11. Both display correctly in Google, Apple, and Outlook. If you inspect the raw file you will see the "extra" day — that is correct, not a bug.
- Entries carry a stable identifier, the canonical Philly Fests page URL, a status, a busy/free flag, a last-modified stamp, and a sequence number, so re-importing updates rather than duplicating in calendar apps that honor those fields.
- A festival that was published and later canceled exports with a `CANCELLED` status and shows as free time.
- **The export is a snapshot.** The panel states: *"Calendar exports are snapshots and do not update automatically if festival details change."* If a festival moves, re-export.
- Exporting an empty schedule is blocked — the button is disabled until you have saved at least one item.
- Unavailable selections are silently omitted from the file and reported in the on-screen confirmation. Your saved schedule is unchanged either way.
- Reminders/alarms are deliberately not added. Unsolicited reminders were judged intrusive; adding them would require an explicit user preference in a later increment.

### 2.6 Optional organizer marketing emails

Below the email form there is a separate section, **Optional organizer emails**.

- It is genuinely separate. You can email your schedule and export your calendar with every consent box unchecked.
- Nothing is pre-selected. The on-screen text says: *"Separately choose which authorized organizers may email you. Nothing is selected by default."*
- Only organizers of currently published festivals **that have an enabled and authorized integration** are offered. If none of your saved festivals has one, the section is empty and disabled.
- You must explicitly pick the named organizers, pick at least one preference (`Reminders`, `Updates`, `Discovery`), and tick the disclosure acknowledgment.
- The server re-checks everything, records versioned evidence of exactly what you agreed to, and queues one request per authorized organizer. Consent is stored on the server, never in your browser.
- A one-time management token is shown after you consent so you can revoke it from that same page. It is held in the page only — never stored in the browser, a URL, or a log. **If you leave the page, you lose the ability to self-revoke from the UI** and will need to contact the team.
- Revoking suppresses any pending organizer work.
- No organizer message is actually delivered today, because the organizer mailing integration is not activated (section 7).

### 2.7 Privacy and terms

`/privacy` and `/terms` are linked from the site footer. **Both are clearly labeled "Draft policy — pending legal approval."** They summarize what information is handled and how the site should be used, and they explicitly state that retention periods, service-provider disclosures, privacy-request procedures, warranties, liability, intellectual property, disputes, governing law, and formal contact details are all still pending legal review. These pages must be replaced with legally approved copy before any public launch.

---

## 3. Producer guide

### 3.1 Signing in

1. Start at `/producer`, the public "For festival producers" page, and press **Start or resume a submission**.
2. You will be sent to `/login` if you are not signed in. Sign in with your email and password.
3. After signing in you are returned to the submission editor.

Access requires an account with a **verified email address** and the `producer` role (staff `admin` / `super_admin` accounts can also use the producer area). If you sign in without those, you see a clear "Producer access unavailable" message rather than an empty page. Accounts are created by Philly Fests staff in `/admin/settings`; there is no public self-registration.

### 3.2 Creating and editing a draft

- `/producer/dashboard` — overview with recent submissions.
- `/producer/festivals` — the full list of your submissions, with each one's state.
- `/producer/submit` — creates a new private draft and takes you into the editor. An existing draft opens at `/producer/submit?id=<festival-id>`.

Everything you type stays private. The page states it plainly: *"Drafts stay private. Submitted festivals remain private until approved."*

You can save as often as you like with **Save draft**. You may edit a submission only while it is in `draft` or `changes_requested`.

### 3.3 Required fields

Before the editor will let you move to the review step, these must be complete:

| Field | Requirement |
|---|---|
| Festival name | Required |
| Description | Required, at least 20 characters |
| Contact name | Required (kept private) |
| Contact email | Required (kept private) |
| Location | Required |
| City | Required |
| State | Required |
| ZIP code | Required |
| Date type | Choose **timed** or **all-day** |
| Start / End (timed) | Both required; end must be after start |
| Start / End dates (all-day) | Both required; end cannot be before start |

All dates and times you enter are treated as Philadelphia wall-clock time (`America/New_York`). Optional fields include phone, website URL, and a private image asset.

**Image uploads are currently disabled.** The uploader is present but the application reports upload capability as off until a production malware scanner and an audited Google Drive folder are configured (section 7). Nothing you do as a producer can turn this on.

### 3.4 Submitting for review

1. Press the review action. Any missing required field is listed in a "Please fix the following" summary with links straight to each field.
2. Read the review summary of your festival details.
3. Tick all three acknowledgments — representation, accuracy, and terms. All three are required.
4. Submit. The state becomes **Pending review** and you see *"Submission received and pending review."*

While pending, your submission is read-only: *"Your submission is read-only while the Philly Festivals team reviews it."* Submitting does not publish anything. The editor page says so directly: *"Approval is separate from publication, and this record remains private until published."*

The Philly Fests team mailbox receives a submission notification and you receive a receipt at your contact address. If the mail provider is not configured, the failure is recorded durably for follow-up — **it does not undo your submission**.

### 3.5 Responding to "changes requested"

If an editor asks for changes:

1. Your submission returns to the **Changes requested** state and becomes editable again.
2. The editor's producer-safe message is shown at the top of the editor in an amber panel labeled **Editorial message**.
3. The page tells you what to do: *"Review the producer-safe feedback, update your festival, and resubmit when ready."*
4. Fix the items, save, and go through the review-and-acknowledge step again to resubmit.

A **Rejected** submission also carries a producer-safe message. Rejected records can be reopened to `changes_requested` by an editor; you cannot reopen them yourself.

### 3.6 What stays private

| Data | Visibility |
|---|---|
| Draft content before publication | Private to you and editors |
| Contact name, contact email, contact phone | Private to editors, always. Never in public pages, public API responses, calendar files, or analytics |
| Uploaded assets | Private while under review; only editor-approved assets on a published festival can become public |
| Editors' internal reasons | Private to editors — never sent to you |
| Editors' producer messages | Sent to you |
| Public cancellation message | Public, and only used for cancellations |

---

## 4. Editor and admin guide

Sign in and go to **`/admin/festivals`**. Every page under `/admin` requires an `admin` or `super_admin` account. The links `/admin/pending`, `/admin/view-festivals`, and `/admin/submit` are legacy shortcuts that redirect into the editorial queue.

### 4.1 The editorial queue

`/admin/festivals` lists festivals with name, current state, revision number, last-updated time, and a **Review** link. Filter chips across the top switch between **All** and each individual state, and the filter is in the URL — for example `/admin/festivals?state=pending_review` for the review backlog, or `/admin/festivals?state=draft` for imported and producer drafts.

### 4.2 Workflow states

| State | Meaning | Public? |
|---|---|---|
| `draft` | Being written by a producer, or created by the CSV importer | No |
| `pending_review` | Submitted and waiting for an editor | No |
| `changes_requested` | Sent back to the producer with feedback | No |
| `rejected` | Declined under the current review | No |
| `approved` | Editorially accepted — **still not public** | No |
| `published` | Live on the public site | Yes |
| `unpublished` | Pulled from public view without being deleted | No |
| `canceled` | Was published, now canceled — shows a public tombstone | Yes (tombstone only) |
| `archived` | Terminal, permanently private | No |

Allowed moves are enforced in the application **and** in the database, so nothing can skip a step:

```
draft               → pending_review, archived
changes_requested   → pending_review, archived
pending_review      → changes_requested, rejected, approved
rejected            → changes_requested, archived
approved            → published, changes_requested, archived
published           → unpublished, canceled, archived
unpublished         → published, changes_requested, canceled, archived
canceled            → archived
archived            → (nothing)
```

### 4.3 Approving does NOT publish

This is the single most important rule in the workflow. Moving a festival to **`approved`** records your editorial decision but changes nothing on the public site. The festival becomes public only when you take the **second, separate** action of moving it from `approved` to `published`.

This is deliberate: it lets you accept a submission and control the moment it goes live.

### 4.4 Taking an action

Open a festival at `/admin/festivals/<id>`. You will see the private submission detail (including the private contact block), the **Editorial action** form, private assets, the private audit timeline, notification attempts, and the social feed manager.

In the action form:

1. **Next state** — only the moves that are legal from the current state are offered.
2. **Internal reason** — private to editors. **Required** for `changes_requested`, `rejected`, `canceled`, and `archived`.
3. **Producer message** — owner-safe text sent to the producer. **Required** for `changes_requested` and `rejected`.
4. **Public cancellation message** — appears only when the action is `canceled`. **Required** for cancellation, and it is the only place a public message is allowed.

Every transition records who acted, the previous state, the new state, the reason, and the timestamp, and bumps the revision number. If someone else changed the record while your page was open you get *"Revision conflict. Reload before taking another action."* — reload and redo it. This prevents two editors overwriting each other.

### 4.5 Publishing requirements

A festival can only be published if it has **exactly one valid primary date occurrence** in `America/New_York`. The database enforces this, so a festival with a missing, ambiguous, or invalid date interval cannot be published, and cannot be canceled into a public tombstone either. If a publish attempt fails on this rule, the date data must be corrected first.

Publishing stamps the first-published and published timestamps and makes the festival's calendar data publicly exportable. Unpublishing clears the live publication stamp but preserves the original first-published date, so a later re-publish keeps its history.

### 4.6 Cancellation tombstones

Use `canceled` for a festival that was published and is no longer happening. It requires both an internal reason and a public cancellation message. The result:

- The public detail page stays reachable and shows a red "Canceled" banner with your public message.
- Save-to-schedule, website link, official social links, social feed, and program actions are all removed from that page.
- The festival is removed from public discovery results.
- Calendar exports of that item are marked `CANCELLED` and free.

Cancellation is not deletion. From `canceled` the only remaining move is `archived`. There is no hard delete anywhere in the festival workflow; the legacy delete endpoint returns an explicit error directing you to archival.

### 4.7 Producer notifications and retry

When a transition produces a producer message, the application attempts an email to the producer. Delivery happens **outside** the state-change transaction on purpose: a mail failure can never undo a committed editorial decision.

The **Notification attempts** section on the festival page lists each attempt with its revision, delivery status, attempt count, and any failure code. When an attempt is pending or has failed with fewer than 5 attempts, the row is marked "Retry needed" and shows a **Retry notification** button. Retrying is safe — attempts are leased and counted, so a retry cannot produce a duplicate send.

### 4.8 Reviewing imported drafts

Festivals created by the CSV importer arrive as **private `draft` records with no owner**, exactly one all-day primary occurrence in `America/New_York`, one reviewed category, revision 0, and an initial audit transition attributed to the import operator. Their private contact fields are populated but redacted from import evidence.

To review them:

1. Go to `/admin/festivals?state=draft`.
2. Open a record and check the name, description, dates, location, and category against the source.
3. From `draft` the only forward move is `pending_review`, then the normal `approved` → `published` path. Nothing imported can shortcut to public.
4. Anything unsuitable goes to `archived`, which keeps it private and preserves its lineage.

Two limitations to plan around:

- **The admin interface has no festival content editor.** Editors can change state, review assets, and configure social feeds, but cannot edit festival fields in the UI. Correcting imported data requires either a producer-owned record or a separately reviewed forward repair as described in `docs/FESTIVAL-DATA-MIGRATION.md`.
- **Imported records are never deleted.** The importer has no rollback. A bad batch is handled by archiving through the normal audited workflow and repairing forward.

### 4.9 Moderating the social feed

Social moderation lives at the bottom of `/admin/festivals/<id>`.

**Feed configuration** — set the festival hashtag (letters, numbers, and underscores; no leading `#`), the provider feed ID, and the aggregation provider (**Curator.io** or **Flockler**). The **Enable approved posts publicly** checkbox is the per-festival kill switch. Save shows the current revision and last sync status.

**Cached posts** — a queue you can filter by **Pending**, **Approved**, **Hidden**, **Rejected**, or **All current-source posts**, paginated 24 at a time. Each card shows the author, the current moderation status and revision, the text excerpt, and a **Review original post** link to the canonical post on the source network.

Three actions are available on each post:

| Action | Use it for | Reason required? |
|---|---|---|
| **Approve post** | Content that can appear publicly on the festival page | No |
| **Hide post** | Content that was visible or may be reconsidered later | **Yes** |
| **Reject post** | Content that should not be published under the current review | **Yes** |

The interface refuses to hide or reject without a reason: *"Enter a moderation reason before hiding or rejecting a post."* Reasons are internal — keep sensitive personal information out of them. Moderation history is immutable at the database layer.

Safety properties worth knowing:

- Provider posts land in the queue as **pending** and cannot become public without your explicit approval.
- Public pages render first-party text cards that link out. No provider scripts, HTML, iframes, autoplay media, or tracking widgets are executed.
- Hidden and rejected posts are excluded by the database query itself, not filtered after the fact.
- If the provider fails, previously approved posts remain; an empty or unavailable feed shows stable fallback copy and the official festival links stay visible.

Recommended service levels (from `docs/SOCIAL-FEED-OPERATIONS.md`): review pending posts within **one business day** normally, within **four hours** on an actively staffed festival day, and hide a previously approved post **immediately** on a credible safety, rights, harassment, impersonation, or privacy report. Primary moderator: **Iris Sun**; backup: **Uraiba Zafar**.

### 4.10 User administration

Go to **`/admin/settings`**.

You can create an account (name, email, password, role), change an existing account's role, and deactivate or reactivate an account.

| Rule | Detail |
|---|---|
| Roles | `public`, `producer`, `admin`, `super_admin` |
| Who can create privileged accounts | **Only `super_admin`** can create an `admin` or `super_admin`. An `admin` sees only `public` and `producer` as options |
| Who can promote/demote privileged accounts | **Only `super_admin`.** An `admin` cannot manage an `admin` or a `super_admin` at all |
| Self-deactivation | Blocked — you cannot deactivate your own account |
| Deletion | **There is no user deletion.** The "delete" control deactivates the account; the same control reactivates a deactivated account |
| Audit | Account changes are recorded |

Because accounts are deactivated rather than deleted, historical attribution in the editorial audit trail stays intact. Keep at least two working `super_admin` accounts so nobody is locked out.

---

## 5. Time handling

Everything user-facing uses **`America/New_York`**. Fixed `EST`/`EDT` labels and hard-coded UTC offsets are not used as time-zone rules anywhere.

- Producer-entered times are Philadelphia wall-clock time. They are converted to a precise instant for storage and keep their source zone.
- Date-only values (all-day festivals) stay date-only and are never round-tripped through UTC, so they cannot drift by a day.
- Discovery date presets and custom ranges are computed against the Philadelphia calendar day, including across daylight-saving transitions.
- Displayed dates and times on public pages, the schedule builder, and admin screens are formatted in Philadelphia time.
- Calendar exports write timed events as precise instants and all-day events as calendar dates with an exclusive end date (see section 2.5).
- Imported festivals are given one all-day occurrence recorded in `America/New_York`.
- Social feed synchronization is scheduled in `America/New_York` for operator reporting.

---

## 6. Quick reference: where everything lives

| Task | Location |
|---|---|
| Search festivals | `/` |
| Read a festival | `/festivals/<slug>` |
| Build / email / export a schedule | `/calendar` |
| Learn about producer submissions | `/producer` |
| Create or resume a submission | `/producer/submit` |
| See your submissions | `/producer/festivals` |
| Sign in | `/login` |
| Admin overview | `/admin` |
| Editorial queue | `/admin/festivals` |
| Review backlog | `/admin/festivals?state=pending_review` |
| Imported and producer drafts | `/admin/festivals?state=draft` |
| Review one festival + moderate its social feed | `/admin/festivals/<id>` |
| Manage user accounts | `/admin/settings` |
| Draft privacy notice | `/privacy` |
| Draft terms of use | `/terms` |

---

## 7. What is NOT active until owners complete external activation

All of the following are **implemented and tested in code, and deliberately switched off**. They fail closed: when the configuration is absent, the feature reports an honest failure or reports itself as unavailable rather than pretending to work. Merging the code did not authorize activation; each item needs a separate, explicit activation approval.

| Integration | Current behavior | What must happen first | Runbook |
|---|---|---|---|
| **Resend production email** (schedule confirmations, producer receipts, editorial notifications) | With no API key configured, sends are skipped and reported as `provider_unconfigured` without logging recipients, subjects, or message content. Failures are recorded for retry and never alter a saved schedule or reverse an editorial decision | Purchase/configure the Resend account, verify the sending domain, set the API key and sender address in the deployment secret manager, set the team mailbox alias, and prove delivery in a controlled test | `docs/SCHEDULE-CALENDAR-EMAIL.md`, `docs/PRODUCER-SUBMISSION-OPERATIONS.md` |
| **N8N organizer mailing lists** (forwarding consented visitors to each organizer's email service) | Consent is captured and durable outbox work is queued, but the N8N workflow is inactive, contains no credentials, and its provider adapter node intentionally fails. **No organizer email is ever sent today** | Final consent copy and retention periods approved by legal, revocation/suppression behavior confirmed, written organizer authorization, N8N TLS/secrets/backup readiness, the shared bearer secret configured in both secret stores, contract tests and a controlled proof, named operators, and explicit activation approval | `docs/PRODUCT-DECISIONS.md`, `apps/n8n/README.md`, `docs/SCHEDULE-CALENDAR-EMAIL.md` |
| **Curator.io / Flockler social sync** | Adapters exist with fixed API origins and server-only credentials, but no token or sync secret is configured, so no synchronization runs and no provider post enters the queue. Public pages show the stable empty/fallback state | Complete the 10-item activation checklist: purchased plan and privacy/legal review, eligible connected accounts, endpoint contract proven off-production, dedicated secrets and a named rotation owner, scheduled sync with quotas and bounded retry, moderator access and SLA confirmed, verified failure fallback, approved retention period, monitoring, and recorded activation approval | `docs/SOCIAL-FEED-OPERATIONS.md` |
| **Google Drive uploads** (producer image assets) | Uploads are **disabled regardless of any flag**, because this codebase intentionally ships no production malware scanner or full image decoder. The producer editor reports upload capability as off | Inject a real scanner with a production health check, configure the dedicated Drive folder and least-privilege service identity, then have deployment operations independently audit the folder in Google Drive (correct folder, link sharing off, no `anyone`/`domain` permission, no other user or group, minimum service-account access, working upload-then-delete test) and record the evidence | `docs/PRODUCER-SUBMISSION-OPERATIONS.md` |
| **Production CSV festival import** | No production import has been executed. The importer is insert-only, never publishes, and never calls email, consent, schedule, asset, geocoding, social, or N8N systems | Rehearse on disposable PostgreSQL, freeze and independently verify both input checksums, name the database operator and a **distinct** reviewer, take and verify a restorable backup, dry-run against the target, prepare, have the distinct reviewer produce a signed Ed25519 approval binding batch and backup evidence, then apply with the literal production confirmation, save the redacted report, replay to prove a no-op, and verify public endpoints exclude every imported draft | `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md`, `docs/FESTIVAL-DATA-MIGRATION.md` |

Two related deployment prerequisites that also fail closed in production:

- Producer create, submit, and upload actions are disabled unless identity/IP-aware rate limiting is independently proven at the deployment edge. The in-application limiter is a per-process defense only and gives no cross-instance guarantee.
- Producer mutations require a valid absolute site URL to be configured; origin validation fails closed without it.

---

## 8. Known limitations

1. **Browser test coverage is incomplete in some environments.** The release browser matrix is Chromium, Firefox, and WebKit at desktop and mobile widths. WebKit (Safari and mobile Safari) additionally requires host packages installed with `pnpm exec playwright install-deps`. Where those packages cannot be installed, the run must be narrowed with `E2E_BROWSERS` — but CI must run the full matrix so a Safari or Firefox regression cannot reach a release. Treat any release validated without WebKit as **not** Safari-verified.
2. **Privacy and terms copy is draft.** `/privacy` and `/terms` are labeled "Draft policy — pending legal approval" on the page itself. Retention periods, service-provider disclosures, privacy-request procedures, liability, IP, disputes, governing law, and a formal contact channel are all unresolved. These must be replaced with approved copy before public launch, and the organizer-consent disclosure text needs the same legal sign-off.
3. **Imported festivals stay private drafts and need editorial review.** A dry run against the current reviewed source classifies **434 rows into 102 ready, 332 quarantined, and 0 duplicates**. Rows are quarantined for parse/normalization errors, blank or unmapped categories, ambiguous or nonstandard dates (a two-digit year, comma-separated dates, an impossible `6/37`, recurring phrases such as "Every Thursday", a location typed into the date column), materially conflicting same-name/date groups, and conservative matches against existing records. Nothing ambiguous is ever guessed into a real date. Even the 102 "ready" rows land as **private drafts with no owner** and must pass full editorial review before they can be approved and published. Matching records already in the target database can only increase the quarantine count.
4. **No festival content editor in the admin UI.** Editors move states, review assets, and configure feeds; they cannot edit festival fields from `/admin/festivals/<id>`.
5. **The Map view on the home page is not implemented** and is shown as unavailable.
6. **Schedules do not sync across devices or browsers.** They are browser-local by design, and clearing browser data removes them.
7. **Calendar exports are snapshots** and do not update when festival details change.
8. **The organizer-consent management token is shown once.** Leaving the page without saving it removes the visitor's self-service revocation path.
9. **Quality targets still need formal sign-off:** WCAG 2.2 AA, Core Web Vitals and response budgets, SEO metadata and event structured data, privacy-reviewed analytics events, availability/backup/RPO/RTO objectives, and provider quota, cost, and alerting thresholds.
10. **Contact addresses are personal university accounts.** All owner assignments below use `pratt.edu` addresses from `docs/Client-Hand-Off.md`. Confirm they remain available after handoff and replace them with organization-owned role aliases before operational activation. Named technical operators are still required for N8N, Google Drive, database, deployment, and security operations.
11. **Festival source data must stay out of the repository.** The organizer contact CSV is no longer tracked in Git and is ignored going forward, but it still exists in earlier commit history. Purging it fully requires an owner-approved repository history rewrite plus an access review, which is deliberately not done automatically because it invalidates existing clones. Until it is scheduled, treat repository access as access to organizer contact details. See `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md`.

---

## 9. Troubleshooting and who to contact

### 9.1 Owner assignments

These come from `docs/PRODUCT-DECISIONS.md` and should be confirmed before any operational activation.

| Domain | Primary | Backup |
|---|---|---|
| Product and visual acceptance | Simran Kaur — `skaur@pratt.edu` | Mengqi Cao — `mcao13@pratt.edu` |
| Producer / editorial workflow | Uraiba Zafar — `uzafar@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |
| Consent, privacy, and communications | Mengqi Cao — `mcao13@pratt.edu` | Simran Kaur — `skaur@pratt.edu` |
| Social moderation | Iris Sun — `wsun16@pratt.edu` | Uraiba Zafar — `uzafar@pratt.edu` |
| Release acceptance and incident coordination | Simran Kaur — `skaur@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |
| Workflow / imported-data review | Uraiba Zafar — `uzafar@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |
| Privacy / contact-data review for the import | Mengqi Cao — `mcao13@pratt.edu` | Simran Kaur — `skaur@pratt.edu` |

### 9.2 Common situations

| Symptom | Most likely cause | What to do | Who owns it |
|---|---|---|---|
| A festival is approved but not on the public site | Approval does not publish | Move it from `approved` to `published` | Uraiba Zafar |
| Publishing fails | The festival does not have exactly one valid primary date occurrence | Correct the date data, then publish | Uraiba Zafar |
| "Revision conflict. Reload before taking another action." | Someone else changed the record while your page was open | Reload the page and redo the action | Uraiba Zafar |
| A transition is rejected for a missing reason or message | Internal reason is required for changes requested, rejected, canceled, archived; a producer message is required for changes requested and rejected; a public message is required for cancellation | Fill in the required field | Uraiba Zafar |
| Emailing a schedule reports a failure | Production email sending is not activated | Expected until Resend is activated. The saved schedule is unaffected | Mengqi Cao |
| A producer notification shows "Retry needed" | A delivery attempt did not succeed | Press **Retry notification** on the festival page. Escalate if it keeps failing | Uraiba Zafar |
| A producer cannot upload an image | Uploads are disabled pending a scanner and audited Drive folder | Expected. Do not promise uploads to producers yet | Simran Kaur (release), with the technical operator |
| A producer cannot create or submit at all in production | Edge rate limiting or the canonical site URL is not proven/configured | Deployment owner must configure and verify these | Named technical operator |
| The social feed is empty on a festival page | No provider sync is active, the feed is disabled, or no post has been approved | Expected until provider activation. Confirm the feed's enable switch and the moderation queue | Iris Sun |
| An unsafe post is publicly visible | It was approved and should not have been | **Hide** it immediately with a documented reason, then escalate | Iris Sun → Mengqi Cao |
| Discovery shows "Festival listings are temporarily unavailable" | The database could not be reached | Escalate to the technical operator; check database availability | Simran Kaur (incident coordination) |
| A visitor lost their saved schedule | Browser data was cleared, or they switched device/browser | Expected — schedules are browser-local by design | Simran Kaur |
| An all-day festival looks a day too long in an exported file | The iCalendar all-day end date is exclusive | Correct behavior; confirm how it displays in the calendar app | Simran Kaur |
| A visitor wants to withdraw organizer consent but closed the page | The management token is shown only once | Handle manually with the privacy owner | Mengqi Cao |
| An imported festival has wrong data | Source data ambiguity | Do not delete it. Archive through the audited workflow and repair forward | Uraiba Zafar + Mengqi Cao |
| An admin cannot change another admin's role | Only a `super_admin` can manage privileged accounts | Ask a super admin | Simran Kaur |
| An account should be removed | Deletion does not exist | Deactivate the account in `/admin/settings` | Simran Kaur |

### 9.3 Escalation

For anything involving safety, personal data, rights or takedown requests, or a suspected credential exposure, contact the privacy owner (**Mengqi Cao**, backup **Simran Kaur**) and the incident coordinator (**Simran Kaur**, backup **Iris Sun**) at the same time. For suspected tampering with moderation or editorial history, restrict administrative access, preserve database and log evidence, and involve the technical security operator — moderation transitions are immutable at the database layer.

---

## 10. Getting help and where the runbooks live

All operational documentation is in the `docs/` folder of the repository.

| Document | Use it for |
|---|---|
| `docs/Features.md` | The feature baseline F-01 … F-09 with acceptance criteria |
| `docs/PRODUCT-DECISIONS.md` | Approved product decisions, workflow model, time/calendar rules, owner assignments |
| `docs/DELIVERY-WORKFLOW.md` | Branching, required test gates, review rules, and the rule that merging code never authorizes activation |
| `docs/SCHEDULE-CALENDAR-EMAIL.md` | Schedule email, organizer consent, and calendar export behavior and endpoints |
| `docs/PRODUCER-SUBMISSION-OPERATIONS.md` | Producer submission operations, upload activation, the Drive audit, rate-limit prerequisites |
| `docs/SOCIAL-FEED-OPERATIONS.md` | Social provider choice, privacy model, refresh policy, moderation SLA, activation checklist, incident response |
| `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md` | Step-by-step CSV import: dry-run, prepare, signed review, apply, resume, report, recovery |
| `docs/FESTIVAL-DATA-MIGRATION.md` | Import safety principles, source profile, transformation rules, acceptance criteria, forward recovery |
| `apps/n8n/README.md` | N8N safety model, organizer subscription contract, and activation prerequisites |
| `docs/Client-Hand-Off.md` | The original design handoff this project was built from |

**Before asking for help, note:** which page or URL you were on, which role you were signed in as, the festival name and its current workflow state and revision number, and the exact on-screen message. That is usually enough to resolve an issue without exposing any private data. Never paste credentials, API keys, private contact details, or the raw import CSV into a ticket, chat, or email.
