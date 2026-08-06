# Backend Functions Implementation Plan

> **Goal:** Build all API routes, Prisma models, validation, email, and utility functions — NO pages. This lets you troubleshoot the backend independently before wiring up frontend pages.

---

## 1. Prisma Schema Design

```prisma
// apps/save-philly-festivals/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ─── Festival ───────────────────────────────────────────────
model Festival {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  description   String?
  location      String?
  city          String?  @default("Philadelphia")
  state         String?  @default("PA")
  zip_code      String?
  website_url   String?
  logo_url      String?
  image_url     String?
  status        String   @default("draft") // draft | pending | approved | rejected
  submitted_by  String?  // producer email or user id
  contact_name  String?
  contact_email String?
  contact_phone String?
  start_date    DateTime?
  end_date      DateTime?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  schedules     Schedule[]
  categories    FestivalCategory[]
  tags          FestivalTag[]
  files         FestivalFile[]

  @@index([status])
  @@index([start_date])
  @@index([slug])
}

// ─── Schedule (individual events within a festival) ────────
model Schedule {
  id            String   @id @default(uuid())
  festival_id   String
  title         String
  description   String?
  location      String?  // specific stage/venue within festival
  start_time    DateTime
  end_time      DateTime
  performer     String?
  genre         String?
  is_headliner  Boolean  @default(false)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  festival      Festival @relation(fields: [festival_id], references: [id], onDelete: Cascade)

  @@index([festival_id])
  @@index([start_time])
}

// ─── Saved Schedule (user's personalized schedule) ─────────
model SavedSchedule {
  id            String   @id @default(uuid())
  user_email    String
  schedule_id   String
  created_at    DateTime @default(now())

  schedule      Schedule @relation(fields: [schedule_id], references: [id], onDelete: Cascade)

  @@unique([user_email, schedule_id])
  @@index([user_email])
}

// ─── Category ──────────────────────────────────────────────
model Category {
  id            String   @id @default(uuid())
  name          String   @unique
  slug          String   @unique
  description   String?

  festivals     FestivalCategory[]
}

model FestivalCategory {
  festival_id   String
  category_id   String

  festival      Festival   @relation(fields: [festival_id], references: [id], onDelete: Cascade)
  category      Category   @relation(fields: [category_id], references: [id], onDelete: Cascade)

  @@id([festival_id, category_id])
}

// ─── Tag ───────────────────────────────────────────────────
model Tag {
  id            String   @id @default(uuid())
  name          String   @unique
  slug          String   @unique

  festivals     FestivalTag[]
}

model FestivalTag {
  festival_id   String
  tag_id        String

  festival      Festival   @relation(fields: [festival_id], references: [id], onDelete: Cascade)
  tag           Tag        @relation(fields: [tag_id], references: [id], onDelete: Cascade)

  @@id([festival_id, tag_id])
}

// ─── Festival File Uploads ─────────────────────────────────
model FestivalFile {
  id            String   @id @default(uuid())
  festival_id   String
  file_name     String
  file_url      String
  file_type     String   // logo | image | flyer | document
  file_size     Int?
  uploaded_at   DateTime @default(now())

  festival      Festival @relation(fields: [festival_id], references: [id], onDelete: Cascade)

  @@index([festival_id])
}

// ─── Email Log ─────────────────────────────────────────────
model EmailLog {
  id            String   @id @default(uuid())
  to_email      String
  subject       String
  template      String   // confirmation | approval | rejection | custom
  status        String   @default("sent") // sent | failed | pending
  sent_at       DateTime @default(now())
  error_message String?

  @@index([to_email])
  @@index([sent_at])
}
```

---

## 2. All Files to Create

### 2a. Config & Dependencies

Run dependency installation commands from the workspace root.

| What | Command |
|------|---------|
| Install packages | `npm install zod nodemailer uuid` |
| Install dev deps | `npm install -D @types/nodemailer` (types only, still useful for IDE) |

### 2b. File Tree (new files only)

The following tree is relative to the app root, `apps/save-philly-festivals/`.

