# Schedule, Calendar & Email Dataflow

## Overview

The public schedule builder is accountless. Its versioned `{type,id}` selection is stored only in the visitor's browser under `savePhillySchedule`; visitor email addresses, organizer consent, preferences, and management tokens are never stored with that browser selection.

The active server endpoints are:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/schedules/email` | Send a transactional mixed-schedule summary |
| `POST` | `/api/schedules/calendar` | Download a mixed-schedule ICS snapshot |
| `POST` | `/api/organizer-consent/eligibility` | Resolve organizers eligible for optional consent |
| `POST` / `DELETE` | `/api/organizer-consent` | Create or revoke explicit organizer consent |

The old database-backed personal saved-schedule and public filesystem-upload APIs are retired; see [Retired legacy endpoints](#retired-legacy-endpoints).

---

## 1. Transactional Schedule Email (F-04)

The Calendar Schedule Builder sends its complete local selection to `POST /api/schedules/email` with a UUID idempotency key:

```json
{
  "email": "visitor@example.com",
  "idempotency_key": "00000000-0000-4000-8000-000000000000",
  "selection": {
    "version": 1,
    "items": [
      { "type": "festival", "id": "festival-uuid" },
      { "type": "event", "id": "event-uuid" }
    ]
  }
}
```

This action is transactional and independent of organizer marketing consent. The endpoint strictly validates and normalizes the request, resolves only currently public festivals and events, and builds escaped content from server records. Deleted, unknown, or no-longer-public selections are reported as unavailable; a request with no resolvable selection is rejected.

Each accepted submission is stored as a `ScheduleEmailRequest` with ordered `ScheduleEmailItem` rows and a `pending`, `sent`, or `failed` delivery status. The idempotency key prevents duplicate creation and delivery on browser retries. Provider credentials and complete email bodies are not stored.

Email delivery uses `sendTransactionalEmail` through the provider boundary in `apps/save-philly-festivals/src/lib/mail.js`. A delivery failure is reported truthfully as `502` with `email_sent: false`; it does not clear or alter the browser-local schedule. When `RESEND_API_KEY` is unset, delivery reports `provider_unconfigured` without logging recipient data, subject text, or message content.

For Playwright only, `DISCOVERY_E2E_FIXTURE=1` supplies an in-process repository/provider fixture and does not call PostgreSQL or Resend. Production must not enable this flag.

---

## 2. Optional Organizer Consent (F-05)

Organizer consent remains a separate, optional action. The schedule email works with all consent checkboxes unchecked and never implicitly subscribes a visitor.

`POST /api/organizer-consent/eligibility` accepts only the versioned ID selection and returns display-safe organizer records for currently public parent festivals with enabled, authorized integrations. The visitor then explicitly selects named organizers and at least one preference (`reminders`, `updates`, or `discovery`) and accepts the disclosure.

`POST /api/organizer-consent` re-resolves all IDs and authorization server-side, normalizes the email, stores versioned disclosure evidence and the explicit selections, and creates an idempotent outbox row for each still-authorized organizer. Partial eligibility is reported separately from schedule delivery.

The raw high-entropy management token is returned only on initial creation and remains in component memory. It is never placed in browser storage, logs, or URLs. `DELETE /api/organizer-consent` hashes the supplied token, revokes the grant, records organizer-scoped suppression, and suppresses pending work.

Operational environment names:

- `N8N_ORGANIZER_OUTBOX_SECRET`: bearer secret held only in application and N8N secret stores.
- `CONSENT_TRUSTED_PROXY_HOPS`: trusted right-most `X-Forwarded-For` hops; defaults to `0`.
- `CONSENT_IP_RETENTION_DAYS`: approved retention period for policy and cleanup operations.

See `apps/n8n/README.md` for claim/report behavior. No workflow or ESP is activated merely by the consent feature.

---

## 3. Calendar Export (F-06)

`POST /api/schedules/calendar` accepts the same versioned, ID-only selection and returns a `text/calendar; charset=utf-8` attachment named `philly-fests-schedule.ics`.

```json
{
  "selection": {
    "version": 1,
    "items": [
      { "type": "festival", "id": "festival-uuid" },
      { "type": "event", "id": "event-uuid" }
    ]
  }
}
```

The endpoint re-resolves current public records and emits one `VEVENT` for each selected whole festival or individual event, preserving request order. It accepts JSON up to 32 KiB and at most 100 selections. Responses include `Cache-Control: private, no-store`; successful exports include `X-Calendar-Omitted-Count`.

| Status | Meaning |
|---|---|
| `200` | Calendar generated; unavailable items may have been omitted |
| `400` | Invalid JSON or selection contract |
| `413` | Request body too large |
| `415` | Content type is not JSON |
| `422` | No selected item is currently exportable |
| `500` | Redacted operational failure |

Timed values are emitted as UTC ICS timestamps from their persisted instants. Date-only festival end dates are converted from the producer-facing inclusive date to the ICS-exclusive `DTEND`. Entries include stable type-prefixed UIDs, canonical Philly Fests URLs, status, busy/free state, `LAST-MODIFIED`, and `SEQUENCE`. Calendar exports are snapshots and do not update automatically.

---

## 4. Retired Legacy Endpoints

The following contracts intentionally return `410 Gone` for every historically supported method. They do not parse request bodies, authenticate, query or mutate a database, send mail, or access the filesystem.

| Method | Endpoint | Replacement |
|---|---|---|
| `POST` | `/api/schedules/save` | Browser-local schedule plus `/api/schedules/email` |
| `GET` / `DELETE` | `/api/schedules/saved` | Browser-local schedule at `/calendar` |
| `POST` | `/api/upload` | Authenticated private producer assets at `/api/producer/festivals/[id]/assets` |

All retirement responses are JSON with `Cache-Control: private, no-store`:

```json
{
  "error": "This legacy saved-schedule endpoint has been retired.",
  "replacement": "/calendar"
}
```

The legacy public `SaveScheduleForm` and unmounted public `FestivalSubmissionForm` were removed because no active source or test caller imported them. Current private producer asset upload uses provider-backed storage and is not affected.

---

## 5. Validation and Error Handling

Active endpoint request schemas use strict Zod contracts and server-owned record resolution. Operational errors are logged without recipient, selection, consent, provider credential, or private contact data. Browser-local schedule contents remain unchanged after email, calendar, or organizer-consent success or failure.

Focused coverage lives in:

- `apps/save-philly-festivals/tests/unit/legacy-route-retirement.test.js`
- `apps/save-philly-festivals/tests/unit/schedule-email.test.js`
- `apps/save-philly-festivals/tests/unit/schedule-email-contract.test.js`
- `apps/save-philly-festivals/e2e/schedule-builder.spec.js`
