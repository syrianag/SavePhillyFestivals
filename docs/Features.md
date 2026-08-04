# Philly Fests Feature Requirements

**Source:** `docs/Client-Hand-Off.md`
**Prepared with:** FDE requirements review
**Status:** Draft requirements baseline
**Last updated:** 2026-08-04

## 1. Purpose

This document converts the design handoff into an implementation-ready feature baseline for Philly Fests. It defines required behavior, acceptance criteria, dependencies, and unresolved product decisions.

The handoff mixes product requirements with suggested implementation tools. To avoid treating a vendor recommendation as a committed requirement, each item uses one of these labels:

- **Required** — behavior stated directly as a goal or deliverable in the handoff.
- **Recommended** — an implementation approach or best practice suggested by the design team.
- **Optional** — an alternative described in the handoff but not selected.
- **Derived** — behavior inferred to make a requirement usable and testable; product confirmation is advised.
- **Open decision** — information the handoff does not define.

## 2. Product Scope

Philly Fests is a responsive festival-discovery platform that allows:

1. Visitors to discover festivals and view festival details.
2. Visitors to build and retain a personal festival schedule without creating an account.
3. Visitors to email and export their schedule.
4. Visitors, with affirmative consent, to request updates from selected festival organizers.
5. Festival producers to submit festival information for editorial review.
6. Administrators to review, approve, publish, reject, and manage festival content.
7. Festival pages to display moderated social content associated with a festival.

The Figma desktop, mobile, annotated screens, component library, and design tokens are the visual source of truth. The handoff references those assets but does not include a working Figma URL; exact screen-level acceptance remains dependent on access to them.

## 3. User Roles

| Role | Description | Primary capabilities |
|---|---|---|
| Visitor | Public user without a required account | Browse festivals, use filters, view details, build a schedule, email it, opt into organizer updates, and export calendar events |
| Producer | Festival organizer submitting festival information | Complete the producer form and receive submission/status notifications |
| Editor/Admin | Authorized Philly Fests staff member | Review submissions, request changes or reject them, publish approved festivals, and moderate content |
| Integration operator | Authorized technical or operational owner | Configure email, mailing-list, social-feed, and CMS integrations without exposing credentials |

## 4. Feature Requirements

### F-01: Responsive festival discovery

**User outcome:** Visitors can find relevant Philadelphia festivals from desktop and mobile devices.

#### Requirements

- **Required:** Implement the public screens supplied in Figma for desktop and mobile.
- **Required:** Support responsive behavior around the supplied 1440px desktop and 390px mobile designs; layouts must adapt between those widths rather than only matching two fixed canvases.
- **Required:** Implement interactive discovery controls shown in the designs, including filters and modals.
- **Required:** Render only publicly approved/published festival content in public discovery views.
- **Recommended:** Use reusable design tokens for color, typography, spacing, and component states.
- **Recommended:** Use relative units and flexible layouts instead of relying on absolute pixel positioning.
- **Derived:** Discovery must provide loading, empty, error, and no-results states.
- **Derived:** Filters and modals must be keyboard-operable and usable by screen readers.

#### Acceptance criteria

- Public users can browse approved festivals without authentication.
- Draft, pending, and rejected festivals do not appear in public results.
- Discovery controls update visible results according to the selected criteria.
- The interface remains usable at 390px, 1440px, and intermediate viewport widths.
- Focus is managed correctly when a modal opens and closes.
- Empty and failed data states do not render broken layouts.

#### Open decisions

- Filter fields, sort order, pagination or infinite scrolling, URL/query-state behavior, and default date range must be confirmed from Figma/product.
- SEO metadata, structured data, analytics events, and content-sharing requirements are not defined.

---

### F-02: Festival detail pages

**User outcome:** Visitors can understand a festival and access its schedule, location, official links, and actions.

#### Requirements