```
src/
├── lib/
│   ├── db.js                    # Prisma singleton client
│   ├── constants.js             # Shared constants (statuses, limits, etc.)
│   ├── errors.js                # Custom error classes + handler
│   ├── validate.js              # Zod validation wrapper
│   ├── email.js                 # Nodemailer transport + send helpers
│   ├── calendar.js              # .ics calendar file generation
│   └── uploads.js               # File upload helper (local + future S3)
│
├── features/
│   ├── festivals/
│   │   ├── festival-queries.js  # DB CRUD operations for festivals
│   │   └── festival-schemas.js  # Zod schemas for festival validation
│   ├── schedules/
│   │   ├── schedule-queries.js  # DB CRUD for schedules + saved schedules
│   │   └── schedule-schemas.js  # Zod schemas for schedule validation
│   └── email/
│       └── email-templates.js   # Email HTML templates
│
├── app/
│   └── api/
│       ├── festivals/
│       │   ├── route.js         # GET (list) + POST (create)
│       │   └── [id]/
│       │       ├── route.js     # GET (one) + PATCH (update) + DELETE
│       │       └── approve/
│       │           └── route.js # POST approve / reject
│       ├── schedules/
│       │   ├── route.js         # GET (list by festival) + POST (create)
│       │   └── [id]/
│       │       └── route.js     # GET + PATCH + DELETE
│       ├── saved-schedules/
│       │   └── route.js         # GET (by email) + POST (save) + DELETE (remove)
│       ├── calendar/
│       │   └── [festivalId]/
│       │       └── route.js     # GET .ics file download
│       ├── email/
│       │   └── send/
│       │       └── route.js     # POST send email
│       ├── upload/
│       │   └── route.js         # POST file upload
│       └── health/
│           └── route.js         # GET health check + DB connectivity
│
prisma/
└── migrations/                  # Auto-generated after prisma migrate dev
```

**Total: 20 new files**

---

## 3. API Route Structure

### Festival Endpoints

| Method | Path | Body / Params | Purpose |
|--------|------|---------------|---------|
| `GET` | `/api/festivals` | `?status=&page=&limit=&search=` | List festivals (admin sees all, public sees approved) |
| `POST` | `/api/festivals` | `{ name, description, ... }` | Producer submits a new festival (status: `draft`) |
| `GET` | `/api/festivals/[id]` | — | Get single festival with schedules |
| `PATCH` | `/api/festivals/[id]` | Partial festival data | Update festival |
| `DELETE` | `/api/festivals/[id]` | — | Soft-delete or hard-delete |
| `POST` | `/api/festivals/[id]/approve` | `{ status: "approved" \| "rejected", reason? }` | Admin approve/reject |

### Schedule Endpoints

| Method | Path | Body / Params | Purpose |
|--------|------|---------------|---------|
| `GET` | `/api/schedules` | `?festival_id=` | List schedules for a festival |
| `POST` | `/api/schedules` | `{ festival_id, title, start_time, ... }` | Add schedule entry |
| `GET` | `/api/schedules/[id]` | — | Get single schedule |
| `PATCH` | `/api/schedules/[id]` | Partial schedule data | Update schedule |
| `DELETE` | `/api/schedules/[id]` | — | Delete schedule |

### Schedule Builder Endpoints

| Method | Path | Body / Params | Purpose |
|--------|------|---------------|---------|
| `POST` | `/api/schedules/email` | `{ email, idempotency_key, selection }` | Email a transactional mixed schedule |
| `POST` | `/api/schedules/calendar` | `{ selection }` | Download a mixed-schedule ICS snapshot |
| `POST` | `/api/schedules/save` | Ignored | Retired; always returns `410` |
| `GET`, `DELETE` | `/api/schedules/saved` | Ignored | Retired; always returns `410` |

### Email Endpoint

| Method | Path | Body / Params | Purpose |
|--------|------|---------------|---------|
| `POST` | `/api/email/send` | `{ to, template, data }` | Send email (confirmation, approval, etc.) |

### Upload Endpoint

| Method | Path | Body / Params | Purpose |
|--------|------|---------------|---------|
| `POST` | `/api/upload` | Ignored | Retired; returns `410` without filesystem access |
| `POST` | `/api/producer/festivals/[id]/assets` | `multipart/form-data` | Authenticated private producer asset upload |

### Health Check

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Returns `{ status: "ok" }` + DB ping |

---

## 4. Utility Functions (`apps/save-philly-festivals/src/lib/`)

