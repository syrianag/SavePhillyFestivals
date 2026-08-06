# Client Feature List — DiasporaDNA Check-In & Handoff Call

**Call date:** August 6, 2026 (Thursday)
**Source:** `docs/DiasporaDNA Launchpad Interns CheckIn & Handoff Document_otter_ai/` (Otter.ai summary + full transcript)
**Clients:** Monica Montgomery, Ava (DiasporaDNA)
**Delivery team:** Rob Thomas ("Speaker 1" in the transcript), Alan Perez, Syriana, William

## How to read this

Every feature below is something the **client asked for on this call**. Nothing here is
inferred from the roadmap or invented to round out a category. Each entry carries:

- **Client said** — the request, with the transcript line it came from
- **Acceptance** — what "done" looks like, stated so it can be tested
- **Repo state** — what already exists in this codebase, verified by reading the source
- **Gap** — the actual remaining work

### Attribution caveat on Ava

Ava is named as a client but **never speaks on this call**. Monica says twice that she will
forward "the questions that Ava shared with me" by email (transcript lines 194, 338). Those
questions are not in this transcript and are not reflected below. Treat this document as
**Monica-stated requirements only**, and expect a second pass once Ava's email arrives.

---

## Workstream A — Website (Save Philly Festivals)

### A1. Festival data import — ~400 events from Monica's spreadsheet

**Client said:** Rob: "It ended up being like over 400 events… I created a process that's
uploading that as we speak… because it kept crashing out because it was too much data at
once. As soon as that's done, I'll send you a link" (line 230). Monica's own test searches —
"Odunde Festival" and "beer" — both returned nothing (lines 209–229).

**Acceptance:** All ~400 rows are loaded and published; searching "Odunde" and "beer" on the
live staging site each return the expected festivals; Monica has the staging link and confirms
the data looks right.

**Repo state:** A full import pipeline exists — `src/features/festival-import/` with
`FestivalImportBatch/Row/Issue` models and an admin review UI at
[admin/imports](apps/save-philly-festivals/src/app/admin/imports/).

**Gap:** Finish the run, then **publish the imported rows** (see A11 — imported festivals land
in `draft` and are invisible to public search until transitioned to `published`), then verify
by search rather than by row count. This is the **blocker for A2 and A3** — the calendar and
the map both read from the same catalog, and neither can be demoed convincingly against an
empty database.

**Priority:** P0 — everything else Monica wants to test depends on it.

---

### A2. Calendar — click a date, see that day's festivals

**Client said:** Monica: "my idea was like someone click on a date and they would see all the
festivals happening that day — is that still a functionality that we can do?" (line 257).
Answer on the call: "that is still a functionality, but it's not implemented yet" (line 259).

**Acceptance:** On [/calendar](apps/save-philly-festivals/src/app/(public)/calendar/page.js),
clicking a date filters to festivals occurring on that date, sourced from the same database
producers publish into — not a static list.