- **Required:** Provide a public page for every approved festival.
- **Required:** Populate festival pages from the selected CMS/database.
- **Required:** Include the interactions and content sections defined in Figma.
- **Required:** If a social grid is enabled, display links to the festival's official social accounts above it.
- **Derived:** Festival pages should expose the information needed by calendar export and schedule selection: name, description, date/time, location, and official website.
- **Derived:** Missing optional content must not break the page.

#### Minimum festival data

| Field | Requirement |
|---|---|
| Stable ID and slug | Required for retrieval and routing |
| Festival name | Required |
| Publication/review status | Required |
| Description | Expected; exact requirement is open |
| Start and end date/time | Required for schedules and calendar export |
| Philadelphia time zone | Derived requirement |
| Address/location | Required for the intended page and calendar event |
| Website URL | Referenced in calendar export |
| Contact name/email | Required for producer workflow and organizer communication |
| Official social links | Required when a social grid is displayed |
| Social hashtag/feed configuration | Required only when social aggregation is enabled |
| Images and alternative text | Derived from the visual design and accessibility needs |
| Categories/tags | Derived for discovery filters |

#### Acceptance criteria

- An approved festival is available at a stable public URL.
- An unapproved festival is not publicly accessible through its detail route.
- Dates, times, location, website, and available schedule actions render from stored data.
- Missing optional images, social content, or links produce intentional fallback states.

---

### F-03: Accountless schedule builder

**User outcome:** Visitors can save festival or schedule selections without creating an account.

#### Requirements

- **Required:** Allow users to select and save festivals/schedule items without account creation.
- **Required:** Retain browser-based selections using `localStorage`.
- **Required:** Treat browser storage as device-specific; it does not synchronize across browsers or devices.
- **Required:** Do not store sensitive data, integration credentials, or consent records in `localStorage`.
- **Required:** Use local storage sparingly because it is synchronous and capacity-limited.
- **Derived:** Users can add, view, and remove saved selections.
- **Derived:** Duplicate selections must not create duplicate schedule items.
- **Derived:** Users can clear the locally saved schedule.
- **Derived:** The UI should explain that clearing browser data removes the local schedule.

#### Acceptance criteria

- A visitor can add and remove schedule selections without signing in.
- Reloading the application in the same browser restores the saved selections.
- Adding the same selection more than once does not create duplicates.
- Clearing the schedule removes the corresponding local data.
- Email addresses and consent evidence are never written to `localStorage`.
- Corrupt, stale, or unrecognized local data fails safely and can be reset.

#### Open decisions

- Whether users select whole festivals, individual scheduled events, or both must be confirmed.
- Conflict detection for overlapping events is not defined.
- The handoff references a server-stored subscription and a future “Manage Schedule” feature, but does not define how that relates to the browser-only schedule.

---

### F-04: Email schedule

**User outcome:** Visitors can receive a confirmation containing their selected schedule.

#### Requirements

- **Required:** Accept a visitor email address with the selected schedule.
- **Required:** Send a Philly Fests confirmation email containing a schedule summary.
- **Required:** Explain which organizer subscriptions were requested when consent was provided.
- **Derived:** Validate the email and selected items before processing.
- **Derived:** Schedule persistence and email delivery outcomes must be independently observable; an email-provider failure must not silently corrupt the saved schedule.
- **Derived:** Do not expose provider errors, credentials, or another user's schedule in responses.

#### Acceptance criteria

- A valid request records the intended schedule and attempts the confirmation email.
- The confirmation identifies the selected festivals or events.
- An invalid email or empty/invalid selection produces an actionable validation error.
- A failed email attempt is reported as an email failure without duplicating the saved schedule on retry.
- Tests use a fake or mocked transport and do not call a live email provider.

#### Current implementation note

The repository currently uses Resend through `apps/save-philly-festivals/src/lib/mail.js`, as documented in `docs/SCHEDULE-CALENDAR-EMAIL.md`. Mailchimp, SendGrid, Constant Contact, and ConvertKit in the handoff are options rather than requirements for transactional schedule email.

---

### F-05: Organizer mailing-list consent and forwarding

**User outcome:** A visitor can affirmatively request communications from selected festival organizers.

#### Requirements

