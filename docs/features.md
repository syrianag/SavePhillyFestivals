# Feature Documentation

Every implemented feature, one entry per feature, using the standard template:

**Feature Name / Purpose / Location / Example / Dependencies / Database Tables / API Routes / Components / Utility Functions / Current Status**

Status values: **Complete** | **Needs Testing** | **Needs Refactoring**

---

## 1. Live-DB Homepage

- **Purpose:** Render the public homepage from real database rows (approved festivals) instead of static demo data.
- **Location:** `src/app/page.js` (Server Component), `src/components/home/HomeClient.jsx`
- **Example:** `GET /` returns festival cards, featured/upcoming sections, and area filters built from `getFestivals({ status: "approved" })` mapped through `festival-mapper.js`.
- **Dependencies:** Next.js server components, `src/lib/festival-mapper.js`, `src/features/festivals/festival-queries.js`, static category/area lists in `src/lib/festivals.js`
- **Database Tables:** `Festival`, `FestivalCategory`, `FestivalTag`
- **API Routes:** none (server-side data fetch)
- **Components:** `src/components/home/HomeClient.jsx`, `src/components/shared/FestivalCard.jsx`, `src/components/shared/FeaturedFestivalCard.jsx`, `src/components/shared/SearchBar.jsx`, `src/components/shared/DecorativeBlocks.jsx`
- **Utility Functions:** `getFestivals()` in `src/features/festivals/festival-queries.js`, `mapFestival()` in `src/lib/festival-mapper.js`
- **Current Status:** Complete

## 2. Authentication / Login

- **Purpose:** Allow producers and admins to sign in via email/password using NextAuth (Credentials provider) with JWT sessions, and gate protected areas.
- **Location:** `src/lib/auth.js`, `src/lib/auth-helpers.js`, `src/app/(auth)/login/`, `src/proxy.js`
- **Example:** `admin@example.com` / `admin123` signs in at `/login`; a session cookie is set and the proxy middleware enforces it on `/admin/:path*` and API mutations.
- **Dependencies:** NextAuth v4, `AUTH_SECRET`, `AUTH_URL=http://localhost:3100`, bcrypt password hashes
- **Database Tables:** `User`, `Account`, `Session`, `VerificationToken`
- **API Routes:** NextAuth internal `/api/auth/*`
- **Components:** `src/components/shared/NavBar.jsx` (login/logout UI)
- **Utility Functions:** `authOptions`, `requireAdmin()`, `requireProducer()`, `requireRole()`, `ROLES` in `src/lib/auth-helpers.js`; bcrypt compare in `src/lib/auth.js`
- **Current Status:** Complete

## 3. Festival Submission & Review Workflow

- **Purpose:** Producers submit festivals; admins review (approve / reject with reason) them so only approved festivals reach the public site.
- **Location:** `src/app/producer/submit/`, `src/app/admin/festivals/`, `src/app/admin/pending/`, `src/app/admin/festivals/[id]/`
- **Example:** A producer submits "Philly Jazz Fest" via `POST /api/festivals`; it lands in the admin Pending Review queue, where the admin opens the review dialog and approves or rejects it.
- **Dependencies:** zod validation (`src/features/festivals/schemas.js`), auth guards, file upload flow
- **Database Tables:** `Festival`, `FestivalCategory`, `FestivalTag`, `FestivalFile`
- **API Routes:** `POST /api/festivals`, `GET/PUT/PATCH/DELETE /api/festivals`, `GET/POST /api/festivals/[id]`, `GET/PATCH /api/festivals/[id]/status`, `GET/PATCH /api/festivals/[id]/review`, file upload endpoint
- **Components:** `src/features/festivals/SubmissionForm.jsx`, `src/components/admin/FestivalsDashboard.jsx`, `src/components/admin/FestivalReviewDialog.jsx`
- **Utility Functions:** `createFestival`/`getFestivalById`/`getFestivals` in `src/features/festivals/festival-queries.js`, `mapFestival()` in `src/lib/festival-mapper.js`, status helpers in `src/lib/constants.js`
- **Current Status:** Complete

## 4. Public Festival Detail + Save-to-Schedule Email Flow