### `db.js` — Prisma Singleton

```js
// Prevents multiple Prisma Client instances in dev (hot reload)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### `errors.js` — Centralized Error Handling

```js
// Custom error classes:
//   AppError (base)
//   NotFoundError (404)
//   ValidationError (400)
//   UnauthorizedError (401)
//   ForbiddenError (403)
//
// Plus: handleApiError(error) → returns NextResponse with proper status + JSON body
```

### `validate.js` — Zod Wrapper

```js
// validate(schema, data) → { success, data, errors }
// Returns parsed data on success, formatted errors on failure
// Used by every API route before DB operations
```

### `email.js` — Nodemailer Transport

```js
// Creates reusable transporter (Gmail SMTP or generic SMTP)
// Exports:
//   sendEmail({ to, subject, html })
//   sendConfirmationEmail(to, festivalData)
//   sendApprovalEmail(to, festivalData)
//   sendRejectionEmail(to, festivalData, reason)
```

### `calendar.js` — .ics Generation

```js
// generateCalendar(festival, schedules) → Buffer/string
// Creates valid .ics file with VEVENT entries for each schedule item
// Uses uuid package for UIDs
```

### `uploads.js` — File Upload Helper

```js
// saveFile(file, directory) → { url, fileName, size }
// Saves to apps/save-philly-festivals/public/uploads/ locally (swap to S3 later)
// Validates file type + size limits
```

### `constants.js` — Shared Constants

```js
export const FESTIVAL_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

---

## 5. Package Dependencies

Run these commands from the workspace root.

```bash
# Runtime dependencies
npm install zod nodemailer uuid

# Dev dependencies (types for IDE support only)
npm install -D @types/nodemailer
```

### Why each package:
| Package | Purpose |
|---------|---------|
| `zod` | Input validation schemas for all API routes |
| `nodemailer` | Sending emails (confirmation, approval, rejection) |
| `uuid` | Generating unique IDs for .ics calendar events |

---

## 6. Implementation Order

### Phase 1: Foundation (do first)
1. **Install dependencies from the workspace root** — `npm install zod nodemailer uuid`
2. **`apps/save-philly-festivals/src/lib/db.js`** — Prisma singleton (everything depends on this)
3. **`apps/save-philly-festivals/prisma/schema.prisma`** — Full schema with all models
4. **Run migration from the workspace root** — `npx prisma migrate dev --config apps/save-philly-festivals/prisma.config.ts --name init`
5. **`apps/save-philly-festivals/src/lib/constants.js`** — Status enums and limits
6. **`apps/save-philly-festivals/src/lib/errors.js`** — Error classes + `handleApiError()`
7. **`apps/save-philly-festivals/src/lib/validate.js`** — Zod wrapper

### Phase 2: Feature Queries (DB logic before routes)
8. **`apps/save-philly-festivals/src/features/festivals/festival-schemas.js`** — Zod schemas
9. **`apps/save-philly-festivals/src/features/festivals/festival-queries.js`** — CRUD functions
10. **`apps/save-philly-festivals/src/features/schedules/schedule-schemas.js`** — Zod schemas
11. **`apps/save-philly-festivals/src/features/schedules/schedule-queries.js`** — CRUD functions

### Phase 3: API Routes (consume queries + validation)
12. **`apps/save-philly-festivals/src/app/api/health/route.js`** — Test DB connection first
13. **`apps/save-philly-festivals/src/app/api/festivals/route.js`** — List + Create
14. **`apps/save-philly-festivals/src/app/api/festivals/[id]/route.js`** — Get + Update + Delete
15. **`apps/save-philly-festivals/src/app/api/festivals/[id]/approve/route.js`** — Approve/Reject
16. **`apps/save-philly-festivals/src/app/api/schedules/route.js`** — List + Create
17. **`apps/save-philly-festivals/src/app/api/schedules/[id]/route.js`** — Get + Update + Delete
18. **Legacy saved-schedule routes** — Retired with `410`; browser-local schedule is current