- **Required:** Present an unchecked, affirmative consent control before sharing or subscribing a visitor's email with festival organizers.
- **Required:** Consent must identify that communications will come from selected festivals.
- **Required:** Support the preference categories `Reminders`, `Updates`, and `Discovery` if organizer mailing-list integration is implemented as described.
- **Required:** Associate subscriptions with source/campaign tags identifying Philly Fests and the schedule builder.
- **Required:** Maintain a server-side record of consent containing the timestamp, IP address, and selected festivals.
- **Required:** Organizer messages must provide unsubscribe functionality through the selected email service provider.
- **Required:** Each organizer must authorize Philly Fests to provide subscribers and supply the required mailing-list configuration.
- **Derived:** A user must be able to email/export a schedule without being forced to accept unrelated marketing; product/legal must confirm the final consent model.
- **Derived:** Failure for one organizer must not prevent attempts for other selected organizers or the Philly Fests schedule confirmation.
- **Derived:** Record per-organizer delivery/subscription outcomes for support and safe retries.

#### Consent record

At minimum, store server-side:

- User email address.
- Selected festival identifiers.
- Selected preference categories.
- Consent timestamp.
- Source IP address, subject to an approved retention period.
- Consent text/version shown to the user.
- Subscription source/campaign.
- Per-organizer provider outcome.
- Revocation/unsubscribe state when available.

#### Acceptance criteria

- No organizer subscription or forwarding occurs without affirmative consent.
- Stored consent can demonstrate what the user accepted, when, and for which festivals/preferences.
- Only requested preferences are sent to each organizer.
- The confirmation email identifies the organizer subscriptions requested.
- Partial failures are logged safely and can be retried without duplicating successful subscriptions.
- Provider credentials remain server-side and are never returned to the browser.

#### Open decisions

- Is consent one choice for all selected festivals, granular per festival, or granular per festival and preference?
- Is double opt-in required?
- Can `Discovery` include festivals the visitor did not select?
- Which organizers/providers are supported at launch?
- The current repository forwards an opt-in request to a festival contact via Resend; direct subscription to each organizer's ESP is not documented as implemented.
- Retention, deletion, access, correction, and withdrawal procedures require legal/product approval.

---

### F-06: Calendar export

**User outcome:** Visitors can import their selected schedule into Google Calendar, Apple Calendar, or Outlook.

#### Requirements

- **Required:** Provide an `Export to Calendar` action from the schedule builder.
- **Required:** Generate and download a valid `.ics` file containing the selected events.
- **Required:** Support common Google, Apple, and Outlook calendar import workflows.
- **Recommended:** Generate the file in the browser with the `ics` package; no backend is required for this approach.
- **Recommended:** Include title, start/end, description, location, official URL, confirmed/busy status, and organizer details when available.
- **Recommended:** Include display reminders 24 hours and 2 hours before an event, pending product confirmation.
- **Optional:** Provide pre-generated `.ics` files for individual festivals.
- **Optional:** Use AddEvent or AddToCalendar instead of custom generation.
- **Derived:** Missing optional fields must not prevent export.

#### Acceptance criteria

- Export downloads a syntactically valid `.ics` file.
- The file contains one event per selected schedule item according to the confirmed schedule model.
- Events import with correct Philadelphia dates and times in current Google, Apple, and Outlook workflows.
- All-day and timed events are represented intentionally.
- Multi-day events do not end a day early or shift due to time-zone conversion.
- Exporting an empty schedule is blocked with a clear message.

#### Current implementation note

`apps/save-philly-festivals/src/features/festivals/festival-calendar.js` currently generates ICS content for approved festivals in the current month but is not wired to a route or UI. The handoff requires export of the user's selected schedule, so the existing generator does not by itself satisfy this feature.

#### Open decisions

- Confirm whole-festival versus individual-event export.
- Define behavior for all-day, multi-day, recurring, canceled, or postponed festivals.
- Confirm whether alarms are desired.
- Imported `.ics` files do not automatically update when festival information changes; expected update behavior is undefined.