- **Purpose:** Public festival detail pages render DB data and let visitors save an event to a personal schedule; saving writes a `SavedSchedule`, emails the visitor, and (on opt-in) forwards their interest to the producer's contact email.
- **Location:** `src/app/festivals/[slug]/page.jsx`, `src/features/schedules/SaveScheduleForm.jsx`
- **Example:** On `/festivals/south-street-festival` a visitor clicks "Save to my schedule" on an event; a confirmation email is sent to them and the event's producer gets an `interested` count and optional forwarded email.
- **Dependencies:** `schedule-schemas.js`, `src/lib/mail.js`, schedule queries
- **Database Tables:** `Festival`, `Schedule`, `SavedSchedule`, `EmailLog` (unused)
- **API Routes:** `POST /api/schedules/save`, `GET/DELETE /api/schedules/saved`
- **Components:** `src/features/schedules/SaveScheduleForm.jsx`, `src/components/shared/CalendarSection.jsx`, `src/components/shared/MapSection.jsx`
- **Utility Functions:** `getFestivalBySlug()` in `src/features/festivals/festival-queries.js`, `saveSchedule()` in `src/features/schedules/schedule-queries.js`, `sendScheduleConfirmation()` in `src/lib/mail.js`
- **Current Status:** Complete

## 5. Producer Dashboard / Stats / My Festivals

- **Purpose:** Give producers an overview of their festivals, stats (approved/pending/rejected counts), a calendar of their festival dates, and a management list of their own festivals.
- **Location:** `src/app/producer/dashboard/`, `src/app/producer/festivals/`, `src/app/producer/schedule/`
- **Example:** `GET /producer/dashboard` renders the `CalendarWidget` fed by `GET /api/producer/stats`; clicking a highlighted day lists that producer's festivals running then.
- **Dependencies:** `requireProducer()`, `producer-queries.js`, `CalendarWidget`
- **Database Tables:** `Festival`, `Schedule`
- **API Routes:** `GET /api/producer/stats`, festival queries scoped to `submitted_by`
- **Components:** `src/components/shared/CalendarWidget.jsx`, `src/components/producer/ProducerNav.jsx`
- **Utility Functions:** `getProducerStats()`/`getProducerFestivals()` in `src/features/producers/producer-queries.js`, `requireProducer()` in `src/lib/auth-helpers.js`
- **Current Status:** Complete

## 6. Admin Festivals Dashboard + Pending Review

- **Purpose:** Admin table of all festivals with filtering/sorting and a pending-review queue with approve/reject actions and review reasons.
- **Location:** `src/app/admin/festivals/`, `src/app/admin/pending/`
- **Example:** Admin visits `/admin/pending`, sees submissions awaiting decision, opens `FestivalReviewDialog`, and approves/rejects with a note.
- **Dependencies:** `requireAdmin()`, festival review queries
- **Database Tables:** `Festival`, `FestivalCategory`, `FestivalTag`, `Note`
- **API Routes:** `GET /api/festivals`, `GET/PATCH /api/festivals/[id]/review`, `GET/PATCH /api/festivals/[id]/status`
- **Components:** `src/components/admin/FestivalsDashboard.jsx`, `src/components/admin/FestivalReviewDialog.jsx`, `src/components/admin/AdminSidebar.jsx`
- **Utility Functions:** `getFestivals()`, `updateFestivalStatus()` in `src/features/festivals/festival-queries.js`
- **Current Status:** Complete

## 7. Admin Producers (List / Detail)

- **Purpose:** Admins browse producers and view a producer's detail including their festivals, notes, and contact info.
- **Location:** `src/app/admin/producers/`, `src/app/admin/producers/[id]/`
- **Example:** `GET /admin/producers` lists users with the `producer` role; `/admin/producers/[id]` shows that producer's submitted festivals and any attached notes.
- **Dependencies:** `requireAdmin()`, producer queries
- **Database Tables:** `User`, `Festival`, `Producer`, `Note`
- **API Routes:** `GET /api/users` (admin-scoped), producer-specific API routes
- **Components:** `src/components/admin/AdminSidebar.jsx`
- **Utility Functions:** producer queries in `src/features/producers/producer-queries.js`
- **Current Status:** Complete

## 8. Admin Tasks Kanban

- **Purpose:** Admin/team kanban board for tracking tasks across `todo` / `in_progress` / `done` with priorities, due dates, and assignees.
- **Location:** `src/app/admin/tasks/`
- **Example:** An admin drags/updates a task from "todo" to "in_progress"; state persists via `PUT /api/tasks/[id]`.
- **Dependencies:** zod (`task-schemas.js`), `requireAdmin()`
- **Database Tables:** `Task`
- **API Routes:** `GET/POST /api/tasks`, `PUT/PATCH/DELETE /api/tasks/[id]`
- **Components:** `src/components/admin/AdminSidebar.jsx` (task nav)
- **Utility Functions:** `createTask`/`updateTask`/`deleteTask`/`getTasks` in `src/features/tasks/task-queries.js`
- **Current Status:** Complete