### Phase 4: Supporting Features
19. **`apps/save-philly-festivals/src/lib/calendar.js`** — .ics generation
20. **`apps/save-philly-festivals/src/app/api/calendar/[festivalId]/route.js`** — Calendar download
21. **`apps/save-philly-festivals/src/lib/email.js`** — Nodemailer setup
22. **`apps/save-philly-festivals/src/features/email/email-templates.js`** — HTML templates
23. **`apps/save-philly-festivals/src/app/api/email/send/route.js`** — Send email endpoint
24. **Private producer asset provider** — Current authenticated upload path
25. **`apps/save-philly-festivals/src/app/api/upload/route.js`** — Legacy endpoint retired with `410`

### Phase 5: Authentication and Middleware
26. Auth.js route protection is implemented in `apps/save-philly-festivals/src/proxy.js`, with server-side `auth()` checks on protected handlers.

---

## 7. Testing Each Component

### Test the health endpoint first
```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "database": "connected" }
```

### Test festival CRUD
```bash
# Create
curl -X POST http://localhost:3000/api/festivals \
  -H "Content-Type: application/json" \
  -d '{"name":"Mann Center Fest","description":"Summer music fest","contact_email":"test@test.com"}'

# List
curl http://localhost:3000/api/festivals

# Get one (replace <id> with actual UUID)
curl http://localhost:3000/api/festivals/<id>

# Update
curl -X PATCH http://localhost:3000/api/festivals/<id> \
  -H "Content-Type: application/json" \
  -d '{"location":"Mann Center"}'

# Delete
curl -X DELETE http://localhost:3000/api/festivals/<id>
```

### Test approval workflow
```bash
# Submit festival (creates as draft)
curl -X POST http://localhost:3000/api/festivals \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Fest","contact_email":"producer@test.com"}'

# Approve it (replace <id>)
curl -X POST http://localhost:3000/api/festivals/<id>/approve \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

### Test schedules
```bash
# Create schedule (use a valid festival_id)
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"festival_id":"<festival-uuid>","title":"Main Stage","start_time":"2026-08-01T18:00:00Z","end_time":"2026-08-01T22:00:00Z"}'

# List schedules for festival
curl "http://localhost:3000/api/schedules?festival_id=<festival-uuid>"
```

### Test retired saved schedules
```bash
curl -i -X POST http://localhost:3000/api/schedules/save
curl -i "http://localhost:3000/api/schedules/saved?email=user@test.com"
curl -i -X DELETE http://localhost:3000/api/schedules/saved
# Each returns 410 without database or mail access.
```

### Test calendar download
```bash
curl -o philly-fests-schedule.ics -X POST http://localhost:3000/api/schedules/calendar \
  -H "Content-Type: application/json" \
  -d '{"selection":{"version":1,"items":[{"type":"festival","id":"<festival-id>"}]}}'
```

### Test email (requires SMTP config in `apps/save-philly-festivals/.env`)
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@test.com","template":"confirmation","data":{"festivalName":"Test Fest","date":"Aug 1"}}'
```

### Test retired public upload
```bash
curl -i -X POST http://localhost:3000/api/upload
# Returns 410 without reading multipart data or accessing the filesystem.
```

### Test validation (should return 400)
```bash
curl -X POST http://localhost:3000/api/festivals \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 with validation errors for required fields
```

---

## 8. Environment Variables to Add

Add to `apps/save-philly-festivals/.env.example` (and `apps/save-philly-festivals/.env`). The values below are app-root-relative where they contain paths.

```bash
# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Save Philly Festivals <noreply@savephillyfestivals.org>"

# Upload
UPLOAD_DIR="public/uploads"
MAX_FILE_SIZE="5242880"
```

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Feature-based queries in `apps/save-philly-festivals/src/features/` | Keeps DB logic separate from API routes; reusable from server actions later |
| Zod schemas co-located with features | `festival-schemas.js` lives next to `festival-queries.js` — easy to find |
| `snake_case` DB fields per coding standards | Prisma maps `snake_case` columns to `camelCase` JS fields automatically |
| Single `handleApiError()` wrapper | Every route.js wraps its handler in try/catch calling this — consistent error responses |
| `.ics` uses `uuid` for event UIDs | Prevents duplicate calendar entries when users import multiple times |
| Email log table | Audit trail for all outgoing emails; useful for debugging + compliance |
| Prisma singleton pattern | Prevents connection exhaustion during Next.js hot reload in dev |
| Status workflow: draft → pending → approved/rejected | Producers save drafts, then explicitly submit (→ pending), admin reviews |
