# Philly Fests — Client User Guide

![Save Philly Festivals logo](../apps/save-philly-festivals/public/logos/SPF%20One%20Line%20Logo.png)

**Version 2** — 10 August 2026, superseding v1 of 6 August 2026  
**Client** — DiasporaDNA / Philly Fests  
**Operational owners** — Simran Kaur, Mengqi Cao, Uraiba Zafar, Iris Sun  
**Time zone** — `America/New_York` throughout  
**Companion documents** — `Known-Issues.md` (current caveats), `ISSUE.log` (engineering detail), `docs/Technical-Developer-Guide.md`, `docs/N8N-Owner-Guide.md`

This guide describes what the software does today. It is written for non-technical owners and is safe to share with the client.

> ### What changed since version 1
>
> - **Producers can now register themselves.** v1 said accounts were created only by staff. There is now a sign-up page, a producer-access request, and an admin approval queue.
> - **The map is built.** v1 said the map view "is not implemented". It is now a full interactive map with clustering, filters, and a companion list.
> - **Editors can now edit festival content.** v1 said the admin interface had no content editor.
> - **New:** sponsor ad placements, editor-curated featured festivals, admin-editable email templates, automatic location lookup, and admin navigation.
> - **The public catalog is currently switched off.** See the box immediately below.

---

## ⚠️ Current state of the live site

**All 405 imported festivals are set to `unpublished`, so the public site shows nothing.** Search, the calendar, the map, and every imported festival page currently return no results.

This was a deliberate operator decision, not a fault. The festivals are safely stored and one action away from being live again. Restoring them is a decision for the owners — and the bulk publish tool deliberately refuses to reverse a purposeful takedown, so **restoring all 405 needs a short engineering change first. Ask a day ahead, not an hour ahead.**

Everything described in this guide works; the public pages simply have no festivals to show until you republish.

---

## 1. What the site does

Philly Fests has three connected parts:

1. **A public site** — anyone can search festivals, view them on a map, read festival pages, build a personal schedule in their own browser, email it to themselves, and download it as a calendar file.
2. **A producer area** — a festival organizer registers, requests permission to submit, then creates and tracks festival listings.
3. **An admin area** — Philly Fests staff review submissions, edit content, control publication, approve producers, manage sponsors, moderate social posts, and manage accounts.

**The golden rule:** visitors only ever see festivals an editor has explicitly **published**. Drafts, pending submissions, approved-but-unpublished festivals, and imported records are never publicly visible.

### Who uses what

| Audience | Who | Where | Account needed |
|---|---|---|---|
| Visitor | Anyone browsing | `/`, `/map`, `/calendar`, `/festivals/<name>`, `/about`, `/tours` | No |
| Registered user | Someone who signed up | `/account` | Yes — free to create |
| Producer | An approved festival organizer | `/producer/dashboard`, `/producer/submit` | Yes — plus approved producer access |
| Editor / Admin | Philly Fests staff | Everything under `/admin` | Yes — `admin` role |
| Super admin | Staff managing other staff accounts | `/admin/settings` | Yes — `super_admin` role |

---

## 2. Visitor guide

No account is needed for anything in this section.

### 2.1 Finding festivals (`/`)

The home page is the discovery page. Every filter you choose is written into the page address, so a filtered view can be bookmarked, shared, or reached with the browser Back button.

| Control | What it does |
|---|---|
| Search box | Matches festival name, description, location, city, and category |
| Date | Any date, Next 7 days, This month, Next month, or a custom range |
| Category | Drawn from currently published festivals |
| Neighborhood or location | Free text with suggestions |
| Sort | Relevance (when searching), Soonest, Newest, or Name |

Worth knowing:

- **Only upcoming festivals are shown by default** — this month forward. Past festivals stay reachable by direct link and via the "include past" option, so old links never break.
- **Date filtering uses overlap.** A multi-day festival that merely crosses into your chosen window is included rather than dropped.
- **Paging is smooth.** Moving between pages updates only the results, leaving the header and search controls in place. It no longer looks like the whole page is reloading.
- 24 festivals per page, with a live count such as "12 festivals found".
- If nothing matches, you get a clear panel with a one-click way to clear filters.

### 2.2 Featured festivals

The two large cards near the top are **editor-curated**. An administrator flags a festival as featured and sets its order. If nothing has been flagged, the row falls back to the soonest upcoming festivals, so it is never empty.

*(In version 1 "featured" simply meant the first two search results, with no way to control it.)*

### 2.3 The map (`/map`)

An interactive map of every published festival that has been matched to a location.

