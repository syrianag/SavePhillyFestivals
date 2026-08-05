# Product Decisions and FDE Recommendations

**Status:** Approved implementation baseline with noted production prerequisites
**Decision date:** 2026-08-04
**Visual source:** [Philly Festivals Figma prototype](https://www.figma.com/proto/nELmnldpdSWU8eczoskhhE/Philly-Festivals---Design?node-id=886-1030&p=f&t=I2N4JZ4eI9tKwUVp-1&scaling=contain&content-scaling=fixed&page-id=839%3A5841&starting-point-node-id=886%3A1030)

## Delivery scope

All requirements F-01 through F-09 in `docs/Features.md` are final delivery scope. Work is phased to keep each pull request independently testable and releasable. Live social aggregation and cross-device schedule management are later increments, not exclusions.

The public Figma prototype does not expose inspect-mode measurements or downloadable source assets in this environment. Implementation can use the prototype for interaction and visual review, but exact token and asset fidelity requires Figma developer access or approved exports.

## Discovery recommendation

Use URL-backed, server-rendered filters so results are shareable and browser navigation works:

- Text search across name, summary, venue, categories, and tags.
- Date presets: today, this weekend, next 7 days, next 30 days, and custom range.
- Multi-select category.
- Controlled Philadelphia neighborhood taxonomy.
- Cost, audience, and accessibility filters only after those values are structured and editorially verified.
- `Soonest` as the default sort, `Relevance` for text search, plus `Newest` and `Name A–Z`.
- Deterministic tie-breaking by stable ID.
- Conventional accessible pagination with 24 cards per page and a public maximum of 48.
- Query strings preserved across pagination; changing filters resets to page 1.
- Explicit loading, empty, no-results, and failure states.

Date filtering uses interval overlap so multi-day festivals crossing a requested boundary are included.

## Canonical producer workflow and schema

Producers authenticate with a verified account. Festival ownership is stored using a stable user or organization ID, never a client-supplied email address.

Workflow:

`draft → pending_review → changes_requested | rejected | approved → published → unpublished | canceled | archived`

Every transition records actor, previous state, new state, reason, and timestamp. Producers may edit only owned `draft` or `changes_requested` records unless an editor reopens another state.

Required form sections:

1. Producer and organization: authenticated account, contact details, organization name/type, representation acknowledgment.
2. Festival identity: name, short summary, full description, categories, official website, slug, public contact, imagery and alt text.
3. Dates and location: date type, start/end, venue, structured address, neighborhood, online/hybrid information, accessibility details.
4. Individual events: title, date/time type, start/end, venue override, performer, genre/category, status, registration URL.
5. Attendance and cost: free/paid/mixed, USD range, ticket URL, audience and family attributes.
6. Social and marketing: validated official URLs, approved hashtags, aggregation enablement. Provider secrets remain admin-only.
7. Files and attestations: purpose, alt text, rights, accuracy, and terms acknowledgment.

The existing Prisma `Schedule` model may remain the internal name for an individual festival event to avoid a disruptive rename, but APIs and user-facing copy must call it a festival event or program item.

## Mixed schedule model

Schedules support both whole festivals and individual events. Browser state uses a versioned discriminated structure:

```json
{
  "version": 1,
  "items": [
    { "type": "festival", "id": "festival-uuid" },
    { "type": "event", "id": "event-uuid" }
  ]
}
```

Only IDs and non-sensitive state are stored locally. The server resolves current approved records before email or export. Exact `{type, id}` duplicates are removed. Parent-festival and child-event selections remain distinct, and overlapping events produce a warning rather than a hard block.

## Philadelphia time and calendar recommendation

Use `America/New_York`; never use fixed `EST`, `EDT`, or UTC offsets as time-zone rules.

- Producer-entered timed values represent Philadelphia wall time, are converted to UTC for persistence, and retain the source zone.
- Date-only values remain date-only and are never converted through UTC.
- ICS all-day `DTEND` is exclusive: a one-day August 8 event ends August 9; an August 8–10 event ends August 11.
- Calendar export includes stable UID, timestamp, start/end, title, description, location, canonical URL, organizer when appropriate, status, last-modified, and sequence.
- Automatic alarms are omitted initially because unsolicited reminders are intrusive. A later explicit user preference may add them.
- Export is a snapshot and does not automatically update; the UI must disclose this.
- Test summer/winter offsets, DST transitions, all-day/multi-day events, midnight spans, cancellations, mixed selections, and Unicode against Google, Apple, and Outlook workflows.

## N8N organizer mailing integration

Transactional schedule delivery and optional organizer marketing are independent. A visitor may email or export a schedule with marketing consent unchecked.

The application:

1. Validates the email and selected approved IDs.
2. Persists the schedule request.
3. Queues or sends the transactional confirmation through Resend.
4. If consent is affirmative, persists versioned consent evidence.
5. Creates one idempotent outbox item per selected, authorized organizer.

N8N:

- Is the sole organizer mailing-list orchestration layer.
- Polls or consumes durable outbox records instead of making visitor requests wait on a synchronous workflow.
- Maps `Reminders`, `Updates`, and `Discovery` preferences.
- Uses versioned Philly Fests source/campaign tags.
- Uses an idempotency key derived from consent, organizer, and preference-set version.
- Records provider IDs and redacted outcomes.
- Retries transient failures with bounded backoff and does not loop permanent failures.
- Stores provider credentials only in N8N credential storage.
- Remains inactive until contract tests, backup/restore, controlled proof, and explicit activation approval pass.

Production activation requires final consent copy, retention periods, revocation and suppression behavior, organizer authorization, N8N TLS/secret/backup readiness, and named operators.

## Google Drive asset storage

Use an organization-controlled Shared Drive or dedicated folder and a least-privilege service identity.

- Force the destination folder server-side.
- Keep files private by default.
- Store Drive file ID, detected MIME type, size, checksum, original filename, purpose, alt text, scan state, uploader, and lifecycle state in PostgreSQL.
- Associate every producer upload with a festival the authenticated producer owns.
- Validate extension, MIME type, and file signature; enforce quotas; generate server-controlled names; scan files before publication.
- Do not render uploaded HTML, SVG, or documents inline without a separate security review.
- Define cleanup for abandoned drafts and rejected submissions.
- Do not use `public/uploads` in production.

Google credentials, folder IDs that convey access, and N8N secrets stay outside Git and client code.

## Social recommendation

Implemented release:

- Validated official Instagram, Facebook, TikTok, YouTube, and X links remain above the feed.
- Curator.io and Flockler adapters use fixed API origins and server-only credentials.
- Provider posts are normalized into a PostgreSQL cache as pending text cards; no third-party scripts, HTML, iframes, media embeds, or tracking widgets are rendered.
- Local editorial approval with optimistic revisions and immutable audit history is required before publication.
- Hidden and rejected items are excluded by the public database query.
- Each festival has a kill switch, configured hashtag, stable empty/failure state, and approved cached-post fallback.

Production activation:

- Use Curator.io for the initial controlled proof because the handoff identifies stronger Instagram support and a lower entry price; retain Flockler as the supported alternative.
- Verify purchased-plan endpoints, account eligibility, accessibility, privacy terms, retention, quotas, performance, and cost before activation.
- Synchronize every 30 minutes initially and apply bounded retry outside public page requests.
- Follow `docs/SOCIAL-FEED-OPERATIONS.md` for moderation ownership/SLA, retention, secrets, proof, monitoring, incident response, and explicit activation approval.

## Quality targets to finalize before production

The following are confirmed release concerns; exact numerical targets require product/engineering sign-off:

- WCAG 2.2 AA.
- Current Chrome, Safari, Firefox, and Edge, including mobile Safari and Chrome.
- Core Web Vitals and page-response budgets.
- SEO metadata and event structured data.
- Privacy-reviewed analytics events.
- Availability, backup, recovery-point, and recovery-time objectives.
- Provider quota/cost thresholds and alerting.

## Proposed owner assignments

These assignments use only the contacts provided in `docs/Client-Hand-Off.md` and should be confirmed before operational activation.

| Domain | Primary | Backup |
|---|---|---|
| Product and visual acceptance | Simran Kaur — `skaur@pratt.edu` | Mengqi Cao — `mcao13@pratt.edu` |
| Producer/editorial workflow | Uraiba Zafar — `uzafar@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |
| Consent, privacy, and communications | Mengqi Cao — `mcao13@pratt.edu` | Simran Kaur — `skaur@pratt.edu` |
| Social moderation | Iris Sun — `wsun16@pratt.edu` | Uraiba Zafar — `uzafar@pratt.edu` |
| Release acceptance and incident coordination | Simran Kaur — `skaur@pratt.edu` | Iris Sun — `wsun16@pratt.edu` |

N8N, Google Drive, database, deployment, and security operations also require named technical operators. Confirm that the `pratt.edu` addresses remain available after handoff and establish organization-owned aliases for long-term support and recovery.