## 9. Admin Organizations CRUD

- **Purpose:** Admins create, edit, view, and delete the organizations that run festivals.
- **Location:** `src/app/admin/organizations/`
- **Example:** `GET /admin/organizations` lists all orgs with create/edit/delete actions backed by the organizations API.
- **Dependencies:** `requireAdmin()`, zod validation, organization queries
- **Database Tables:** `Organization`, `Festival` (org relationship)
- **API Routes:** `GET/POST /api/organizations`, `GET/PUT/PATCH/DELETE /api/organizations/[id]`
- **Components:** `src/components/admin/AdminSidebar.jsx`
- **Utility Functions:** `createOrganization`/`updateOrganization`/`getOrganizations` in `src/features/organizations/organization-queries.js`
- **Current Status:** Complete

## 10. Admin Settings (User Role Management)

- **Purpose:** Admins manage user roles and account settings.
- **Location:** `src/app/admin/settings/`
- **Example:** An admin promotes a user to `admin` or `producer` from the settings page.
- **Dependencies:** `requireAdmin()`, user queries
- **Database Tables:** `User`
- **API Routes:** `PATCH /api/users/[id]`, `GET /api/users`
- **Components:** `src/components/admin/AdminSidebar.jsx`
- **Utility Functions:** user queries in `src/features/users/user-queries.js`
- **Current Status:** Complete

## 11. Admin Schedules List

- **Purpose:** Admins view all saved schedules / schedule data across festivals.
- **Location:** `src/app/admin/schedules/`
- **Example:** `GET /admin/schedules` lists saved schedules with festival, email, and date info for review/export.
- **Dependencies:** `requireAdmin()`, schedule queries
- **Database Tables:** `SavedSchedule`, `Schedule`, `Festival`
- **API Routes:** `GET /api/schedules/saved`
- **Components:** `src/components/admin/AdminSidebar.jsx`
- **Utility Functions:** `getSavedSchedules()` in `src/features/schedules/schedule-queries.js`
- **Current Status:** Complete

## 12. Notes System

- **Purpose:** Attach staff/admin notes to festivals (or other entities) during review and coordination.
- **Location:** `src/components/admin/NotesSection.jsx`, `src/features/notes/`
- **Example:** An admin adds a review note to a festival; it persists with `entity_type` / `entity_id` and `author_email`.
- **Dependencies:** zod (`note-schemas.js`), `requireAdmin()`
- **Database Tables:** `Note`
- **API Routes:** `GET/POST /api/notes`, `DELETE /api/notes/[id]`
- **Components:** `src/components/admin/NotesSection.jsx`
- **Utility Functions:** `createNote`/`getNotes`/`deleteNote` in `src/features/notes/note-queries.js`
- **Current Status:** Complete

## 13. Visitor Personal Schedule (Context + Calendar/ICS)

- **Purpose:** Track a visitor's saved festival events client-side in `localStorage` and offer a calendar view with ICS export/download.
- **Location:** `src/features/schedule-context/`, `src/components/shared/CalendarSection.jsx`, `src/lib/ics.js`
- **Example:** A visitor's saved events are held in the schedule context; the calendar section lists them and generates an `.ics` file download for import into Google/Apple Calendar.
- **Dependencies:** React context, `localStorage`, `src/lib/ics.js`
- **Database Tables:** none (client-only) — persisted server-side via `SavedSchedule`
- **API Routes:** none for context; `GET /api/schedules/saved` for fetch
- **Components:** `src/components/shared/CalendarSection.jsx`, `SaveScheduleForm.jsx`
- **Utility Functions:** schedule-context provider/hooks, `generateICS()` in `src/lib/ics.js`
- **Current Status:** Complete

## 14. File Upload

- **Purpose:** Let producers/admins upload festival images and files, restricted by type/size and gated behind auth.
- **Location:** `src/app/api/upload/`, `src/lib/uploads.js`
- **Example:** A producer uploads `image/png` under 5 MB; it is validated, saved to disk, and linked to the festival.
- **Dependencies:** `requireProducer()`/`requireAdmin()`, `src/lib/constants.js` (`ALLOWED_FILE_TYPES`, `MAX_FILE_SIZE`)
- **Database Tables:** `FestivalFile`
- **API Routes:** `POST /api/upload`, file-serving route
- **Components:** embedded in `SubmissionForm.jsx`
- **Utility Functions:** `handleUpload`/`saveFile` in `src/lib/uploads.js`, constants in `src/lib/constants.js`
- **Current Status:** Complete

## 15. Users API