- **Pan and zoom** by dragging, using the +/− buttons, double-clicking, pinching, or the keyboard.
- **Scroll-wheel zoom is deliberately switched off** so the map does not hijack the page while you are scrolling past it.
- **Click any pin to open that festival.** One click, and the page changes instantly rather than reloading.
- **Overlapping pins group together** into a numbered circle. Click it to expand. Philadelphia festivals concentrate downtown, and without this the pins underneath would be impossible to click.
- **The same search and filters** from the home page work here, and a list beside the map shows what is currently visible. "Show on map" pulls the map to any festival in the list.
- Filters carry across when you switch between Featured, Map, and Calendar.

**Coverage:** 238 of 415 festivals currently have map locations. Section 8 explains why, and what you can do about it.

### 2.4 The calendar (`/calendar`)

Published festivals grouped by date, with a month picker and the schedule builder.

- **Defaults to the current month.**
- **Click any date** to see that day's festivals. A festival running several days is reachable from *every* day it spans, not only its first.
- **A long-running festival explains itself.** One spanning May to October shows "Ongoing · through Oct 4" under an August date, rather than a May date that would look like an error.

### 2.5 Building a schedule

The Schedule Builder lets a visitor plan an itinerary with no account.

- Your selection lives **only in your own browser**. Nothing is sent to us when you save.
- Saving the same item twice does not duplicate it. A whole festival and one of its events count as two separate selections, which is intentional.
- Overlapping events produce a warning, but both stay saved.
- If a saved festival is no longer published, it shows as unavailable and can be removed — it does not break the page.
- **Schedules do not follow you between devices or browsers**, and clearing browser data removes them.

### 2.6 Emailing a schedule and exporting to a calendar

**Email this schedule** sends every saved item to an address you type. It is transactional — it does not sign anyone up for marketing. Retrying the same address will not send a duplicate.

**Export to Calendar** downloads a standard `.ics` file:

| Calendar app | How to import |
|---|---|
| Google Calendar | Settings → Import & export → Import → choose the file |
| Apple Calendar | Open the downloaded file → choose a calendar → OK |
| Outlook | File → Open & Export → Import/Export → Import an iCalendar file |

Two things that look wrong but are not:

- **All-day end dates appear one day later in the raw file.** That is how the calendar standard works, and every major calendar app displays it correctly.
- **Exports are a snapshot.** If a festival later moves, re-export.

⚠️ **Email is currently switched off** — see section 6. A send attempt today reports an honest failure rather than pretending to succeed, and your saved schedule is never affected.

---

## 3. Producer guide

### 3.1 The three steps

**1 — Sign up** (`/signup`). Anyone can create an account. Signing up on its own grants nothing: the account can browse, and that is all.

**2 — Request producer access** (`/account`, reachable from "My account" in the header). Tell us your organization and the festival you want to list. An administrator reviews every request.

**3 — Create and track a submission** (`/producer/submit`, `/producer/dashboard`). Once approved, create private drafts, submit them for review, and follow their progress.

> **Why signing up does not immediately let you post.** Registration is the only place on the site where someone without credentials can create anything, and the same login system protects the staff area. So signing up hands out no permissions, and a person approves every producer.

While your request is pending, `/account` shows its status. If it is declined you see the reason and can apply again.

### 3.2 Creating a draft

Everything you type stays private: *"Drafts stay private. Submitted festivals remain private until approved."* Save as often as you like. You can edit while a submission is a draft or has changes requested.

Required before you can submit: festival name, description (at least 20 characters), contact name and email (both kept private), location, city, state, ZIP, and dates. All times are Philadelphia time.

If you are unsure your address will show up on the map, press **"Find address"** under the location field and pick from the suggestions — see section 5.

**Image uploads are currently disabled** pending a security scanner — see section 6.

### 3.3 Submitting and responding to feedback

Submitting locks the record while staff review it. **Submitting does not publish anything.**

If an editor asks for changes, your submission becomes editable again and their message appears at the top of the editor. Fix the items and resubmit.

### 3.4 What stays private

| Information | Who sees it |
|---|---|
| Draft content before publication | You and editors |
| Contact name, email, phone | **Editors only, always** — never on public pages or in calendar files |
| Editors' internal notes | Editors only — never sent to you |
| Editors' messages to you | You |

---

## 4. Editor and admin guide

Sign in and use the navigation bar across the top of the admin area — Dashboard, Festivals, Pending Review, Imports, Producer Access, Sponsors, Email Templates, Schedules, and Settings.

### 4.1 The editorial queue (`/admin/festivals`)

Lists every festival with its state, revision number, and last update. Filter by state using the chips, and **search by name or location and filter by date range**. Filters stay in the address bar, so a filtered queue can be bookmarked or shared.

