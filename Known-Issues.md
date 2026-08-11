# Known Issues & Client Callouts

Save Philly Festivals — current as of **10 August 2026**.

Written for DiasporaDNA and the delivery team. It covers what is deliberately switched off, what
needs a decision, and the handful of things that will look like bugs but are not. Engineering
detail for each item lives in `ISSUE.log`.

---

## 🔴 Read first: the public site is currently empty

All 405 imported festivals are in `unpublished` state. Only `published` festivals are publicly
visible, so **search, the calendar, the map, and every imported festival's detail page return
nothing right now.**

This was a deliberate operator action, not a fault. Restoring them is a decision, not a fix.

One caveat if you decide to restore: the bulk publish script deliberately refuses to republish
anything that was taken down on purpose, so a festival is never silently put back by a batch job.
Restoring all 405 needs a small code change first — **ask engineering a day ahead, not an hour
ahead.**

---

## Switched off on purpose

### Email is off, and turning it on is a two-part decision

No email is sent to anyone today. That is deliberate and worth understanding before changing it.

Producer account decisions and festival workflow notifications share one email provider. The
festival notifications are addressed to **organizer contact details taken from the source
spreadsheet** — roughly 1,600 queued messages to people who never signed up for anything.

So account emails sit behind their own separate switch. Adding an email API key alone will **not**
start emailing organizers; both `RESEND_API_KEY` and `ACCOUNT_EMAILS_ENABLED=1` have to be set, on
purpose. Until then, the admin screen shows an amber banner reminding you that applicants are not
being notified of approvals or rejections.

**Decision needed:** whether organizers should ever be emailed at all. Worth a short conversation
of its own, separate from turning on applicant emails.

### Sponsor ads are direct-sold, not Google AdSense

The site's security policy blocks third-party ad scripts by design. Sponsors are self-hosted
creatives: you supply the image, we place it. That means direct-sold sponsorship rather than
programmatic ad revenue — which at this traffic level is worth considerably more per slot, but it
does mean **you supply the artwork**.

Creatives are referenced by a link. Host the image somewhere and paste the URL; there is no file
upload on that screen yet.

---

## Things that look like bugs but are not

| What you'll see | Why |
|---|---|
| Searching "beer" returns nothing | The source spreadsheet had 11 columns and no description field. Imported festivals are searchable by **name, location, and category only**. "Odunde" matches; "beer" does not. |
| No festival photos anywhere | Zero of the 405 have imagery — the spreadsheet carried none. Branded placeholders fill the gap. |
| A festival shows "Ongoing · through Oct 4" under an August date | It genuinely spans months. The spreadsheet gave a start and an end date and nothing about which days inside that window it runs, so we never claim it "recurs" — we cannot know that from the data. |
| Only about half the festivals appear on the map | 238 of 415 have map coordinates. See below. |
| `qa-producer-flow@example.test` in Settings | A verification account from testing. Deactivated and cannot sign in. Account history is permanent by design, so it cannot be deleted. |
| Scrolling over the map does not zoom it | Deliberate — wheel-zoom over a full-width map hijacks page scrolling. Use the +/− buttons, double-click, or pinch. |

---

## Map coverage: 238 of 415 festivals (57%)

Recently improved from 91 — a 2.6× increase — by fixing how addresses were being sent to the
mapping service. Of the festivals that carry a location at all, **73% now resolve.**

The remainder break down as:

- **90 festivals have no location text whatsoever.** Nothing can place these; they need an address
  from you or the organizer.
- **31 say things like "Various Locations", "Citywide", or "TBD".** Real answers, but not ones a
  map can plot.
- **54 have addresses the mapping service cannot resolve** — block ranges ("4th Street, Between
  Lombard and Catharine"), intersections ("6th & Susquehanna"), a typo ("Millflin Street"), or two
  addresses run together.

**What you can do:** correcting a location in the admin editor is enough. A background job
re-resolves changed locations automatically within about ten minutes, and there is a "Geocode now"
button on the festival page if you want it immediately.

When correcting it by hand does not work — typically a venue name with no street address, where
the automatic matcher has nothing to retry with — use the **"Find address"** button under the
location field. It searches the mapping service and offers up to five real candidate addresses to
pick from. The same panel is in the producer submission form, so new submissions can be corrected
before they ever enter the queue. It proposes address *text* only; the pin still comes from the
normal automatic matching after you save.

This is a tool, not a bulk repair: the ~87 festivals that have already failed still need someone
to open each one and click through the panel.

**Possible improvement:** a second mapping provider that is stronger on street addresses and
intersections would likely recover a good share of those 54 without a human in the loop. Not
built; say the word.

---

## Open decisions we need from you

**Festival imagery.** Pulling photos from the 267 organizer websites raises copyright questions
about republishing their images, plus a storage decision. Currently branded placeholders.

**Recurring events.** Eight festivals are stored as one long continuous range when some are really
"every Sunday, May through October". Fixing this properly needs either a short note you write
("Sundays, May–October") or the actual dates. The system supports real recurrence; nobody has the
dates yet.

**About and Tours pages.** Both still placeholder. We need your copy and images, and a sense of
what the Tours page is for.

**Sponsor artwork**, if you want the ad slots filled at launch.

---

## Known limitations we have accepted for now

**Signup does not verify email addresses.** Anyone can register with an address they do not
control. Low risk today because registering grants nothing — an administrator approves producer
access separately, and a human reviews every request. Worth closing before the site is promoted
publicly, since decision emails would go to an unverified address.

**Map pins cluster in Center City.** Overlapping pins now group into a numbered circle that expands
when clicked, which solves the "pins hidden under other pins" problem. At much larger festival
counts this may want revisiting.

---

## For the technical team

- `ISSUE.log` at the repository root tracks every item above with file paths and reasoning.
- `GEOCODE_SWEEP_SECRET` is set in Vercel production; the geocoding sweep 401s without it.
- `NEXT_PUBLIC_SITE_URL` is **missing from the preview environment**, which affects cross-origin
  checks and links in emails on preview deployments. Production has it.
- Production deployment is a gated GitHub workflow requiring a release SHA and a verified backup
  reference — deliberately not a local command.
