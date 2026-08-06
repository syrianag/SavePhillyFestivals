# API Reference

> Complete routing, roles, and implementation guide for Save Philly Festivals.

---

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [User Roles](#user-roles)
4. [API Routes](#api-routes)
   - [Health](#health)
   - [Festivals](#festivals)
   - [Schedules](#schedules)
   - [Schedule Builder APIs](#schedule-builder-apis)
   - [Calendar](#calendar)
   - [Email](#email)
   - [Retired Upload](#retired-upload)
5. [Festival Status Workflow](#festival-status-workflow)
6. [Error Responses](#error-responses)
7. [Pagination](#pagination)
8. [Environment Variables](#environment-variables)
9. [Future Implementation](#future-implementation)

---

## Base URL

```
http://localhost:3000/api
```

Production: `https://savephillyfestivals.org/api`

---

## Authentication

| Status | Implementation |
|--------|----------------|
| Current | Auth.js (NextAuth v5) with the Credentials provider |
| Session | JWT strategy with the user role attached to the session |
| Route protection | `apps/save-philly-festivals/src/proxy.js` plus server-side `auth()` checks |

**Implemented auth flow:**
- Auth.js handlers are exposed through `apps/save-philly-festivals/src/app/api/auth/[...nextauth]/route.js`
- Session JWTs are stored in httpOnly cookies
- The user role is attached to the session object

---

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `public` | Unauthenticated visitor | View approved festivals, view schedules, save personal schedules |
| `producer` | Festival organizer | Create festivals, edit own drafts, submit for approval, manage own schedules |
| `admin` | Site administrator | Approve/reject festivals, edit any festival, manage categories/tags, view all data |
| `super_admin` | Technical admin | All admin permissions + manage users, system settings, email config |

### Role Permissions Matrix

| Action | public | producer | admin | super_admin |
|--------|--------|----------|-------|-------------|
| View approved festivals | Yes | Yes | Yes | Yes |
| View all festivals | No | Own only | Yes | Yes |
| Create festival | No | Yes | Yes | Yes |
| Edit festival | No | Own drafts only | Yes | Yes |
| Delete festival | No | Own drafts only | Yes | Yes |
| Submit for approval | No | Yes | Yes | Yes |
| Approve/reject | No | No | Yes | Yes |
| Manage schedules | No | Own festivals | Yes | Yes |
| Save personal schedule | Yes | Yes | Yes | Yes |
| Upload files | No | Own festivals | Yes | Yes |
| Send emails | No | No | Yes | Yes |
| Manage categories/tags | No | No | Yes | Yes |
| Manage users | No | No | No | Yes |
| System settings | No | No | No | Yes |

---

## API Routes

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Database connectivity check |

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-07-15T14:00:00.000Z"
}
```

---

### Festivals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/festivals` | Public | List festivals (filtered by role) |
| `POST` | `/api/festivals` | Producer | Create new festival (status: draft) |
| `GET` | `/api/festivals/[id]` | Public | Get single festival with schedules |
| `PATCH` | `/api/festivals/[id]` | Producer/Admin | Update festival |
| `DELETE` | `/api/festivals/[id]` | Producer/Admin | Delete festival |
| `POST` | `/api/festivals/[id]/approve` | Admin | Approve or reject festival |

#### `GET /api/festivals`

List festivals with filtering, pagination, and search.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by status (draft, pending, approved, rejected) |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search name/description |

**Response:**
```json
{
  "festivals": [
    {
      "id": "uuid",
      "name": "Mann Center Summer Fest",
      "slug": "mann-center-summer-fest",
      "status": "approved",
      "start_date": "2026-08-01T18:00:00.000Z",
      "end_date": "2026-08-03T22:00:00.000Z",
      "schedules": [...],
      "categories": [...],
      "tags": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Access:**
- `public`: Only `approved` festivals
- `producer`: Own festivals (all statuses)
- `admin`: All festivals

#### `POST /api/festivals`

Create a new festival (starts as draft).

**Request Body:**
```json
{
  "name": "Mann Center Summer Fest",
  "description": "Annual music festival",
  "location": "Mann Center for the Performing Arts",
  "city": "Philadelphia",
  "state": "PA",
  "zip_code": "19131",
  "website_url": "https://manncenter.org",
  "contact_name": "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "215-555-0123",
  "start_date": "2026-08-01T18:00:00.000Z",
  "end_date": "2026-08-03T22:00:00.000Z"
}
```

**Required:** `name`

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Mann Center Summer Fest",
  "slug": "mann-center-summer-fest",
  "status": "draft",
  "created_at": "2026-07-15T14:00:00.000Z"
}
```

#### `GET /api/festivals/[id]`

Get single festival with all related data.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Mann Center Summer Fest",
  "slug": "mann-center-summer-fest",
  "schedules": [
    {
      "id": "uuid",
      "title": "Opening Ceremony",
      "start_time": "2026-08-01T18:00:00.000Z",
      "end_time": "2026-08-01T19:00:00.000Z"
    }
  ],
  "categories": [...],
  "tags": [...],
  "files": [...]
}
```

#### `PATCH /api/festivals/[id]`

Update festival fields.

**Request Body:** Partial festival object (same fields as POST)

**Response:** `200 OK` — Updated festival object

**Access:**
- `producer`: Own festivals only
- `admin`: Any festival

#### `DELETE /api/festivals/[id]`

Delete a festival and all related data (cascade).

**Response:** `200 OK`
```json
{
  "message": "Festival deleted"
}
```

**Access:**
- `producer`: Own festivals (draft only)
- `admin`: Any festival

#### `POST /api/festivals/[id]/approve`

Approve or reject a festival submission.

**Request Body:**
```json
{
  "status": "approved",
  "reason": "Great lineup, approved!"
}
```

**Status values:** `approved` | `rejected`

**Response:** `200 OK`
```json
{
  "festival": { ... },
  "reason": "Great lineup, approved!"
}
```

**Access:** Admin only

**Side effects:**
- Sends approval/rejection email to `contact_email`
- Logs email in `EmailLog` table

---

### Schedules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/schedules` | Public | List schedules for a festival |
| `POST` | `/api/schedules` | Producer/Admin | Add schedule entry |
| `GET` | `/api/schedules/[id]` | Public | Get single schedule |
| `PATCH` | `/api/schedules/[id]` | Producer/Admin | Update schedule |
| `DELETE` | `/api/schedules/[id]` | Producer/Admin | Delete schedule |

#### `GET /api/schedules`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `festival_id` | string | Yes | Festival UUID |

**Response:**
```json
[
  {
    "id": "uuid",
    "festival_id": "uuid",
    "title": "Main Stage",
    "start_time": "2026-08-01T18:00:00.000Z",
    "end_time": "2026-08-01T22:00:00.000Z",
    "performer": "The Roots",
    "genre": "Hip Hop",
    "is_headliner": true,
    "festival": {
      "id": "uuid",
      "name": "Mann Center Summer Fest",
      "slug": "mann-center-summer-fest"
    }
  }
]
```

#### `POST /api/schedules`

**Request Body:**
```json
{
  "festival_id": "uuid",
  "title": "Main Stage",
  "description": "Headliner performance",
  "location": "Stage A",
  "start_time": "2026-08-01T20:00:00.000Z",
  "end_time": "2026-08-01T22:00:00.000Z",
  "performer": "The Roots",
  "genre": "Hip Hop",
  "is_headliner": true
}
```

**Required:** `festival_id`, `title`, `start_time`, `end_time`

**Response:** `201 Created` — Created schedule object

---

### Schedule Builder APIs

The accountless schedule builder persists its versioned `{type,id}` selection only in browser storage. It does not use a server-side personal saved-schedule list.

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| `POST` | `/api/schedules/email` | Active | Transactionally email the server-resolved mixed schedule |
| `POST` | `/api/schedules/calendar` | Active | Export a server-resolved mixed schedule as ICS |
| `POST` | `/api/organizer-consent/eligibility` | Active | Resolve optional organizer choices |
| `POST`, `DELETE` | `/api/organizer-consent` | Active | Create or revoke explicit organizer consent |
| `POST` | `/api/schedules/save` | Retired (`410`) | Legacy database-backed save and mail flow |
| `GET`, `DELETE` | `/api/schedules/saved` | Retired (`410`) | Legacy database-backed list/remove flow |

The retired routes do not parse the request or access Prisma or mail. `/api/schedules/save` identifies `/api/schedules/email` as its replacement; `/api/schedules/saved` identifies `/calendar`. Retirement responses use `Cache-Control: private, no-store`.

See `docs/SCHEDULE-CALENDAR-EMAIL.md` for current request contracts, idempotency, consent separation, and unavailable-item behavior.

---

### Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/schedules/calendar` | Public | Download an ICS snapshot of a mixed schedule |

#### `POST /api/schedules/calendar`

**Request Body:**
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

**Response:** `200 OK`
- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: attachment; filename="philly-fests-schedule.ics"`
- `Cache-Control: private, no-store`
- `X-Calendar-Omitted-Count`: number of unavailable selections omitted

The endpoint returns `400` for an invalid contract, `413` for more than 32 KiB, `415` for non-JSON media, and `422` when no selection can be exported.

---

### Email

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/email/send` | Admin | Send templated email |

#### `POST /api/email/send`

**Request Body:**
```json
{
  "to": "producer@example.com",
  "template": "confirmation",
  "data": {
    "festivalName": "Mann Center Summer Fest",
    "date": "August 1-3, 2026"
  }
}
```

**Templates:**
| Template | Subject | Description |
|----------|---------|-------------|
| `confirmation` | Festival Submission Received | Sent when producer submits festival |
| `approval` | Festival Approved! | Sent when admin approves festival |
| `rejection` | Festival Not Approved | Sent when admin rejects festival |
| `custom` | Custom subject | Custom email content |

**Response:** `200 OK`
```json
{
  "message": "Email sent",
  "logId": "uuid"
}
```

**Side effects:**
- Creates `EmailLog` record
- Uses SMTP config from environment variables

---

### Retired Upload

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| `POST` | `/api/upload` | Retired (`410`) | Legacy public-filesystem upload |

`POST /api/upload` always returns `410 Gone` without authenticating, parsing multipart data, or accessing the filesystem:

```json
{
  "error": "This legacy public upload endpoint has been retired.",
  "replacement": "/api/producer/festivals/[id]/assets"
}
```

Authenticated producer festival assets use `POST /api/producer/festivals/[id]/assets` and private provider-backed storage. The retired endpoint is not a fallback for that flow. Responses use `Cache-Control: private, no-store`.

---

## Festival Status Workflow

```
┌─────────┐     ┌─────────┐     ┌───────────┐
│  Draft  │ ──▶ │ Pending │ ──▶ │ Approved  │
└─────────┘     └─────────┘     └───────────┘
     │               │
     │               ▼
     │         ┌───────────┐
     │         │ Rejected  │
     │         └───────────┘
     │               │
     └───────────────┘
      (can revise & resubmit)
```

**Status transitions:**

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | `draft` | Festival created | Producer |
| `draft` | `pending` | Producer submits | Producer |
| `pending` | `approved` | Admin approves | Admin |
| `pending` | `rejected` | Admin rejects | Admin |
| `rejected` | `pending` | Producer resubmits | Producer |
| `approved` | `pending` | Admin un-approves | Admin |

**Business rules:**
- Producers can edit their own drafts
- Producers cannot edit pending/approved festivals (must contact admin)
- Admins can edit any festival at any status
- Rejection requires a reason (sent via email)
- Approval triggers confirmation email

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "errors": [
    {
      "path": "field_name",
      "message": "Validation message"
    }
  ]
}
```

**HTTP Status Codes:**

| Code | Meaning | When |
|------|---------|------|
| `400` | Bad Request | Validation failed, missing required fields |
| `401` | Unauthorized | Authentication is required or the session is invalid |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource (e.g., slug) |
| `413` | Payload Too Large | File exceeds 5MB limit |
| `415` | Unsupported Media Type | Invalid file type |
| `422` | Unprocessable Entity | Business logic error |
| `500` | Internal Server Error | Unexpected error |

**Error classes** (in `apps/save-philly-festivals/src/lib/errors.js`):
- `AppError` — Base error class
- `NotFoundError` — 404
- `ValidationError` — 400 with field errors
- `UnauthorizedError` — 401
- `ForbiddenError` — 403

---

## Pagination

All list endpoints support pagination:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Defaults:**
- `page`: 1
- `limit`: 20
- `max limit`: 100

---

## Environment Variables

Store these values in `apps/save-philly-festivals/.env` (or `apps/save-philly-festivals/.env.local`). `UPLOAD_DIR` is app-root-relative.

```bash
# Database (required)
DATABASE_URL="postgresql://..."

# Email (required for email features)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Save Philly Festivals <noreply@savephillyfestivals.org>"

# Upload (optional)
UPLOAD_DIR="public/uploads"
MAX_FILE_SIZE="5242880"

# Auth (required)
AUTH_SECRET="your-auth-secret"
```

---

## Future Implementation

### Phase 3: API Routes (Planned)

| Route | Status | Notes |
|-------|--------|-------|
| `/api/health` | Planned | Database connectivity check |
| `/api/festivals` | Planned | CRUD operations |
| `/api/festivals/[id]` | Planned | Single festival operations |
| `/api/festivals/[id]/approve` | Planned | Admin approval workflow |
| `/api/schedules` | Planned | Schedule CRUD |
| `/api/schedules/[id]` | Planned | Single schedule operations |
| `/api/schedules/save`, `/api/schedules/saved` | Retired | Return `410` without database or mail access |
| `/api/schedules/calendar` | Active | Mixed-schedule ICS snapshot |
| `/api/email/send` | Planned | Email sending |
| `/api/upload` | Retired | Returns `410` without filesystem access |

### Phase 4: Supporting Features (Planned)

| Feature | Status | Notes |
|---------|--------|-------|
| Calendar (.ics) | Active | Server-resolved mixed-schedule snapshots |
| Email templates | Planned | Nodemailer with SMTP |
| Producer asset uploads | Active | Private provider-backed storage; legacy public upload retired |

### Phase 5: Authentication and Middleware

| Feature | Status | Notes |
|---------|--------|-------|
| Admin auth | Implemented | Auth.js with `apps/save-philly-festivals/src/proxy.js` and server-side checks |
| Role-based access | Implemented | Roles are attached to Auth.js sessions |
| Rate limiting | Planned | API rate limiting |
| CORS | Planned | Cross-origin configuration |

### Future Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Rate limiting | Medium | Prevent API abuse |
| Caching | Medium | Redis or in-memory cache |
| Search | Medium | Full-text search with Postgres |
| Image optimization | Low | Next.js Image component |
| Webhooks | Low | Notify producers of status changes |
| Export | Low | CSV/PDF export for admins |
| Analytics | Low | Track views, saves, downloads |
| Email queue | Low | Background email processing |
| File storage | Low | Migrate to S3/R2 |

---

## Testing

### Quick Test Commands

```bash
# Health check
curl http://localhost:3000/api/health

# Create festival
curl -X POST http://localhost:3000/api/festivals \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Fest","contact_email":"test@test.com"}'

# List festivals
curl http://localhost:3000/api/festivals

# Get single festival
curl http://localhost:3000/api/festivals/<id>

# Update festival
curl -X PATCH http://localhost:3000/api/festivals/<id> \
  -H "Content-Type: application/json" \
  -d '{"location":"New Location"}'

# Delete festival
curl -X DELETE http://localhost:3000/api/festivals/<id>

# Approve festival
curl -X POST http://localhost:3000/api/festivals/<id>/approve \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# Create schedule
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"festival_id":"<festival-id>","title":"Main Stage","start_time":"2026-08-01T18:00:00Z","end_time":"2026-08-01T22:00:00Z"}'

# List schedules
curl "http://localhost:3000/api/schedules?festival_id=<festival-id>"

# Confirm legacy saved-schedule retirement (expects 410)
curl -i -X POST http://localhost:3000/api/schedules/save

# Download a mixed-schedule calendar snapshot
curl -o philly-fests-schedule.ics -X POST http://localhost:3000/api/schedules/calendar \
  -H "Content-Type: application/json" \
  -d '{"selection":{"version":1,"items":[{"type":"festival","id":"<festival-id>"}]}}'

# Test validation (should fail)
curl -X POST http://localhost:3000/api/festivals \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Related Documentation

- [Coding Standards](./coding-standards.md)
- [Implementation Plan](./implementation-plan-backend.md)
- [Figma Review Checklist](./figma-review-checklist.md)