### 4.2 Workflow states

| State | Meaning | Public? |
|---|---|---|
| `draft` | Being written, or created by the importer | No |
| `pending_review` | Waiting for an editor | No |
| `changes_requested` | Sent back with feedback | No |
| `rejected` | Declined | No |
| `approved` | Accepted — **still not public** | No |
| `published` | Live on the public site | **Yes** |
| `unpublished` | Pulled from public view, not deleted | No |
| `canceled` | Was public, now canceled — shows a notice | Yes (notice only) |
| `archived` | Permanently private, final | No |

### 4.3 Approving does not publish

**The single most important rule.** Moving a festival to `approved` records your decision but changes nothing publicly. It goes live only when you take the separate action of publishing it. This is deliberate — it lets you accept a submission and choose the moment it appears.

### 4.4 Editing festival content

Open a festival and use **Edit details** to correct the name, description, location, contact details, dates, website, or image — and to mark it as featured.

Every edit requires a short internal reason and is recorded with a full snapshot of what changed, so the history always shows who changed what and why.

*(Version 1 of this guide correctly stated that editors could not edit festival content. That limitation is now resolved.)*

### 4.5 Taking a workflow action

The action form offers only the moves that are legal from the current state, and asks for:

- **Internal reason** — private to editors. Required for changes requested, rejected, canceled, and archived.
- **Producer message** — sent to the producer. Required for changes requested and rejected.
- **Public cancellation message** — required for cancellation, and the only place public text is allowed.

If someone else changed the record while your page was open you will see *"Revision conflict. Reload before taking another action."* Reload and redo it — this stops two editors overwriting each other.

### 4.6 Cancelling rather than deleting

A canceled festival keeps its page, showing a red notice with your message, so existing links and search results do not break. **There is no delete anywhere in the festival workflow.** Use `archived` to retire a record permanently while preserving its history.

### 4.7 Approving producers (`/admin/producer-requests`)

Requests appear here with the applicant's organization, festival, and message.

- **Approve** grants the producer role immediately and records the decision.
- **Decline** requires a reason, which the applicant sees and can act on before reapplying.

Approving the person is not approving their festival — their submissions still go through editorial review.

⚠️ If account emails are switched off, this page shows an amber banner reminding you that applicants are **not** being notified. Tell them another way, or turn emails on (section 6).

### 4.8 Email templates (`/admin/email-templates`)

The wording sent to producer applicants — both the approval and the decline — is editable here, with a live preview. No developer and no deployment needed.

Insert details using placeholders such as `{{name}}` and `{{reason}}`. The screen lists which placeholders each template supports and warns you if you type one that does not exist.

### 4.9 Sponsors (`/admin/sponsors`)

Three placements: **left rail**, **right rail**, and the **footer band**.

For each sponsor: a name, an image link, a click-through link, alt text for screen readers, a display order, and optional start and end dates so a sponsorship stops showing on its own.

Two things to know:

- **On smaller screens the side rails do not disappear** — those sponsors move into the footer band, so a rail advertiser still gets their impression on mobile.
- **These are self-hosted images, not Google AdSense.** The site's security settings block third-party ad scripts by design. That means direct-sold sponsorship rather than automated ad revenue — worth more per slot at this traffic level, but **you supply the artwork**. Host the image and paste its link; there is no upload on this screen yet.

### 4.10 Moderating the social feed

Configure a festival hashtag and provider at the bottom of the festival page. Incoming posts arrive as **pending** and are never public until approved. Hiding or rejecting requires a written reason, and that history cannot be altered.

Recommended response times: review pending posts within one business day, within four hours on an active festival day, and hide a previously approved post **immediately** on any credible safety, rights, harassment, impersonation, or privacy report. Primary moderator **Iris Sun**, backup **Uraiba Zafar**.

### 4.11 User accounts (`/admin/settings`)

Create accounts, change roles, and deactivate or reactivate.

| Rule | Detail |
|---|---|
| Roles | `public`, `producer`, `admin`, `super_admin` |
| Creating staff accounts | **Only a super admin** can create or manage an admin |
| Self-deactivation | Blocked |
| Deletion | **There is none.** Accounts are deactivated, which preserves history |

Keep at least two working super admin accounts so nobody is locked out.

---

## 5. Locations and the map

Festivals appear on the map once their written address has been matched to map coordinates. This happens automatically.

- **New submissions** are matched by a background job, usually within about ten minutes.
- **Changing an address** automatically re-matches it. The festival briefly leaves the map rather than showing a pin at the old address — a confidently wrong pin is worse than none.
- **"Geocode now"** on the festival page does it immediately if you do not want to wait.
- If matching fails, the festival page explains why in plain language.