**Repo state:** The page loads the real catalog via `getPublicFestivalCatalog()` and renders
[CalendarClient.jsx](apps/save-philly-festivals/src/features/schedule/CalendarClient.jsx)
(425 lines). Date selection is **half-wired already**: there is a `selectedDay` state and the
calendar widget receives
[`onSelectDay={setSelectedDay}`](apps/save-philly-festivals/src/features/schedule/CalendarClient.jsx#L344-L345),
so clicking a date updates the highlighted day. What it does not do is filter anything — the
`grouped` memo that builds the festival list depends only on
[`cards`, `filters`, and `searchQuery`](apps/save-philly-festivals/src/features/schedule/CalendarClient.jsx#L299-L315).
`selectedDay` is written and never read. That is why the behavior Monica saw matches "not
implemented" even though a handler exists.

**Gap:** Smaller than it looks — add `selectedDay` to the `grouped` dependency list and filter
on it, then decide the interaction detail: does clicking a date *filter* the list to that day,
or *scroll* to that day's existing group heading? The list is already grouped by date, so
scroll-to-day preserves browsing context and is the cheaper, less destructive option; a filter
needs a visible "clear" affordance or users get stranded on an empty day. Rob also flagged
unused vertical space on this page (line 254), which the per-day panel fills, and which
overlaps with the ad placement in A4.

**Priority:** P0 — explicitly promised for the Friday build.

---

### A3. Map tab — plot festival locations

**Client said:** Monica: "I also feel like I mentioned having another tab for like a map that
we can pull from ArcGIS or Google Maps, where we can go in and plot pinpoints of where
festivals are happening" (line 305). Rob: "the map, I was having some challenges with seeing
this map come in… when you clicked on it, it was just not presentable. So we just disabled it
for now" (line 311).

**Acceptance:** A map tab renders Philadelphia with one pin per published festival; clicking a
pin opens that festival. Provider choice (ArcGIS vs. Google Maps) is Monica's call — she named
both without preferring one.

**Repo state:** **No map exists in this codebase.** No mapping dependency is installed, and
critically, the `Festival` model in
[schema.prisma](apps/save-philly-festivals/prisma/schema.prisma) has **no latitude/longitude
fields** — only `location`, `city`, `state`, `zip_code` as free text.

**Gap:** Larger than the call implied. This needs, in order: (1) geo columns on `Festival`
plus a migration, (2) a geocoding pass over the imported ~400 rows to turn free-text
addresses into coordinates, (3) a map provider decision, and (4) the CSP in
`next.config.mjs` — currently strict, with no external script or style origins — must be
extended for whichever provider is chosen, or the map will be silently blocked. That CSP
interaction is a plausible cause of the "not presentable" behavior Rob described.

**Priority:** P1 — real client ask, but it is the one item on this list that will not
credibly land in the Friday build. Recommend scoping it explicitly to the post-handoff
window rather than letting it slip quietly.

---

### A4. Sponsored ad space — side rails on all pages, plus a footer ad

**Client said:** Monica: "there is a lot of real estate on the page, and ultimately, there's
nothing but space and opportunity for sponsored space… ad space on the sides, on the bottom"
(line 305). Asked where: "On all the pages, right and left. These big chunks of space feel
ripe for that. And then let's go to the bottom… beneath this, our sponsor is like a footer
ad" (line 314). On format: "some people do the square boxes, and some people do long
rectangles. Feel free to do whatever you think fits well on the page that doesn't overwhelm
it" (line 314).

**Acceptance:** Left and right ad slots on every public page, plus a footer ad slot. Slots
degrade gracefully when empty — no blank boxes on a page with no sponsor. Format is the
team's judgment call; Monica delegated it.

**Repo state:** A hardcoded `SPONSORS` array renders only on the
[about page](apps/save-philly-festivals/src/app/(public)/about/page.js#L7). No ad slot
component, no per-page placement, nothing in
[Footer.jsx](apps/save-philly-festivals/src/components/shared/Footer.jsx).

**Gap:** Build a reusable ad-slot component and place it in the public layout so it applies
to every page at once. Note the constraint: the CSP blocks external ad networks by design, so
these are **self-hosted sponsor images**, not a third-party ad tag. Worth stating plainly to
Monica — it changes how sponsors get onboarded.

**Priority:** P0 — this is Monica's revenue ask and the one she pushed hardest on.

---

### A4b. Admin UI for managing ad placements

**Source:** Added after the call by Rob — the client needs to change sponsor placements
herself, not file a ticket. This resolves open question 4 below: a config file is **not**
acceptable for handoff.

**Acceptance:** An admin screen where Monica can, without a developer: upload a sponsor
creative, choose which slot it occupies (left rail, right rail, footer), choose which pages or
page groups it appears on, set an active/inactive state, and reorder or rotate multiple
sponsors within one slot. Changes appear on the public site without a redeploy.

**Repo state:** Nothing exists — sponsors are a hardcoded array in one page's source. The
supporting patterns do exist, though, and this should be built on them rather than inventing a
parallel stack:

- `src/app/admin/` already has role-gated screens (`festivals`, `imports`, `pending`,
  `schedules`, `settings`), so the route group, layout, and authorization are solved.
- Image upload is solved by the producer asset endpoint (`api/producer/festivals/[id]/assets`)
  and `FestivalAssetPurpose`; sponsor creatives need the same treatment, not the retired
  `/api/upload` route (it returns 410).
- A new feature directory `src/features/sponsors/` should follow the repo's standard layering
  (`-schema`, `-http`, `-authorization`, `-service`, `-repository`), since that convention is
  contract-tested elsewhere.

**Gap:** This needs a schema migration — a `Sponsor` model (creative asset, alt text, target
URL, slot, page scope, active flag, sort order) plus a migration, then the admin CRUD screen,
then the public slot component from A4 reading from the database instead of a constant. The
admin components must import `Button`/`Badge`/`Card`/`Dialog` from `@/components/ui/*` or
`tests/unit/ui-components-contract.test.js` will fail the build.

**Decisions still needed from Monica:** (1) Is page scope per-page, or just "all public
pages" plus optional exceptions? All-pages-with-exceptions is far cheaper and matches what she
actually asked for on the call. (2) Do multiple sponsors rotate in one slot, or is it one
sponsor per slot? Rotation is a meaningful jump in scope. **Recommend shipping one sponsor per
slot with an ordered list, and deferring rotation.**

**Priority:** P1 — the public slots (A4) are what Monica sees on the 14th, but without this
she cannot operate the feature after handoff, which is the same failure mode B5 describes for
the automations. Sequence A4 first, A4b immediately behind it.

---

### A5. Festival imagery in search results

**Client said:** Monica: "I want to see something visual that looks like either the festival
marketing flyer or an image of the festival" (line 239), and "if we need stock photos, if we
need to get some of those to put in here" (line 245). Rob: "if I don't have an image, I'll put
a placeholder, or I'll have it generate like a branded image of some sort so that we know that
okay, this one needs to be updated" (line 248).

Monica separately asked whether an Instagram/social handle in the spreadsheet could auto-pull
an image (line 233). Rob deferred this: "Not today, but we can add that feature" (line 236).
**Log the social-image pull as a distinct, deferred item — it was not agreed to.**

**Acceptance:** Search result and festival cards show a flyer or event photo where one exists,
and a visually distinct branded placeholder where one does not — distinct enough that Monica
can scan the site and see which festivals still need artwork.

**Repo state:** `Festival` already has `logo_url` and `image_url`, and there is a
`FestivalAssetPurpose` enum (`logo`, `hero_image`, `gallery_image`) with a working producer
upload endpoint at `api/producer/festivals/[id]/assets`. The legacy `/api/upload` route is
retired and returns 410.

**Gap:** Two pieces. First, the CSV importer
([festival-import-csv.js](apps/save-philly-festivals/src/features/festival-import/festival-import-csv.js))
has **no image or logo column mapping** — imported festivals arrive with no artwork at all.
Second, the placeholder treatment needs to exist in `FestivalCard`/`FeaturedFestivalCard`.

**Priority:** P0 for the placeholder (it is what makes the ~400 imported rows look
finished); P2 for social-image auto-pull.

---

### A6. "Free" language on the producer signup page

**Client said:** Monica: "should we put the word free? 'Showcase your festival for free across
Philadelphia' — so people know it's not like they have to pay to be a part of this" (line 281).

**Acceptance:** The producer landing headline reads "Showcase your festival **for free**
across Philadelphia."

**Repo state:** The headline is currently "Showcase your festival across Philadelphia"
([producer/page.js:13](apps/save-philly-festivals/src/app/(public)/producer/page.js#L13)) —
Monica's exact sentence minus the two words.

**Gap:** A one-line copy change. Trivial, and Monica named it specifically, so it should not
be the thing that gets forgotten.

**Priority:** P0 — smallest item on the list, highest ratio of client visibility to effort.

---

### A7. Producer signup requires an account (confirmed, not changed)

**Client said:** Rob: "there was a conflicting statement… One was like this could be anonymous,
and there was another version where you had to sign up to create it. I went with the version
of sign up to create it because I assume you want to track who's creating events." Monica:
"Yes" (lines 278–280).

**Acceptance:** No change. This entry exists to **close an open requirements conflict** —
Monica ratified authenticated submission on this call. Do not reopen it without her.

**Repo state:** Already built — Auth.js v5 with role-gated `producer` routes.

**Priority:** Resolved. Record it in the handoff document so the ambiguity does not resurface.

---

### A8. Producer "how it works" three-step flow

**Client said:** Monica: "so this is like the steps, the 1-2-3, of what they do and how it
works" (line 287). Rob: "the last piece that I haven't added yet is the thing that goes behind
here, like these actual three steps: sign in, create it, and then publish, and then be done"
(lines 290–296).

**Acceptance:** The three advertised steps — sign in, create, publish — are each wired to the
real flow, not display-only copy.

**Repo state:** Producer routes exist for `submit`, `dashboard`, `festivals`, `schedule`, and
`success`, so the underlying flow is real; the landing page steps need to connect to it.

**Priority:** P1.

---

### A9. Digital exhibit tab — with upload instructions

**Client said:** Monica: "we had a digital exhibit that we wanted to have a tab for as well"
(line 305), and then, importantly: "in your handoff document, if you can add these elements,
please do add instructions, especially for the digital exhibit. We don't have it to give to
you yet, but like, how would we upload images or photos for the digital exhibit to that page?"
(line 320). Rob: "we don't have that functionality today, so we would definitely need to
consider that" (line 322).

**Acceptance:** Monica's actual near-term ask is **documentation, not a feature** — she wants
the handoff document to explain how DiasporaDNA would upload exhibit images once they have the
content. A placeholder tab with that guidance satisfies what she asked for on this call.

**Repo state:** No digital exhibit route or model. The asset pipeline
(`FestivalAssetPurpose.gallery_image` + producer upload endpoint) is the natural foundation
if this later becomes a real feature.

**Gap:** Write the upload instructions into the handoff doc now. Build the tab as a
placeholder. Do not build an exhibit CMS — the client has no content for it yet and did not
ask for one.

**Priority:** P1 for the documentation, deferred for the functionality.

---

### A10. About and Tours pages — content still placeholder

**Client said:** Rob: "the about page… we have the placeholder images here for whatever you
want to add. And then tours — I wasn't sure where you wanted to go here, so I just kind of put
what made sense at the time, but we could definitely doctor this up" (line 272).

**Acceptance:** Monica supplies About copy/images and states the intent of the Tours page;
the team implements from that.

**Gap:** **Client-blocked, not team-blocked.** This is content DiasporaDNA owes the team, and
it should be called out explicitly in the feedback document so it does not read as a team
miss on the 14th.

**Priority:** P1, blocked on client input.

---

### A11. Search must return the imported festivals from the database

**Client said:** This is the mechanism behind A1's acceptance test. Monica searched "Odunde
Festival" and "beer" and got nothing back (lines 209–229); the agreed proof that A1 is done is
that those two searches return results on the live site.

**Acceptance:** A search on the public site executes against the PostgreSQL catalog and
returns festivals that entered the database through the CSV import — the same rows whose
parsing contract is asserted by
[tests/unit/festival-import-csv.test.js](apps/save-philly-festivals/tests/unit/festival-import-csv.test.js).
Verified end-to-end, not by row count: import a file, publish the rows, search a name from
that file, get the festival back.

**Repo state — search is already database-backed.**
[public-discovery.js](apps/save-philly-festivals/src/features/festivals/public-discovery.js)
issues a real Prisma query and matches a search term against `name`, `description`,
`location`, `city`, and category name. There is no static list and no missing wiring. **The
search feature is not the problem.**

**The actual problem is the publication gate, and it is not currently in A1's plan.**
Two facts from the source, in sequence:

1. The importer creates every row as a draft —
   [festival-import-repository.js](apps/save-philly-festivals/src/features/festival-import/festival-import-repository.js#L294-L295)
   sets `status: "draft", workflow_state: "draft"`.
2. Public discovery returns published rows only —
   [publication-policy.js](apps/save-philly-festivals/src/features/editorial-workflow/publication-policy.js)
   defines `publishedDiscoveryWhere` as `{ workflow_state: "published" }`, and search, the
   calendar, and the festival grid all use it.

So **finishing the import will not make "Odunde" searchable.** All ~400 rows will sit in
`draft` and remain invisible until they are transitioned draft → pending_review → approved →
published through the editorial workflow. If the Friday delivery treats "import completed" as
"A1 done", Monica will run her same two searches, get the same empty results, and reasonably
conclude nothing was fixed. **This is the single highest-risk item on the Aug 7 list**, because
the work looks finished from the team's side and looks unchanged from hers.

**Gap:**

1. A bulk publish path for an import batch. Publishing ~400 festivals one at a time through
   the admin UI is not viable in the time available, and the transition writes
   `FestivalTransition` and `FestivalRevision` audit rows per festival — so this needs to go
   through the editorial workflow service rather than a raw `UPDATE`, or the audit trail
   silently breaks.
2. A deliberate decision on whether imported rows *should* auto-publish. The draft default is
   a correct safety design — it exists so unreviewed third-party data cannot appear on a public
   site. Bypassing it for 400 unreviewed rows is a real editorial choice, and it is Monica's
   call, not a technical detail. Recommend asking her directly: publish all imported festivals
   immediately, or review-then-publish in batches?
3. Verification by search, per A1 — with both of Monica's exact terms.

**Known limitation to flag now: "beer" will probably still return nothing.** The CSV contract
is exactly 11 columns
([festival-import-csv.js](apps/save-philly-festivals/src/features/festival-import/festival-import-csv.js#L1-L13):
Festival Name, Start Date, End Date, 2027 Dates, Location, Type, Website, Organiser/Contact,
Contact email, Contact Phone, Email sent?). There is **no description column**, and the
importer does not populate `description`, `city`, or imagery. Imported festivals are therefore
searchable by name, location, and mapped category only. "Odunde" will match — it is in the
festival name. "beer" matches only if a festival is literally named that or its `Type` maps to
a beer-ish category. Worth telling Monica before she tests, and worth checking the source
spreadsheet's `Type` values against the category alias map to see what her second search will
actually do.

**Priority:** P0 — this is the difference between A1 being demonstrably done and appearing
untouched.

These run in `apps/n8n` and are governed by the repo's activation rule: workflows are
inactive and draft-only until an operator explicitly approves activation. Nothing on this call
changes that.

### B1. Outreach coordination workflow — finish configuration

**Client said:** Alan walked the full flow (line 14): Google Sheets row-added trigger →
validate required fields (name, email, organization) → Gemini agent drafts the email → Gmail
node creates a **draft, never a send** → status written back to the sheet as "draft ready."
Monica confirmed her mental model: "I would look at my drafts in Gmail and see it's already
drafted" (line 56).

**Acceptance:** DiasporaDNA staff add a contact row and a reviewable Gmail draft appears, with
the row's status updated. Draft-only behavior is preserved — Alan called it "a layer of
protection… so that you can review the email first" (line 14).

**Repo state:** `apps/n8n/DiasporaDNA.json` is intentionally inactive and creates Gmail drafts
only. Contract tests live in `apps/n8n/tests` with fixtures covering invalid input,
duplicates, prompt injection, and provider failure.

**Priority:** P0 — Alan reported this one essentially complete.

---

### B2. Welcome letter / onboarding automation

**Client said:** Monica: "we usually add a PDF of a W-9 form and an NDA and a non-compete
clause… The letter itself is in the body of the email with hyperlinks" (line 71). She has an
existing template: "the letter that you all got… that is the template, so you can liberally
copy from that" (line 104). She also asked for the emergency-contact form: "we ask them to
fill out a contact form, so we have their name and emergency contact… can that be added as a
final step?" (line 110).

**Requirement Monica raised unprompted — do not lose it:** "sometimes we're sending letters
to a volunteer to welcome them to volunteer with us, and sometimes it's for a contractor to be
on staff" (line 104). Alan confirmed a branch on volunteer vs. staff (line 107).

**Acceptance:** A new hire or volunteer row produces a draft welcome email that (a) uses
Monica's template, (b) auto-fills the recipient's name, (c) branches on volunteer vs.
contractor, and (d) attaches the W-9, NDA, non-compete, and the emergency-contact Google Form
link.

**Gap:** **Blocked on Monica** — she owes Alan the W-9 template, NDA, non-compete, and the
Google Form link (line 122: "I'm gonna send you the attachments… and then the Google form
link"). She committed to sending these and answering Alan's open questions "today."

**Priority:** P0, client-blocked.

**Scope note:** Monica narrowed this herself — "Let's just focus on welcome letters. A
different type of HR notice I would send personally" (line 98). General HR notices are **out
of scope**; Alan is removing that branch.

---

### B3. Weekly project bottleneck report

**Client said:** Alan proposed a weekly schedule; Monica: "There is no current process for
identifying bottlenecks, but sure, let's try" (line 128). The workflow categorizes project
status as overdue, stalled, unassigned, or at risk, then generates a report via an AI agent
(line 149). Alan chunks the data by project before the agent to avoid hallucination from
oversized context (line 155).

**Trigger decision — Monica overrode the proposal:** Alan suggested a Friday-midnight
schedule; Monica chose Monday.com instead — "let's put a Monday.com trigger because that's
where we're ultimately headed, and even though it's not active yet, we're going to start
loading information in there" (line 164).

**Acceptance:** Weekly report of categorized project bottlenecks, triggered from Monday.com.

**Gap:** **Blocked on DiasporaDNA's Monday.com rollout** — "we're still trying to get up and
running with Monday.com. That has been slow going… it's not currently active" (line 134).
Google Sheets stays as the test-run source until then.

**Priority:** P2 — client interest is real but exploratory ("sure, let's try"), and the data
source does not exist yet.

---

### B4. Book archiving via image analysis

**Client said:** Monica raised this herself and treated it as the higher priority — "More
importantly, did you look into anything around like the archiving process if we take a picture
of a book and what's possible there?" (line 176). Alan: the Gemini "analyze image" node looks
promising; upload an image as the trigger, then "take a look at the other steps and see if
it's possible to categorize the books" (line 179).

**Acceptance:** A scanned book page is processed through image analysis and produces
categorized, archivable output that Monica can experiment with. Rob framed the near-term bar
as a testable prototype: "We need to have that tested and ready to go so that she can play
around with that" (line 182).

**Priority:** P1 — Monica's word "more importantly" makes this her top automation ask after
the two email workflows.

---

### B5. Front-end control panel for the automations

**Client said:** Rob, on Monica's behalf: "I would like to see an interface that she gets to
work with. I don't think it's valuable to be back here inside this n8n space doing work. So
let's put something in on the front side of this thing that makes it a lot easier to interface
with what you've created" (line 182).

**Acceptance:** Monica can trigger, monitor, and manage the automations without opening the
n8n canvas or touching a node.

**Priority:** P1 — this is the difference between a demo and something DiasporaDNA can
actually operate after handoff on the 14th.

---

### B6. Newsletter contact import — DROPPED by the client

**Client said:** Alan raised a legal concern: "there are some legal concerns… people have to
opt in to be sent these letters" (lines 167–173). Monica: "Okay, we can skip that one"
(line 176).

**Status:** **Out of scope by client decision.** Recorded here so it is not silently revived.

**Repo note:** This codebase already implements consent correctly for the festival side —
`src/features/organizer-consent/` with an explicit consent model and a send outbox. If
newsletter import ever returns, that is the pattern to extend, and the opt-in requirement is
already satisfied by design.

---

## Commitments and dates from the call

| Owner | Commitment | Due |
|---|---|---|
| Monica | Send Alan the W-9, NDA, non-compete, and emergency-contact form link | Aug 6 (same day) |
| Monica | Answer Alan's workflow questions doc, including Ava's questions, by email | Aug 6 (same day) |
| Alan | Send the workflow questions + draft documentation to Monica and Ava, cc Rob | Immediate |
| Rob | Finish the ~400-festival import, send Monica the staging link | Before Aug 7 |
| Rob | Deliver the updated site for team testing | Fri Aug 7, afternoon |
| Monica | Return the marked-up feedback document | Wed Aug 12 |
| Rob | Implement feedback changes | Fri Aug 14 |
| Both | Final handoff; client testing week follows | Aug 14 |

Rob's framing of the last stretch: "the 14th will be what we turn over to you, but that final
week will be you guys testing to make sure everything works right" (line 329).

---

## Open questions for Monica and Ava

1. **Ava's questions are not captured anywhere.** Monica is forwarding them by email. Until
   they arrive, this feature list represents one of two named clients.
2. **Map provider** — ArcGIS or Google Maps? Monica named both without choosing. The decision
   affects licensing cost and the CSP change in A3.
3. **Geocoding the imported data** — the ~400 spreadsheet rows carry free-text locations. Does
   Monica expect the team to geocode them, or will DiasporaDNA supply coordinates?
4. **Ad inventory model** — self-hosted sponsor images are the only option under the current
   CSP. Who supplies the creative? *(The admin-UI half of this question is now answered: an
   editing UI is required, not a config file — see A4b. Still open within it: per-page scope
   vs. all-pages, and whether multiple sponsors rotate in one slot.)*
5. **Tours page intent** — Rob built to a guess. What is this page for?
6. **About page content** — images and copy are still placeholders awaiting DiasporaDNA.
7. **Digital exhibit** — confirmed as documentation-only for this handoff. Correct?
8. **Publishing the imported festivals** — should all ~400 imported rows be published to the
   public site immediately, or reviewed and published in batches? They import as unpublished
   drafts by design, and nothing is searchable until this is decided (A11).

---

## Recommended sequencing for the Aug 7 build

Ordered by client visibility per unit of effort, given roughly one working day:

1. **A6** — "for free" copy change (minutes)
2. **A1 + A11** — finish the import, **publish the imported rows**, then verify by searching
   "Odunde" and "beer", the two terms Monica personally tried and that both came back empty.
   Treat these as one item: the import alone does not change what Monica sees.
3. **A5** — branded placeholder imagery so the ~400 rows do not read as an empty site
4. **A4** — ad slots in the public layout, applied to every page at once
5. **A2** — calendar date-click, now a small change (`selectedDay` already exists; it just
   needs to feed the list), which also fills the empty vertical space Rob flagged
6. **A8** — connect the producer three-step flow
7. **A4b** — admin UI for sponsor placements. Needs a migration plus a CRUD screen, so it is
   realistically post-Friday; name it in the delivery note as landing before the 14th so the
   client can operate the ad slots she is being shown.

**A3 (map) should be explicitly deferred and named as deferred in the Friday delivery note.**
It needs a schema migration, a geocoding pass, a provider decision, and a CSP change — it will
not land well in a single day, and Monica is more likely to accept a stated timeline than a
map that renders badly for the second time.
