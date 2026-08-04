# Schedule, Calendar & Email Dataflow

## Overview

This document describes how festival schedules, the ICS calendar export, and the Resend email integration work together.

---

## 1. Email Endpoint

All email is sent through `apps/save-philly-festivals/src/lib/mail.js`, which wraps the Resend SDK.

**Configuration (`apps/save-philly-festivals/.env`):**
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

When `RESEND_API_KEY` is set, emails send live via Resend. When unset, delivery returns a truthful `provider_unconfigured` failure and logs only a generic operational message—never the recipient, subject, or email body. `RESEND_FROM_EMAIL` configures the verified sender; no provider credentials are stored in application tables.

**Email functions exported from `apps/save-philly-festivals/src/lib/mail.js`:**

| Function | Trigger | Recipient |
|---|---|---|
| `sendTransactionalEmail` | Transactional provider boundary (including F-04 mixed schedule summaries) | The visitor |
| `sendScheduleConfirmation` | Legacy event-only saved-schedule confirmation | The visitor |
| `sendMailingListForward` | Visitor opts in to updates | Festival's `contact_email` |
| `sendSubmissionConfirmation` | Festival is submitted | Submitter's `contact_email` |
| `sendFestivalApproved` | Admin approves a festival | Festival's `contact_email` |
| `sendFestivalRejected` | Admin rejects a festival | Festival's `contact_email` |

---

## 2. Error Handling

Email sending is **non-blocking**. If an email fails, the request still succeeds — the API response includes `email_sent: false` so the client knows.

```
POST /api/schedules/save
  → saveSchedule() runs (DB write)
  → sendScheduleConfirmation() runs in try/catch
  → sendMailingListForward() runs in try/catch (if opted in)
  → response returned regardless of email outcome
```

All API routes use `handleApiError()` from `apps/save-philly-festivals/src/lib/errors.js`, which catches:
- `ValidationError` (400) — invalid input
- `NotFoundError` (404) — resource doesn't exist
- `ForbiddenError` (403) — unauthorized access
- Generic errors (500) — logged server-side

Validation is handled by Zod schemas in `apps/save-philly-festivals/src/features/schedules/schedule-schemas.js` and `apps/save-philly-festivals/src/features/festivals/festival-schemas.js`, processed through the shared `validate()` helper in `apps/save-philly-festivals/src/lib/validate.js`.

---

## 3. F-04 Mixed Schedule Email Flow

The Calendar Schedule Builder sends its complete local, versioned `{type,id}` selection to `POST /api/schedules/email` with a UUID idempotency key. This transactional action is independent of marketing consent and has no marketing checkbox.

The endpoint strictly validates and normalizes the request, resolves only currently approved festivals and events, and builds escaped email content exclusively from server records. Unknown, deleted, or unapproved selections are retained as unavailable child rows and reported safely; a request with no valid resolved selection is rejected.

Each submission is stored in `ScheduleEmailRequest` with normalized ordered `ScheduleEmailItem` rows and a `pending`, `sent`, or `failed` delivery status. The unique idempotency key prevents a browser retry from creating or sending a duplicate request. Provider IDs and redacted operational failures may be stored; provider credentials and complete email bodies are not.

For Playwright only, `DISCOVERY_E2E_FIXTURE=1` supplies an in-process repository/provider fixture. It does not call PostgreSQL or Resend. Production must not enable this flag.

## F-05 Optional organizer consent

The schedule email remains transactional and available with every consent checkbox unchecked. A separate section lists only server-resolved, approved parent festivals that have an enabled, authorized `OrganizerIntegration`. The visitor explicitly chooses one or more named organizers and one shared preference set (`reminders`, `updates`, `discovery`); no option is preselected. Browser storage continues to contain only the versioned schedule IDs—never email, consent, preferences, or management tokens.

`POST /api/organizer-consent/eligibility` accepts only the versioned ID selection and returns display-safe eligible organizer records. `POST /api/organizer-consent` re-resolves all IDs and authorization server-side, normalizes the email, stores versioned disclosure evidence, selected approved festivals/organizers/preferences, source, timestamp, trusted request IP, revocation/suppression state, and one hashed high-entropy management token. It creates one idempotent outbox row per still-authorized chosen organizer. Partial eligibility is reported separately from schedule delivery.

The raw management token is returned only on initial creation, held only in component memory, and never written to browser storage; the UI offers an immediate revoke action while that page remains open. `DELETE /api/organizer-consent` accepts the consent ID and token, hashes it server-side, persists organizer-scoped email suppressions, revokes the grant, and suppresses pending/processing work. A future full cross-provider preference center may wrap this mechanism; tokens must be delivered only in an approved private channel and must never be logged or placed in URLs.

Operational application environment names:

- `N8N_ORGANIZER_OUTBOX_SECRET`: shared high-entropy bearer secret held only in app/N8N secret stores.
- `CONSENT_TRUSTED_PROXY_HOPS`: number of trusted right-most `X-Forwarded-For` hops; defaults to `0` (record `unknown`) to prevent spoofing.
- `CONSENT_IP_RETENTION_DAYS`: documented retention setting for policy/cleanup operations. Configure the approved period; this change does not add a destructive cleanup job.

