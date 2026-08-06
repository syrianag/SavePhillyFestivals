# Implemented Core Features (P0+P1)

This documents the five "core features" shipped to connect the redesigned public site to the real database, email, and auth flows, plus the deferred P2 list. Verified with `npm run lint` (0 errors) and `npm run build`.

---

## 1. Live-DB Homepage

**Before:** `src/app/page.js` was a client component rendering static demo data from `src/lib/festivals.js`.

**After:** The homepage fetches real data on the server.

- `src/app/page.js` is now a Server Component that calls `getFestivals({ status: "approved", limit: 100 })` and maps the DB rows through `src/lib/festival-mapper.js` into the shape the section components expect (`id, title, slug, rawDate, date, location, category, description, bgColor, badge, image, tags`).
- The mapper derives a stable brand color per festival from a slug hash, formats `start_date`/`end_date` into a readable range, and falls back gracefully when `location`, `category`, `tags`, or dates are missing.
- Interactive state (search query, filters, featured/upcoming memoization, area selection) moved into `src/components/home/HomeClient.jsx`, a client component that receives the fetched data as props.

## 2. Save-to-Schedule Email Flow

**Before:** `SaveScheduleForm.jsx` existed and posted to `POST /api/schedules/save` but was mounted nowhere in the UI.

**After:** Each schedule event on the festival detail page (`src/app/festivals/[slug]/page.jsx`) now renders `<SaveScheduleForm scheduleId={event.id} festivalName={festival.name} />`. Saving creates a `SavedSchedule` row (feeding producer/admin `interested` counts), sends a confirmation email to the visitor, and — when the visitor opts in — forwards their email to the festival's `contact_email`.

## 3. Producer Dashboard Calendar

**Before:** `PlaceholderCalendar` ("Calendar coming soon") with static empty month grid.

**After:** `src/app/producer/dashboard/page.jsx` replaces the placeholder with the shared `CalendarWidget`, fed by `GET /api/producer/stats`. Days with any of the producer's festival dates are marked, month navigation works, and selecting a day lists the festivals running on that day with their status.

## 4. Producer Route Guard

**Before:** The producer area (`src/app/producer/`) had no server-side auth check; the layout was a client component.

**After:**

- `requireProducer()` added to `src/lib/auth-helpers.js` (enforces `producer` level, redirects unauthenticated users to `/login` and non-producers to `/`).
- `src/app/producer/layout.jsx` is now a Server Component that calls `requireProducer()` before rendering.
- The header/nav (logo, email, links, sign out, mobile menu) was extracted to `src/components/producer/ProducerNav.jsx` (client) and imported by the layout.

## 5. Wired Contact Forms

**Before:** The `/contact` page and the About page's Contact tab only flipped `setSubmitted(true)`.

**After:**

- New `POST /api/contact` route (`src/app/api/contact/route.js`) validates with `contactMessageSchema` (`src/features/contact/contact-schemas.js`).
- New `sendContactMessage()` in `src/lib/mail.js` sends to `CONTACT_EMAIL` (default `info@savephillyfestivals.org`), HTML-escapes user content, and stubs to console when `RESEND_API_KEY` is unset.
- Both forms now POST with loading / error / success states.

---

## Deferred (P2) — Documented, Out of Scope

- **Interactive map** — `MapSection.jsx` is still a gray placeholder box with a `MapPin` icon.
- **Sponsors from DB** — About page sponsor cards are hard-coded.
- **Tours booking** — Tours pages are marketing-only.
- **Resources downloads** — Resources page is static.
- **Story pages** — Festival `story`/`mission`/`history` render inline on the detail page; no dedicated story pages.
- **Dead-code cleanup** — `StaffHub.jsx`, `festival-calendar.js` (unused ICS helper), and unused `Permission`/`EmailLog`/`Communication` models remain.
- **`/my-schedule` page** — view/remove saved schedules isn't linked from the UI yet (the schedule-save email links to it).

## Related Files

| Concern | Files |
|---|---|
| Mapper | `src/lib/festival-mapper.js` |
| Homepage | `src/app/page.js`, `src/components/home/HomeClient.jsx` |
| Schedule form | `src/features/schedules/SaveScheduleForm.jsx`, `src/app/festivals/[slug]/page.jsx` |
| Producer guard | `src/lib/auth-helpers.js`, `src/app/producer/layout.jsx`, `src/components/producer/ProducerNav.jsx` |
| Producer calendar | `src/app/producer/dashboard/page.jsx`, `src/components/shared/CalendarWidget.jsx`, `src/app/api/producer/stats/route.js` |
| Contact | `src/app/api/contact/route.js`, `src/features/contact/contact-schemas.js`, `src/lib/mail.js`, `src/app/(public)/contact/page.js`, `src/app/(public)/about/page.js` |