**Current coverage: 238 of 415 festivals.** The rest break down as:

- **90 have no address at all** in the source data. These need an address from you or the organizer.
- **31 say things like "Various Locations", "Citywide", or "TBD"** — real answers, but not ones a map can plot.
- **54 have addresses the mapping service cannot resolve** — block ranges ("4th Street, between Lombard and Catharine"), intersections, a typo, or two addresses run together.
- **2 resolved to somewhere outside the greater Philadelphia region**, so they were rejected rather than pinned in the wrong place.

### Fixing an address that will not map — "Find address"

Correcting the location in the editor is usually enough; the system re-matches automatically. But some addresses fail no matter how many times the system retries — a venue name with no street address ("9th Street Italian Market", "The Mann Center for the Performing Arts", "Xfinity Live!") gives the automatic matcher nothing to fall back on.

For those, there is a **"Find address"** button directly under the location field, in **both** the producer submission form and the admin festival editor:

1. Type whatever you know into the location field.
2. Press **Find address**. The system asks the mapping service and shows up to five real candidate addresses.
3. Pick the one that is right and press **Use this address**. It replaces the location text.
4. Save as normal.

Two things worth knowing:

- It only proposes **address text** — it never places the pin itself. The pin still comes from the normal automatic matching once you save, so there is exactly one thing deciding where a festival sits on the map.
- Candidates outside the greater Philadelphia region, or too vague to be useful (a whole state, a whole country), are filtered out before you see them.

Giving producers the same tool is deliberate: it stops bad addresses entering at the source, while the admin-side copy covers the imported backlog, which has no producer to ask.

**Note:** the ~87 festivals that already failed to match are not fixed retroactively by this. Someone needs to open each one and click through the panel. This is a tool, not a bulk repair.

---

## 6. What is switched off, and why

Everything below is built and tested but deliberately inactive. Each fails safely — when unconfigured, the feature reports an honest failure rather than pretending to work.

### Email

**No email is sent to anyone today.**

Producer decisions and festival notifications share one email provider. The festival notifications are addressed to **organizer contact details taken from the source spreadsheet** — roughly 1,600 queued messages to people who never signed up for anything.

So account emails sit behind their own separate switch. **Adding an email account alone will not start emailing organizers** — both settings have to be turned on, deliberately and separately.

> **Decision needed:** whether organizers should ever be emailed at all. That deserves its own conversation, separate from turning on applicant emails.

### Producer image uploads

Disabled until a malware scanner and an audited storage folder are configured. Do not promise uploads to producers yet.

### Social feed synchronisation

Adapters are built but no provider account is connected, so no posts arrive. Public pages show a stable empty state.

### Organizer marketing emails

Visitor consent is captured and stored correctly, but no organizer message is ever delivered today.

---

## 7. Time handling

Everything uses **Philadelphia time** (`America/New_York`).

- Times entered by producers are Philadelphia wall-clock times.
- All-day festivals stay date-only and cannot drift by a day.
- Date filters are calculated against the Philadelphia calendar, including across daylight-saving changes.
- Calendar exports use precise instants for timed events, so summer/winter changes do not shift them.

---

## 8. Things that look like bugs but are not

| What you'll see | Why |
|---|---|
| The public site shows no festivals | All 405 are unpublished. See the box at the top. |
| Searching "beer" returns nothing | The source spreadsheet had 11 columns and no description field. Imported festivals are searchable by **name, location, and category only**. "Odunde" matches; "beer" does not. |
| No festival photos anywhere | None of the imported festivals came with imagery. Branded placeholders fill the gap. |
| "Ongoing · through Oct 4" under an August date | The festival genuinely spans months. The spreadsheet gave a start and end date and nothing about which days inside that window it actually runs — so we never claim it "recurs". |
| Only about half the festivals are on the map | See section 5. |
| Scrolling over the map does not zoom | Deliberate, so the map does not hijack page scrolling. |
| A festival is approved but not on the site | Approving does not publish. See 4.3. |
| Publishing is refused | The festival needs exactly one valid date. Correct the dates and retry. |
| `qa-producer-flow@example.test` in Settings | A test account from verification. Deactivated and cannot sign in; account history is permanent by design, so it cannot be deleted. |

---

## 9. Open decisions we need from the client