N8N claims bounded due work under a five-minute lease and reports completion or retryable/permanent failure. Invalid, expired, or replayed leases are rejected. Revoked/suppressed consent or organizer authorization suppresses work before claim and again before report acceptance. Provider details are reduced to allowlisted operational error codes. See `apps/n8n/README.md`; no workflow or ESP is activated by F-05.

### Legacy event-only confirmation flow

The following documents the pre-existing `SavedSchedule` event-only flow, which remains separate from F-04.

#### Confirmation Email — Schedule Save Flow

### Dataflow

```
Visitor                React Hook Form           API Route              Prisma           Resend
  │                         │                       │                     │                │
  │  fills email + checkbox │                       │                     │                │
  │────────────────────────>│                       │                     │                │
  │                         │  POST /api/schedules/save                    │                │
  │                         │  { email, schedule_id, receive_updates }    │                │
  │                         │──────────────────────>│                     │                │
  │                         │                       │  schedule.findUnique│                │
  │                         │                       │────────────────────>│                │
  │                         │                       │<────────────────────│                │
  │                         │                       │                     │                │
  │                         │                       │  saveSchedule()     │                │
  │                         │                       │  (upsert)           │                │
  │                         │                       │────────────────────>│                │
  │                         │                       │<────────────────────│                │
  │                         │                       │                     │                │
  │                         │                       │  sendScheduleConfirmation()           │
  │                         │                       │─────────────────────────────────────>│
  │                         │                       │<─────────────────────────────────────│
  │                         │                       │                     │                │
  │                         │                       │  if receive_updates:                 │
  │                         │                       │  sendMailingListForward()            │
  │                         │                       │─────────────────────────────────────>│
  │                         │                       │<─────────────────────────────────────│
  │                         │                       │                     │                │
  │                         │  { saved, email_sent, updates_forwarded }   │                │
  │                         │<──────────────────────│                     │                │
  │  sees success message   │                       │                     │                │
  │<────────────────────────│                       │                     │                │
```

### Step by step

1. **Visitor** opens `SaveScheduleForm` (passing `scheduleId` and `festivalName` as props)
2. **React Hook Form** validates the email field with Zod before submission
3. **Form submits** to `POST /api/schedules/save` with `{ email, schedule_id, receive_updates }`
4. **API route** validates input with `saveScheduleWithOptInSchema`
5. **API route** looks up the schedule and its parent festival
6. **API route** calls `saveSchedule()` — an upsert on `SavedSchedule` (idempotent)
7. **API route** calls `sendScheduleConfirmation()` — confirmation email to visitor
8. **If opted in**, API route calls `sendMailingListForward()` — notification to festival's `contact_email`
9. **Response** returns `{ saved, email_sent, updates_forwarded }`

### Files involved

| File | Role |
|---|---|
| `apps/save-philly-festivals/src/features/schedules/SaveScheduleForm.jsx` | React Hook Form component |
| `apps/save-philly-festivals/src/features/schedules/schedule-schemas.js` | Zod validation schemas |
| `apps/save-philly-festivals/src/features/schedules/schedule-queries.js` | Prisma queries (save, get, remove) |
| `apps/save-philly-festivals/src/app/api/schedules/save/route.js` | POST endpoint |
| `apps/save-philly-festivals/src/app/api/schedules/saved/route.js` | GET (list) + DELETE (remove) endpoints |
| `apps/save-philly-festivals/src/lib/mail.js` | Resend email functions |
| `apps/save-philly-festivals/src/lib/errors.js` | Error classes and handler |
| `apps/save-philly-festivals/src/lib/validate.js` | Zod validation helper |

---

## 4. Calendar (ICS Export)

### How it works

`apps/save-philly-festivals/src/features/festivals/festival-calendar.js` generates an `.ics` file of approved festivals happening this month.

1. Queries `Festival` where `status = "approved"` and dates fall within the current month
2. Maps each festival to an `ics` event (title, description, location, URL, dates)
3. Returns the raw `.ics` string via `ics.createEvents()`

This function is not wired to a route or UI yet. When connected, it can be served as a downloadable `.ics` file or embedded in a page.

---

## 5. API Endpoints Reference

### `POST /api/schedules/save`
Save a schedule to a visitor's list and trigger email.

**Request:**
```json
{
  "email": "visitor@example.com",
  "schedule_id": "uuid",
  "receive_updates": true
}
```

**Response (201):**
```json
{
  "saved": { "id": "...", "user_email": "...", "schedule_id": "..." },
  "email_sent": true,
  "updates_forwarded": true
}
```

### `GET /api/schedules/saved?email=visitor@example.com`
Retrieve all saved schedules for a visitor.

**Response (200):**
```json
{
  "saved": [
    {
      "id": "...",
      "schedule": {
        "id": "...",
        "title": "...",
        "start_time": "...",
        "end_time": "...",
        "festival": { "id": "...", "name": "...", "slug": "..." }
      }
    }
  ]
}
```

### `DELETE /api/schedules/saved`
Remove a schedule from a visitor's list.

**Request:**
```json
{
  "email": "visitor@example.com",
  "schedule_id": "uuid"
}
```

**Response (200):**
```json
{ "message": "Schedule removed from your list" }
```
