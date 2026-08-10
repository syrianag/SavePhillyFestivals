# Save Philly Festivals — Client Demo Walkthrough

For the team running the client call. Read the **Before the call** section first: there is one
decision that has to be made before you dial in, and several talking points where the honest
answer is better than the impressive one.

Last updated: 2026-08-10.

---

## 🚨 Before the call — read this first

### The public site is currently empty. This is deliberate.

All 405 imported festivals were moved from `published` to `unpublished` on request. Only
`published` festivals are publicly discoverable, so **search, the calendar, the map, and every
imported festival's detail page currently return nothing.**

You have two options, and you must pick one before the call:

**Option A — Republish for the demo (recommended if you want to show the public site).**
`festival-publish-batch.mjs` deliberately refuses to republish anything in `unpublished`, so a
festival taken down on purpose is never silently restored by a bulk job. Restoring all 405
therefore needs a code change first. **Allow time for this — it is not a one-command fix.**
Ask the engineering team the day before, not an hour before.

**Option B — Demo the admin and producer flows only, and explain the empty catalog.**
Entirely defensible: "The catalog is staged and intentionally offline while we finish editorial
review. Here is the machinery that puts it live." Everything in Phases 2–5 below works with an
empty public site.

**Do not** open the homepage expecting festivals and improvise. That is the one way this call
goes badly.

### Accounts you need

Credentials come from `apps/save-philly-festivals/.env.local` — `LOCAL_ADMIN_EMAIL` /
`LOCAL_ADMIN_PASSWORD`. The seeded admin defaults to `admin@savephillyfestivals.org`. Verify with
`pnpm run db:verify-admin` before the call.

There is currently **no seeded producer account.** You will create one live during Phase 2, which
is a better demo anyway. If you would rather have one ready, sign up and approve it beforehand.

### Environment

- Run `pnpm run dev` from the repo root. The app is on **`http://localhost:3000`**.
- Only one `next dev` can run per project at a time. If Playwright or a second dev server is
  running, Next refuses to start and prints a confusing "existing server" message.
- Have a PNG/JPG ready if you want to show image fields.

### Known gotchas that will come up

| If they ask / notice | The honest answer |
|---|---|
| "Search for beer" returns nothing | The CSV had 11 columns and no description field. Imported festivals are searchable by **name, location, and category only**. "Odunde" matches; "beer" does not. |
| Festivals have no photos | Zero of the 405 have imagery. The source spreadsheet carried none. Branded placeholders fill the gap; real imagery is a client content task. |
| A festival shows "Ongoing · through Oct 4" | It genuinely spans months. The spreadsheet gave a start and end date and nothing about which days inside that window it runs. We never claim it "recurs" because we cannot know that from the data. |
| Applicants aren't getting emails | Account emails are **off by default**. See Phase 4. |
| `qa-producer-flow@example.test` in Settings | A verification account from testing. Deactivated and cannot sign in. Audit rows are append-only by design, so it cannot be deleted. |

---

## Phase 1 — Public discovery (5 min)

> Skip or shorten this phase if you chose Option B above.

### Homepage — `http://localhost:3000/`

**Talking points:**
> "Discovery is server-rendered and fully stateful. Every filter you choose is mirrored in the
> URL, so a search is bookmarkable and the browser Back button behaves correctly."

**What changed recently, worth calling out:** pagination used to feel like a full page reload —
the entire page re-fetched on every click. Only the result grid now re-renders, behind a loading
skeleton, with the header, search controls, and featured row staying put.

### Featured festivals

**Talking points:**
> "'Featured' used to just mean the first two results. It is now editor-curated — an admin flags
> a festival and sets its order. If nothing is flagged, it falls back to the soonest upcoming
> festivals so the row is never empty."

### Calendar — `/calendar`

**Talking points:**
> "The calendar defaults to the current month, which is what people actually want. Clicking a
> date filters to that day, and multi-day festivals are reachable from *every* day they span,
> not just their opening day."

**Gotcha to get ahead of:** a festival running May–October appears under an August heading. The
card explains itself — "Ongoing · through Oct 4" — rather than showing a May date that would look
like a bug.

### Schedule builder and export

**Talking points:**
> "Visitors can build an itinerary with no account — it is stored in their browser. Overlapping
> events are flagged but still allowed. Export produces a standard `.ics` that imports cleanly
> into Google, Apple, and Outlook calendars."

---

## Phase 2 — Producer sign-up and submission (10 min)

**This is the newest work and the most likely thing they will ask about.** Until now a producer
could not create an account at all — an admin had to make one for them.

### Step 1 — Sign up — `/producer` → "1. Sign up"

**Action:** Click through to `/signup`, register with a real-looking address.

**Talking points:**
> "Anyone can create an account. Signing up on its own grants nothing — the account can browse,
> and that is all. Being able to submit a festival is a separate, reviewed decision."

**Decision worth explaining if they ask why:**
> "This is deliberate. Registration is the only place on the site where someone without
> credentials can create anything, and the same login system protects the admin portal. So
> signup hands out no capability, and a human approves producer access."

### Step 2 — Request producer access — `/account`

**Action:** Fill in organization, festival name, and a note. Submit. Reach this page from the
**"My account"** link in the header — it appears as soon as anyone signs in, whatever their role.

**Talking points:**
> "The request goes into an admin queue. The applicant sees their status here — awaiting review,
> approved, or declined with the reason — and can reapply if they were declined."

### Step 3 — Approve it — Admin → Producer Access