---

### F-07: Producer festival submission

**User outcome:** Festival producers can submit festival details for review without publishing directly.

#### Requirements

- **Required:** Provide a producer submission form on the `For Producers` page.
- **Required:** A valid submission creates a non-public draft or pending festival record.
- **Required:** Notify the Philly Fests team when a submission is received.
- **Required:** Allow administrators to review the submission before publication.
- **Derived:** Send the producer a receipt/confirmation.
- **Derived:** Validate and sanitize submitted content and files before persistence or rendering.
- **Derived:** Provide clear success, validation-error, and system-error states.
- **Derived:** Protect the public form with rate limiting, CSRF controls where applicable, and anti-spam measures.

#### Acceptance criteria

- A valid submission creates exactly one non-public review record.
- The configured team address receives a submission notification attempt.
- The producer receives a confirmation attempt at the submitted contact address.
- Invalid input does not create an incomplete public record.
- Submitted HTML/script content cannot execute in administrative or public views.
- Uploaded content, if supported, is restricted by approved type, size, and storage rules.

#### Open decisions

- Final form fields, required attachments, maximum sizes, duplicate detection, and producer authentication are not specified.
- Whether producers can save drafts or edit a submission after sending is not defined.
- Durable production storage for uploaded files must be selected before uploads are considered production-ready.

---

### F-08: Editorial review and publication

**User outcome:** Authorized staff control which festival submissions become public.

#### Requirements

- **Required:** Administrators can review submitted festival records in the administrative interface.
- **Required:** Administrators can publish approved festivals to the live site.
- **Derived:** Administrators can reject a submission or leave it non-public for revision.
- **Derived:** Producers receive approval/rejection status communication.
- **Derived:** Only authorized roles can approve, reject, publish, unpublish, or edit protected festival data.
- **Derived:** Status changes must not create duplicate festival records.

#### Acceptance criteria

- Pending submissions remain absent from public discovery and direct public routes.
- An authorized approval makes the festival public in relevant listing and detail views.
- A rejection keeps the festival non-public and records the decision.
- Unauthorized users cannot invoke administrative status changes through either the UI or API.
- Approval/rejection email failures do not reverse the editorial status change and are recorded for follow-up.

#### Open decisions

- Required roles, revision-request flow, approval audit history, scheduled publishing, cancellation, archiving, and producer access are not defined.

---

### F-09: Moderated social-media grid

**User outcome:** Visitors can view relevant social content without exposing the site to unmoderated or broken embeds.

#### Requirements

- **Required:** Festival pages can display posts associated with a configured festival hashtag.
- **Required:** Display official festival social-account links above the grid.
- **Recommended:** Use Curator.io or Flockler to aggregate supported networks and provide moderation.
- **Recommended:** Require approval or moderation before displaying third-party posts.
- **Optional:** Build direct Instagram and X/Twitter integrations, subject to API access and platform restrictions.
- **Derived:** Provider failure or an empty approved feed must not break the festival page.
- **Derived:** Embedded content must not bypass site privacy, security, or accessibility requirements.

#### Acceptance criteria

- Only approved/configured social content is rendered.
- Rejected or hidden items are not publicly visible.
- Official-account links remain available even when the feed is empty or unavailable.
- Provider failure produces a stable fallback instead of a broken page.

#### Open decisions

- MVP inclusion, supported networks, refresh frequency, moderation owner/SLA, analytics, retention, and fallback copy are not defined.
- Current Instagram hashtag-search limitations may prevent the exact requested behavior without a paid aggregator and eligible business accounts.

## 5. Administrative and Integration Requirements

### CMS and application architecture

The handoff recommends WordPress with Gravity Forms and ACF, and lists Webflow and a headless CMS as alternatives. These are implementation recommendations, not product requirements.

The current repository already implements a Next.js application backed by Prisma/PostgreSQL. Unless the owner explicitly approves a platform migration, features should extend the existing application rather than introduce WordPress or Webflow solely because they appear in the handoff.

Regardless of platform, the system must provide:

- Structured festival and schedule data.
- Draft/pending/approved/rejected publication states.
- Role-protected editorial operations.
- Producer form validation and notifications.
- Public retrieval of approved content.
- Secure storage of integration configuration and consent evidence.

### Email and mailing-list providers

- Resend is the current transactional provider in the repository.
- Zapier plus Mailchimp is the handoff's recommended no-code organizer-subscription path.
- Constant Contact, SendGrid, and ConvertKit are alternatives.
- A custom integration is optional and requires a secure backend, provider-specific error handling, idempotency, and credential management.
- Provider choice must account for cost, contact/task volume, API limits, privacy terms, and organizer compatibility.

### Social aggregation providers

- Curator.io and Flockler are recommended paid options.
- A custom integration requires eligible social accounts, approved API access, rate-limit handling, moderation tooling, and ongoing maintenance.

## 6. Cross-Cutting Requirements

### Accessibility

The handoff does not name an accessibility standard. The delivery baseline should be **WCAG 2.2 AA**, subject to product confirmation.

At minimum:

- All forms, filters, modals, schedule controls, and export actions are keyboard accessible.
- Inputs have programmatic labels and actionable validation messages.
- Focus order and modal focus management are correct.
- Text and interactive controls meet contrast requirements.
- Images have meaningful alternative text or are marked decorative.
- Status changes and asynchronous errors are announced to assistive technology.

### Responsive design

- Match the supplied design system and component variants.
- Validate at 390px and 1440px and at representative widths between them.
- Avoid horizontal scrolling for primary page content.
- Touch targets must remain usable on mobile.

### Security and privacy

- Keep API keys, OAuth credentials, mailing-list identifiers that grant access, and provider secrets out of client code and Git.
- Encrypt secrets at rest using the approved deployment secret mechanism.
- Apply least-privilege access to administrative and integration accounts.
- Validate, normalize, and sanitize all producer and visitor input.
- Protect write routes against unauthorized access, abuse, replay, and excessive request rates.
- Do not log full email bodies, credentials, or unnecessary personal data in production.
- Publish privacy terms explaining data sharing with festival organizers and third-party providers.
- Define retention and deletion rules for emails, consent records, IP addresses, submissions, and integration logs.

### Reliability and observability

- External email, mailing-list, and social-provider failures must be observable without exposing secrets or excessive PII.
- Retried operations must be idempotent where duplicate submissions, subscriptions, emails, or schedule records would harm users.
- Public pages must degrade safely when optional third-party providers are unavailable.
- Production integrations require named operational owners and documented retry/escalation procedures.

### Performance

Performance budgets are not defined in the handoff. Before release, establish targets for:

- Core Web Vitals on representative mobile and desktop devices.
- Festival listing and detail-page response times.
- Responsive image sizes and formats.
- Third-party social embed impact.
- Maximum schedule size supported for local storage, email, and ICS export.

### Browser support

Supported versions are not defined. Confirm a browser matrix that includes current versions of Chrome, Safari, Firefox, and Edge, with mobile Safari and Chrome included.

## 7. Feature Dependency Map

| Feature | Depends on |
|---|---|
| Festival discovery/detail | Figma access, approved festival content model, public CMS/database queries |
| Schedule builder | Confirmed selection model, stable festival/schedule IDs, browser-storage schema |
| Email schedule | Schedule builder, transactional provider, verified sender/domain, email templates |
| Organizer subscriptions | Consent policy, organizer authorization, provider credentials/list IDs, secure backend storage |
| Calendar export | Schedule builder, normalized date/time/time-zone data, ICS generation library/service |
| Producer submission | Final field list, validation rules, CMS/database write path, team notification address |
| Editorial publication | Authentication, role model, status workflow, administrative UI/API |
| Social grid | Provider selection, festival feed configuration, moderation process, privacy approval |

## 8. Release Priorities

The full F-01 through F-09 scope is approved for delivery. To minimize dependencies and operational risk, work will be sequenced in the following increments. Social aggregation and cross-device schedule management remain later increments, but are not removed from the final scope.

