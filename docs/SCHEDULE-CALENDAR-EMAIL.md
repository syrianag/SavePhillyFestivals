# Schedule, Calendar & Email Dataflow

## Overview

This document describes how festival schedules, the ICS calendar export, and the Resend email integration work together.

---

## 1. Email Endpoint

All email is sent through `src/lib/mail.js`, which wraps the Resend SDK.

**Configuration (`.env`):**
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

When `RESEND_API_KEY` is set, emails send live via Resend. When unset, all emails stub to console logs so development works without a key.

**Email functions exported from `src/lib/mail.js`:**

| Function | Trigger | Recipient |
|---|---|---|
| `sendScheduleConfirmation` | Visitor saves a schedule | The visitor |
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

All API routes use `handleApiError()` from `src/lib/errors.js`, which catches:
- `ValidationError` (400) — invalid input
- `NotFoundError` (404) — resource doesn't exist
- `ForbiddenError` (403) — unauthorized access
- Generic errors (500) — logged server-side

Validation is handled by Zod schemas in `src/features/schedules/schedule-schemas.js` and `src/features/festivals/festival-schemas.js`, processed through the shared `validate()` helper in `src/lib/validate.js`.

---

## 3. Confirmation Email — Schedule Save Flow

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
| `src/features/schedules/SaveScheduleForm.jsx` | React Hook Form component |
| `src/features/schedules/schedule-schemas.js` | Zod validation schemas |
| `src/features/schedules/schedule-queries.js` | Prisma queries (save, get, remove) |
| `src/app/api/schedules/save/route.js` | POST endpoint |
| `src/app/api/schedules/saved/route.js` | GET (list) + DELETE (remove) endpoints |
| `src/lib/mail.js` | Resend email functions |
| `src/lib/errors.js` | Error classes and handler |
| `src/lib/validate.js` | Zod validation helper |

---

## 4. Calendar (ICS Export)

### How it works

`src/features/festivals/festival-calendar.js` generates an `.ics` file of approved festivals happening this month.

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