- **Purpose:** CRUD/role management for users, used by Admin Settings and admin producer list.
- **Location:** `src/app/api/users/`, `src/features/users/`
- **Example:** `GET /api/users` returns users filtered by role for the admin producers list; `PATCH /api/users/[id]` updates a role.
- **Dependencies:** `requireAdmin()`, zod validation
- **Database Tables:** `User`
- **API Routes:** `GET/POST /api/users`, `GET/PUT/PATCH/DELETE /api/users/[id]`
- **Components:** admin settings/producers pages
- **Utility Functions:** `createUser`/`updateUser`/`getUsers` in `src/features/users/user-queries.js`
- **Current Status:** Complete

## 16. Contact Form Email Flow

- **Purpose:** Send visitor messages from the Contact and About pages to the org inbox with validation and success/error states.
- **Location:** `src/app/api/contact/route.js`, `src/features/contact/`, `src/app/(public)/contact/`, `src/app/(public)/about/`
- **Example:** A visitor submits the contact form; `POST /api/contact` validates via `contactMessageSchema` and sends via `sendContactMessage()` (stubbed to console when `RESEND_API_KEY` is unset).
- **Dependencies:** zod (`contact-schemas.js`), `src/lib/mail.js`
- **Database Tables:** none (email only)
- **API Routes:** `POST /api/contact`
- **Components:** contact/about page forms
- **Utility Functions:** `sendContactMessage()` in `src/lib/mail.js`
- **Current Status:** Complete

## 17. Mail Module

- **Purpose:** Central email-sending helper used by the schedule-save flow and contact forms; falls back to console logging in dev.
- **Location:** `src/lib/mail.js`
- **Example:** `sendScheduleConfirmation(...)` emails a visitor; `sendContactMessage(...)` forwards to `CONTACT_EMAIL`. Both HTML-escape user content and stub when `RESEND_API_KEY` is unset.
- **Dependencies:** `RESEND_API_KEY`, `CONTACT_EMAIL` env vars (optional)
- **Database Tables:** `EmailLog` (model exists, currently unused)
- **API Routes:** n/a (called by route handlers)
- **Components:** n/a
- **Utility Functions:** `sendMail`/`sendScheduleConfirmation`/`sendContactMessage`
- **Current Status:** Complete (dev stub), **Needs Testing** against a real Resend key

## 18. Onboarding Flow

- **Purpose:** Walk new users through profile/org setup after sign-in.
- **Location:** `src/features/onboarding/`
- **Example:** A newly created producer sees an onboarding checklist/prompt to complete their profile and organization before submitting festivals.
- **Dependencies:** auth session, user queries
- **Database Tables:** `User`, `Organization`, `Producer`
- **API Routes:** onboarding/profile endpoints
- **Components:** onboarding UI components
- **Utility Functions:** onboarding helpers in `src/features/onboarding/`
- **Current Status:** Needs Testing

## 19. Schedule Builder (Producer/Admin editing of festival schedules)

- **Purpose:** Let producers/admins create and edit the schedule events (dates, times, locations) that appear on a festival and feed the calendar/save flows.
- **Location:** `src/features/schedules/schedule-queries.js`, `src/app/api/schedules/`, `src/app/producer/schedule/`
- **Example:** A producer adds an event to their festival's schedule; `createSchedule` inserts a `Schedule` row.
- **Dependencies:** zod (`schedule-schemas.js`), `requireProducer()`
- **Database Tables:** `Schedule`
- **API Routes:** `POST /api/schedules/save` and `GET/DELETE /api/schedules/saved` exist; **no CRUD API routes** for create/update/delete of schedules exist yet
- **Components:** schedule editor UI (partially in `src/app/producer/schedule/`)
- **Utility Functions:** `createSchedule`/`updateSchedule`/`deleteSchedule` in `src/features/schedules/schedule-queries.js` (implemented but **unused**)
- **Current Status:** Needs Refactoring — query functions exist but no CRUD API routes or UI wiring; see `docs/SCHEDULE-CALENDAR-EMAIL.md`

---

## Cross-Cutting Notes

- **No automated tests exist in the repo.** Features relying on unverified flows are marked "Needs Testing" until a test suite (unit/integration) is added and run.
- **Unused models:** `Permission`, `EmailLog`, `Communication` exist in `prisma/schema.prisma` but are not wired to any feature.
- **Env config:** `DATABASE_URL` (Neon Postgres), `AUTH_SECRET`, `AUTH_URL=http://localhost:3100`, optional `RESEND_API_KEY` / `CONTACT_EMAIL`.
- **Auth proxy:** `src/proxy.js` guards `/admin/:path*` and all API mutation routes via the session cookie.