### Priority 1 — Core platform

1. Responsive festival discovery and details.
2. Producer submission.
3. Administrative review/publication.
4. Accountless local schedule builder.
5. Selected-schedule ICS export.

### Priority 2 — Communications

1. Transactional schedule confirmation.
2. Consent evidence and privacy controls.
3. Organizer update forwarding or mailing-list integration.
4. User-facing handling of partial provider failures.

### Priority 3 — Enhancements

1. Moderated social-media grid.
2. Cross-device or token-based `Manage Schedule` capability.
3. Individual festival calendar links and richer calendar-update behavior.

## 9. Approved Product Decisions

The client confirmed or delegated the following decisions on 2026-08-04. Detailed recommendations and rationale are recorded in `docs/PRODUCT-DECISIONS.md`.

1. The supplied Figma prototype is the visual source of truth. Developer inspection access or exported assets are still required where the public prototype does not expose measurements or tokens.
2. All F-01 through F-09 features are in final scope. Delivery will use phased increments, with live social aggregation after the core platform and official social links.
3. A visitor schedule may contain both whole festivals and individual festival events.
4. Discovery will use URL-backed search, date, category, neighborhood, and supported structured filters; deterministic sorting; and accessible server pagination.
5. The canonical authenticated producer form and festival/event schema in `docs/PRODUCT-DECISIONS.md` are approved as the implementation baseline.
6. Authenticated editors/admins control revision, rejection, approval, publication, unpublication, cancellation, and archival according to the documented workflow.
7. Producers must authenticate and may access only records owned by their account or organization.
8. Visitors may email or export schedules without consenting to organizer marketing.
9. Consent must be affirmative, versioned, granular to selected organizers and preference categories, retained server-side, and independently revocable. Final public-facing legal copy and retention periods require owner sign-off before production activation.
10. N8N is the organizer mailing-list orchestration layer. Transactional schedule email may continue through Resend.
11. Festival time is governed by the IANA zone `America/New_York`. Timed events are persisted as UTC instants with the source zone retained; all-day events use date-only semantics; all-day ICS end dates are exclusive. Automatic alarms are omitted from MVP and may be added as an explicit user choice later.
12. Official social links and hashtags ship first. Moderated live aggregation follows through a Curator.io/Flockler proof of concept; it must not block core festival pages.
13. Accessibility, browser compatibility, performance, SEO, analytics, uptime, backup, and recovery are release requirements and must have measurable acceptance targets before production release.
14. Producer assets use a private, organization-controlled Google Drive folder. PostgreSQL stores immutable Drive IDs and metadata; local public filesystem storage is not a supported production path.
15. Product ownership uses the four contacts from `docs/Client-Hand-Off.md`. Proposed domain assignments are listed in `docs/PRODUCT-DECISIONS.md`; technical operations still require named engineering operators.

## 10. Definition of Done

A feature is complete only when:

- Its approved Figma states and responsive behavior are implemented.
- Required validation, authorization, privacy, error, empty, and loading states exist.
- Acceptance criteria are covered by automated tests at the appropriate unit, integration, and browser levels.
- Tests do not call live external email, social, or mailing-list providers.
- User-facing copy, email templates, consent language, and data retention have product/legal approval where applicable.
- Required metrics and redacted error reporting are available to the named owner.
- Documentation identifies configuration, provider dependencies, known limitations, and rollback or disablement steps.
- The production build and repository quality gates pass on the release revision.

## 11. Traceability Summary

| Handoff section | Features captured here |
|---|---|
| Figma usage and responsive guidance | F-01, F-02, cross-cutting responsive/design requirements |
| CMS recommendations | F-07, F-08, CMS/application architecture |
| Producer submission workflow | F-07, F-08 |
| Schedule builder mailing-list integration | F-04, F-05 |
| Calendar export | F-06 |
| Social hashtag grid | F-09 |
| Browser local storage | F-03 |
| Frontend/backend development needs | All features and cross-cutting requirements |
