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
   - [Saved Schedules](#saved-schedules)
   - [Calendar](#calendar)
   - [Email](#email)
   - [Upload](#upload)
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
| Current | No auth required (all routes public) |
| Future | NextAuth.js or Lucia Auth |
| Middleware | `src/middleware.js` (stub) → will become `src/proxy.js` (Next.js 16) |

**Planned auth flow:**
- Session-based authentication via `src/proxy.js`
- JWT tokens stored in httpOnly cookies
- Role attached to session object

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

### Saved Schedules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/saved-schedules` | Public | Get user's saved schedule |
| `POST` | `/api/saved-schedules` | Public | Save a schedule item |
| `DELETE` | `/api/saved-schedules` | Public | Remove saved item |

#### `GET /api/saved-schedules`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email |

**Response:**
```json
[
  {
    "id": "uuid",
    "user_email": "user@example.com",
    "schedule": {
      "id": "uuid",
      "title": "Main Stage",
      "start_time": "2026-08-01T20:00:00.000Z",
      "festival": {
        "id": "uuid",
        "name": "Mann Center Summer Fest"
      }
    },
    "created_at": "2026-07-15T14:00:00.000Z"
  }
]
```

#### `POST /api/saved-schedules`

**Request Body:**
```json
{
  "email": "user@example.com",
  "schedule_id": "uuid"
}
```

**Response:** `201 Created` — Saved schedule object

**Note:** Uses upsert (idempotent). Saving twice doesn't create duplicates.

#### `DELETE /api/saved-schedules`

**Request Body:**
```json
{
  "email": "user@example.com",
  "schedule_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "message": "Schedule removed"
}
```

---

### Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/calendar/[festivalId]` | Public | Download .ics file |

#### `GET /api/calendar/[festivalId]`

Download an .ics calendar file for a festival with all schedule events.

**Response:** `200 OK`
- Content-Type: `text/calendar`
- Content-Disposition: `attachment; filename="festival-name.ics"`

**ICS Contents:**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Save Philly Festivals//EN
BEGIN:VEVENT
UID:uuid@savephillyfestivals.org
DTSTART:20260801T200000Z
DTEND:20260801T220000Z
SUMMARY:The Roots - Mann Center Summer Fest
DESCRIPTION:Hip Hop performance at Stage A
LOCATION:Stage A, Mann Center
END:VEVENT
...
END:VCALENDAR
```

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

### Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Producer/Admin | Upload file (logo, image) |

#### `POST /api/upload`

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | File to upload |
| `directory` | string | No | Subdirectory (default: `uploads`) |

**Allowed file types:** JPEG, PNG, WebP, SVG

**Max file size:** 5MB

**Response:** `201 Created`
```json
{
  "url": "/uploads/uuid-filename.png",
  "fileName": "uuid-filename.png",
  "size": 1024000,
  "type": "image/png"
}
```

**Storage:**
- Current: `public/uploads/` (local filesystem)
- Future: AWS S3 or Cloudflare R2

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
| `401` | Unauthorized | Not authenticated (future) |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource (e.g., slug) |
| `413` | Payload Too Large | File exceeds 5MB limit |
| `415` | Unsupported Media Type | Invalid file type |
| `422` | Unprocessable Entity | Business logic error |
| `500` | Internal Server Error | Unexpected error |

**Error classes** (in `src/lib/errors.js`):
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

# Auth (future)
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
| `/api/saved-schedules` | Planned | User saved schedules |
| `/api/calendar/[festivalId]` | Planned | .ics download |
| `/api/email/send` | Planned | Email sending |
| `/api/upload` | Planned | File uploads |

### Phase 4: Supporting Features (Planned)

| Feature | Status | Notes |
|---------|--------|-------|
| Calendar (.ics) | Planned | Uses `uuid` package for UIDs |
| Email templates | Planned | Nodemailer with SMTP |
| File uploads | Planned | Local storage, future S3 |

### Phase 5: Middleware (Planned)

| Feature | Status | Notes |
|---------|--------|-------|
| Admin auth | Planned | `src/proxy.js` (Next.js 16) |
| Role-based access | Planned | Session-based roles |
| Rate limiting | Planned | API rate limiting |
| CORS | Planned | Cross-origin configuration |

### Future Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Authentication | High | NextAuth.js or Lucia Auth |
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

# Save schedule
curl -X POST http://localhost:3000/api/saved-schedules \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","schedule_id":"<schedule-id>"}'

# Download calendar
curl -o festival.ics http://localhost:3000/api/calendar/<festival-id>

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
