## Website Feature List (with Content Editing)

### 1. Core Models & Roles

- **User roles**
  - **Public visitor** – browse festivals, map, Our Festivals.
  - **Producer** – create and manage own festival submissions.
  - **Admin/Staff** – web page content on all pages is editable and has full control over producers, festivals, featured content, Our Festivals. (similar to Wix.com)

- **Festival model**
  - Fields: title, description, producer, tags, start/end date & time, location (address + lat/long), images, status (`draft`, `pending_review`, `needs_changes`, `approved`, `published`), `featured` flag.
  - Supports approval pipeline and map behavior.

- **Producer model**
  - Fields: name, email, org, description, role/status (`public`, `producer`, `disabled`).
  - Used to gate who can submit and publish events.

---

### 2. Producer Flow (One-Step Onboarding + Submission)

- **Combined “Become a Producer & Submit Event”**
  - Single flow that:
    - Captures producer profile (contact, org, short bio).
    - Captures festival details (text, dates, location, tags, images).
  - On submit:
    - Creates producer account.
    - Creates festival with `pending_review` (or similar).

- **Producer dashboard**
  - Shows producer’s festivals with statuses.
  - Actions:
    - Create new festival.
    - Edit and resubmit `draft` / `needs_changes`.
    - View read‑only `approved` / `published`.

---

### 3. Admin / Staff Backend & Editing

- **Admin access**
  - Separate admin login.
  - Role enforcement so only admins can approve, feature, or delete.

- **Producer management**
  - View list of producers filtered by status.
  - Edit producer profile fields.
  - Change role: Public → Producer; Producer → Disabled.
  - Manually create producer accounts (e.g., from in‑person contacts).

- **Festival review & approval**
  - Pending queue for `pending_review` / `needs_changes`.
  - Review view:
    - Full event details (content, dates, location, tags, images, producer).
    - Actions: Approve, Reject, Ask for changes.

- **Admin content editing (key Monica requirement)**
  - Admin can:
    - Edit any festival’s content before or after approval:
      - Title, description, dates, location, tags, images, featured flag.
    - Save edits as:
      - Draft update (not yet live) or
      - Live update (with versioning/log, if implemented).
  - For imported/legacy festivals:
    - Flag records that **need validation** (e.g., questionable locations).
    - Let admin review, edit, and mark as validated.
  - Rationale: lets Monica and team correct imported data, adjust copy, swap images, and tune what’s live without dev support.

- **Staff account management**
  - Admin can add/edit/deactivate staff/admin accounts.

---

### 4. Public Site: Discoverability

- **Homepage with Featured Festivals**
  - “Featured Festivals” section driven by `featured` flag.
  - UI auto rotating carousel or similar with 3-5 second intervals.

- **Festival listing & filters**
  - Discover/browse page:
    - Card list view with image, title, short description, dates, location tags.
    - Filters by date range, tag, and possibly region.

- **Festival detail page**
  - Full detail page:
    - Hero image + optional gallery.
    - Description, dates/times, address.
    - Map link.
    - Tags and (optionally) more from same producer.

---

### 5. Digital Our Festivals (Content‑Managed)

- **Digital Our Festivals model**
  - Fields: image, title, caption/description, linked festival, display order.

- **Public Our Festivals view**
  - Gallery/grid view with lightbox/detail view for each item.

- **Our Festivals content editing (admin)**
  - Admin UI for:
    - Adding/editing/removing Our Festivals items.
    - Uploading/replacing images.
    - Reordering items (priority/order field or drag‑and‑drop).
  - This is another key **content editing surface** for Monica’s team.

---

### 6. Asset Handling & Image Specs

- **Festival & Our Festivals image uploads**
  - Producers/admins can upload images.
  - Backend generates appropriate sizes for cards, details, and thumbnails.

- **Clear image guidelines** User facing
  - Implement consistent aspect ratio (e.g., ~500×350 with defined cropping).
  - Surface recommended specs in:
    - Admin UI hints (e.g., “Best results: 3:2 images, at least 1200×800”).
    - Handoff documentation.

---

## Phased Implementation Roadmap

### Phase 1 – Launch‑Critical (MVP for real use + Monica’s ability to edit)

1. **Core models & roles**
   - Festival model, producer model, user roles.
2. **Admin portal basics**
   - Admin login.
   - Producer list + basic role editing.
   - Festival list + basic detail view.
3. **Producer one‑step submission**
   - Public form that both:
     - Creates producer.
     - Submits initial festival (`pending_review`).
4. **Festival approval workflow**
   - Pending queue.
   - Review page with Approve / Reject / Ask for changes.
5. **Admin content editing for festivals**
   - Full edit capability for admins:
     - Before publishing.
     - After publishing (with clear “live update” behavior).
6. **Homepage + festival detail**
   - Featured section (using `featured` flag).
   - Festival detail page.
7. **Admin portal stability & cross‑browser checks**
   - Fix login/connection issues.
   - Sanity test on Chrome + Safari (desktop and iPad).

Result: Monica can **populate, review, edit, and publish** content; producers can submit; public can see a working directory of festivals.

---

### Phase 2 – Discovery & Map Experience

1. **Festival listing with filters**
   - Discover page with filterable list.
2. **Location normalization**
   - Geocoding on save/approval.
   - Admin flags for location issues.
3. **Imported festival validation workflow**
   - Mark questionable records.
   - Admin tools to quickly correct and approve.

Result: The large imported dataset (400+) becomes navigable via list and map, with admins able to clean up problematic entries.

---

### Phase 3 – Digital Our Festivals & Rich Content

1. **Digital Our Festivals public view**
   - Gallery/grid page, basic layout.
2. **Digital Our Festivals admin editing**
   - CRUD interface for Our Festivals items.
   - Image uploads and ordering.
3. **Image handling polish**
   - Standardized responsive image sizes.
   - Visible guidance on recommended dimensions in admin UI.

Result: Monica’s team can tell richer stories and surface curated visuals without developer intervention.

---

### Phase 4 – Producer UX & Operational Polish

1. **Producer dashboard**
   - View own events, statuses; edit drafts / resubmit after “needs_changes.”
2. **Staff account management**
   - Admin add/edit/deactivate staff users.
3. **Accessibility, mobile, and performance passes**
   - Improve iPad experience, screen‑reader basics, and page performance.

Result: Smoother ongoing operations and a more maintainable platform with better UX for producers and staff.