**Action:** Sign in as admin, open **Producer Access**, approve the request.

**Talking points:**
> "Approving grants the producer role and records the decision in the same transaction, so a
> granted role always has an audit trail and an approved applicant always actually has access.
> Submissions still go through editorial review — approving the person is not approving their
> festival."

**Flag to point out on screen:** if account emails are off, the page shows an amber banner saying
applicants are not being notified. That banner is deliberate — see Phase 4.

### Step 4 — Create a draft — `/producer/submit`

**Talking points:**
> "Drafts are private and can be saved as often as needed. Submitting runs strict validation on
> both the client and the server, then locks the record while the editorial team reviews it."

### Step 5 — Track the submission — `/producer/dashboard`

**Talking points:**
> "Producers follow their submission through review here, read the team's feedback, and resubmit
> if changes are requested."

---

## Phase 3 — Editorial workflow (10 min)

### The queue — `/admin/festivals`

**Talking points:**
> "Every submission moves through an explicit workflow: pending review, approved, published, and
> so on. Each transition writes an audit row and a full snapshot of the record, so you can always
> answer who changed what and when."

**New:** the list now has search and a date range alongside the status chips, and the admin
portal finally has proper navigation — previously every admin screen was reachable only by typing
its URL.

### Editing a festival — new

**Action:** Open a festival, click **Edit details**.

**Talking points:**
> "Until recently an editor could not fix a typo on a published festival at all. They can now,
> and every edit records an internal reason and a revision snapshot."

**Decision worth knowing, if a technical person is on the call:**
> "The database itself enforced that an editor could not change a festival without also changing
> its state — the protection being that an edit was never invisible. We kept that protection but
> changed how: a same-state edit is allowed only when it carries a written reason. The audit
> trail is unchanged."

### Request changes → approve → publish

**Talking points:**
> "Requesting changes requires both an internal note and a producer-facing message, so feedback
> is never a bare rejection. And notice approval and publication are separate steps — approving
> registers editorial acceptance while keeping the festival private, so you can preview before it
> goes live."

### Cancellation tombstone

**Talking points:**
> "A canceled festival is never deleted. The page stays up with a red banner and your custom
> message, so bookmarks and search results do not break."

**Gotcha:** archiving and cancelling both **require** an internal reason. The dialog marks the
field required — it used to say "optional" and then fail with an error.

---

## Phase 4 — Email templates (5 min)

### Admin → Email Templates

**Talking points:**
> "The wording sent to applicants is editable here — subject and body, with a live preview. No
> developer, no deploy. You can insert details with placeholders like `{{name}}` and
> `{{reason}}`, and the screen warns you if you type a placeholder that does not exist."

### The flag you must explain

**Emails are off by default, and turning them on is a deliberate two-part decision.**

> "Producer decision emails and festival notifications both send through the same provider. The
> festival notifications are addressed to organizer contact details from your spreadsheet —
> people who never signed up for anything, and there are about 1,600 of those queued. So we
> deliberately put account emails behind their own separate switch. Adding an email API key alone
> will not start emailing organizers. Both have to be turned on, on purpose."

If they want applicant emails live, that is `ACCOUNT_EMAILS_ENABLED=1` plus a Resend key — and it
is worth a short, separate conversation about whether organizers should ever be emailed.

---

## Phase 5 — Sponsors (5 min)

### Admin → Sponsors

**Talking points:**
> "You can place sponsors in three slots — left rail, right rail, and the footer band — and
> change them without a deploy. Each sponsor takes an image URL, a link, alt text, a display
> order, and optional start and end dates so a sponsorship stops showing on its own."

**Design decision worth stating plainly:**
> "Rails show on wide desktop screens. On smaller screens they do not disappear — those sponsors
> move into the footer band, so a rail advertiser still gets their impression on mobile."

**And the one that changes how sponsors are sold:**
> "These are self-hosted creatives, not Google AdSense. The site's security policy blocks
> third-party ad scripts by design. That means direct-sold sponsorship rather than programmatic
> ad revenue — which at this traffic level is worth considerably more per slot anyway, but it
> does mean you supply the artwork."

**Practical note:** creatives are referenced by an https URL. Host the image somewhere and paste
the link — there is no file upload on this screen.

---

## Phase 6 — Social feed (skip unless asked)

Hashtag-driven aggregation via Curator.io or Flockler. Posts arrive as **pending** and stay
private until a moderator approves them; hiding or rejecting requires a written reason, which is
kept as an immutable log.

---

## 💬 Wrap-up and open items

Be straight about what is not done. It builds more confidence than a clean sweep.

**Open, needs a client decision:**
- **Festival imagery.** Zero of the 405 have photos. Pulling them from 267 organizer websites
  raises copyright and storage questions. Currently branded placeholders.
- **Recurring events.** Eight festivals are stored as long continuous ranges when some are really
  "every Sunday". Closing this needs either a note field the client fills in, or real dates.
- **Republishing the catalog.** See the top of this document.

**Known and accepted:**
- Signup does not verify email ownership. Low risk because registration grants nothing and a
  human approves access, but worth closing before any public promotion.

**Ask them for:**
- About page copy and images, and the intent of the Tours page — both still placeholder.
- Sponsor artwork, if they want the slots filled for launch.

---

## Reference — what to run before the call

```sh
pnpm run db:verify-admin     # confirms the admin login works
pnpm run dev                 # app on http://localhost:3000
```

Full details of every open item are in `ISSUE.log` at the repository root.