1. **Republishing the catalog** — see the box at the top of this guide.
2. **Whether organizers may be emailed at all** — see section 6.
3. **Festival imagery** — pulling photos from organizer websites raises copyright and storage questions.
4. **Recurring events** — eight festivals are stored as one long date range when some are really "every Sunday, May to October". Fixing this needs either a short note you write or the actual dates.
5. **About and Tours page copy and images** — both still placeholder.
6. **Sponsor artwork**, if you want the ad slots filled at launch.
7. **Privacy and terms** — `/privacy` and `/terms` are labelled "Draft policy — pending legal approval" on the page itself and **must be replaced with legally approved copy before any public launch.**

---

## 10. Known limitations

1. **Sign-up does not verify email addresses.** Anyone can register with an address they do not control. Low risk today because registering grants nothing and a person approves producer access — but worth closing before the site is promoted publicly.
2. **Schedules do not sync across devices** and are lost if browser data is cleared. This is by design.
3. **Calendar exports are snapshots** and do not update if a festival changes.
4. **Imported festivals need editorial review.** They arrive as private drafts with no owner and cannot shortcut to public.
5. **Imported records are never deleted.** A bad batch is archived through the normal workflow and repaired forward.
6. **Privacy and terms copy is draft** — see section 9.
7. **Quality targets still need formal sign-off:** accessibility (WCAG 2.2 AA), performance budgets, SEO metadata, analytics review, backup and recovery objectives, and provider cost thresholds.
8. **Contact addresses are personal university accounts.** Confirm they remain available after handoff and replace them with organization-owned aliases before operational activation.
9. **Festival source data must stay out of the repository.** The organizer contact spreadsheet is excluded going forward, but exists in earlier history. Treat repository access as access to organizer contact details until a scheduled cleanup.

---

## 11. Troubleshooting and who to contact

### Owner assignments

Confirm these before any operational activation.

| Area | Primary | Backup |
|---|---|---|
| Product and visual acceptance | Simran Kaur | Mengqi Cao |
| Producer / editorial workflow | Uraiba Zafar | Iris Sun |
| Consent, privacy, communications | Mengqi Cao | Simran Kaur |
| Social moderation | Iris Sun | Uraiba Zafar |
| Release acceptance and incidents | Simran Kaur | Iris Sun |

### Common situations

| Symptom | What to do | Owner |
|---|---|---|
| A festival is approved but not public | Publish it — a separate action from approving | Uraiba Zafar |
| Publishing fails | Correct the festival's date data, then publish | Uraiba Zafar |
| "Revision conflict" message | Reload the page and redo the action | Uraiba Zafar |
| An action is refused for a missing reason | Fill in the required internal reason or producer message | Uraiba Zafar |
| A producer applicant was not emailed | Expected — account emails are off (section 6). Contact them directly | Mengqi Cao |
| A festival is missing from the map | Correct its address, or use "Find address" to pick a real one, then press "Geocode now" | Uraiba Zafar |
| Emailing a schedule fails | Expected until email is activated. The saved schedule is unaffected | Mengqi Cao |
| A producer cannot upload an image | Expected — uploads are disabled. Do not promise them yet | Simran Kaur |
| The social feed is empty | Expected until a provider is connected | Iris Sun |
| An unsafe post is publicly visible | **Hide it immediately** with a documented reason, then escalate | Iris Sun → Mengqi Cao |
| "Festival listings are temporarily unavailable" | The database could not be reached — escalate | Simran Kaur |
| A visitor lost their saved schedule | Expected — schedules are browser-local | Simran Kaur |
| An admin cannot change another admin's role | Only a super admin can | Simran Kaur |
| An account should be removed | Deactivate it; deletion does not exist | Simran Kaur |

### Escalation

For anything involving safety, personal data, rights or takedown requests, or a suspected credential exposure, contact the privacy owner (**Mengqi Cao**, backup **Simran Kaur**) and the incident coordinator (**Simran Kaur**, backup **Iris Sun**) at the same time.

---

## 12. Where to find more

| Document | Use it for |
|---|---|
| `Known-Issues.md` | Current caveats and client callouts, plain language |
| `ISSUE.log` | Engineering detail behind each known issue |
| `docs/Client-Call-Walkthrough-Script.md` | Running a live demo of the application |
| `docs/Technical-Developer-Guide.md` | Developer and operator implementation guide |
| `docs/N8N-Owner-Guide.md` | Non-technical owner guide for automation approvals |
| `docs/FESTIVAL-DATA-IMPORT-RUNBOOK.md` | Step-by-step festival data import |
| `docs/SOCIAL-FEED-OPERATIONS.md` | Social provider setup, moderation policy, incident response |

**Before asking for help**, note which page you were on, which role you were signed in as, the festival name and its current state, and the exact on-screen message. That is usually enough to resolve an issue without exposing private data. **Never paste passwords, keys, private contact details, or the raw festival spreadsheet into a ticket, chat, or email.**
