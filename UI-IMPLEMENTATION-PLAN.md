# UI Implementation Plan — Closing the Backend/Interface Gap

**Created:** 2026-08-05
**Baseline:** `main` at `f065a13`
**Problem:** The delivered backend capability (F-01 – F-09 + importer) is not reflected in the user interface. Feature work landed as APIs, database guarantees, and CLI tooling, while the screens that expose them are minimal, visually inconsistent with the rest of the product, or missing entirely.

This document is an implementation plan, not a status report. See `PROJECT-STATUS.md` for overall project state.

---

## 1. Evidence

This is measured from the current `main`, not estimated.

### 1.1 Feature UI does not use the design system

The pre-existing application uses the shadcn-style primitives in `src/components/ui/*` (`Card`, `Button`, `Badge`, `Dialog`, `Input`). **Every interface built during F-07 – F-09 uses none of them** — raw `<div>`s with ad-hoc Tailwind instead.

| Component | Feature | `@/components/ui/*` imports | Lines |
|---|---|---:|---:|
| `AdminFestivalDetail.jsx` | F-08 editorial workflow (entire) | **0** | 65 |
| `AdminFestivalList.jsx` | F-08 queue | **0** | 20 |
| `AdminSocialFeedManager.jsx` | F-09 moderation | **0** | 169 |
| `ProducerShell.jsx` | F-07 shell | **0** | 67 |
| `ProducerSubmissionEditor.jsx` | F-07 editor | **0** | 383 |
| `ProducerSubmissionList.jsx` | F-07 list | **0** | 63 |
| `app/admin/page.jsx` (pre-existing) | dashboard | uses `Card`/`Button`/`Badge` | 100+ |
| `app/admin/settings/page.jsx` (pre-existing) | users | uses primitives | 499 |

**Consequence:** the newest, most important screens look like a different product than the ones the client reviewed.

### 1.2 Density hides capability

`AdminFestivalDetail.jsx` implements the **entire** editorial workflow — state transitions, internal reason, producer message, public cancellation message, private asset review, audit timeline, and notification retry — in **65 lines** of densely packed single-line JSX. The backend supports a nine-state audited workflow; the screen presents it as a bare `<select>` and a button.

### 1.3 Capabilities with no interface at all

| Capability | Backend status | UI status |
|---|---|---|
| Festival CSV import (batches, quarantine, reconciliation) | Complete, audited, signed-review, resumable | **None.** CLI + JSON reports only |
| Import quarantine review (332 rows) | Durable lineage + issue codes per row | **None** |
| Festival content editing by editors | Not implemented | **None** |
| Social feed provider sync trigger/status | Internal API + lease | **None** (config only) |
| Notification delivery queue across festivals | Durable outbox + retry API | Per-festival only |

**This is the most serious gap.** `PROJECT-STATUS.md` assigns the 332-row quarantine review to non-technical client owners, but the only way to do it today is reading CLI JSON. That task is currently impossible for its assigned owners.

### 1.4 The admin dashboard predates the workflow

`app/admin/page.jsx` counts only `pending_review`, `approved`, and `rejected`. The F-08 workflow added `draft`, `changes_requested`, `published`, `unpublished`, `canceled`, and `archived`. It also has no view of notification failures, social moderation backlog, or import batches. Its navigation links to `/admin/festivals`, `/admin/pending`, and `/admin/settings` only — social moderation and import are unreachable by navigation.

### 1.5 Placeholder content still ships

| Location | Issue |
|---|---|
| `app/page.js` | `articles` imported from `@/lib/festivals` (hard-coded mock) |
| `app/(public)/tours/page.js` | `tours` imported from the same mock module |
| Home page Map view | Rendered as unavailable |

### 1.6 Visual fidelity was never verified

The Figma prototype is the agreed visual source of truth, but inspect-mode access and exported assets were never available. No screen has been validated against measurements, tokens, or component variants.

---

## 2. Root cause

Work was sequenced backend-first with browser tests asserting **behavior and accessibility semantics** (roles, labels, states) rather than **visual or structural quality**. A 65-line screen and a 500-line screen both pass `getByRole("button", { name: "Approve" })`. The test suite therefore never signaled the gap — it was measuring the wrong dimension for this concern.

---

## 3. Standards for this work

Non-negotiable, consistent with the rest of the project:

1. **Use `src/components/ui/*` primitives.** No new bespoke element where a primitive exists. Extend the primitive if it is insufficient.
2. **Preserve every safety guarantee.** Optimistic-revision conflicts, required moderation reasons, same-origin enforcement, fail-closed provider states, and redaction must survive refactors. UI must never expose contact data, Drive IDs, provider IDs, cursors, or internal error text.
3. **Accessibility is part of done.** Labels, focus management, live-region status, keyboard operation, and visible focus. Errors announced, not just colored.
4. **Behavior tests must keep passing unchanged where behavior is unchanged.** If a selector must change, the change must be justified by an accessibility improvement, not by convenience.
5. **Add structural tests** so this class of regression is caught (see §6).
6. **No live providers in tests.**

---

## 4. Workstreams

Each is an independent branch, independently mergeable, ordered by client impact.

### W-1 — Editorial workspace (highest impact)

**Branch:** `feature/ui-editorial-workspace`
**Files:** `src/features/editorial-workflow/AdminFestivalDetail.jsx`, `AdminFestivalList.jsx`, `src/app/admin/festivals/page.jsx`, `src/app/admin/festivals/[id]/page.jsx`

Rebuild the editorial surface on design-system primitives:

- **Queue:** filterable table (state, submitted date, owner) with state `Badge`s, counts per state, empty/loading states, and pagination consistent with public discovery.
- **Detail:** structured layout — summary header with state + revision, submission detail card, dates/occurrence card, private contact card (clearly marked private), assets, audit timeline, notifications.
- **Transitions:** replace the bare `<select>` with explicit labeled actions per valid transition, each opening a `Dialog` that collects exactly the fields that transition requires (internal reason, producer message, public cancellation message) with inline validation before submit.
- **Conflicts:** render revision conflicts as a recoverable, explained state with a reload action — not a raw error string.
- **Timeline:** readable audit history with actor, timestamp, and messages, clearly separating internal vs producer-visible vs public text.

**Acceptance:** an editor can complete review → approve → publish → cancel entirely from the UI, understand the current state without reading the database, and never see private data unlabeled.

---

### W-2 — Import review workspace (unblocks an assigned owner task)

**Branch:** `feature/ui-import-review`
**New:** `src/app/admin/imports/page.jsx`, `src/app/admin/imports/[batchId]/page.jsx`, `src/features/festival-import/AdminImportBatchList.jsx`, `AdminImportBatchDetail.jsx`, read-only admin API routes under `src/app/api/admin/imports/`

- **Batch list:** source name, checksum (truncated + copyable), environment, status, operator/reviewer, counts by disposition, timestamps.
- **Batch detail:** reconciliation summary; row table filterable by disposition (`ready`, `imported`, `duplicate`, `quarantined`, `failed`) and issue code; per-row issue codes with plain-language explanations; link to the created draft festival for imported rows.
- **Quarantine review:** the 332 quarantined rows presented so a non-technical owner can triage them and record a decision/note.
- **Strictly read-only + redacted at first.** No apply/prepare from the browser — those remain CLI operations with signed review. The UI must not render contact fields or raw payloads.

**Acceptance:** an owner can complete quarantine triage without touching a terminal, and cannot see organizer contact data.

---

### W-3 — Admin dashboard and navigation

**Branch:** `feature/ui-admin-dashboard`
**Files:** `src/app/admin/page.jsx`, `src/app/admin/layout.jsx`

- Counts for **all** workflow states, not the legacy three.
- Actionable queues: awaiting review, changes requested, failed/pending notifications, pending social posts, quarantined import rows.
- Persistent admin navigation covering festivals, imports, social moderation, users, and settings — currently unreachable areas become reachable.
- Each card links to a filtered view.

**Acceptance:** an admin lands on `/admin` and can see and reach every outstanding task.

---

### W-4 — Producer experience polish

**Branch:** `feature/ui-producer-experience`
**Files:** `src/features/producer-submission/ProducerShell.jsx`, `ProducerSubmissionEditor.jsx`, `ProducerSubmissionList.jsx`, `src/app/producer/**`

- Rebuild on primitives; group the long editor into clear sections with progress and inline per-field validation.
- Make submission blockers explicit before submit (what is missing and where).
- Show workflow state and editor feedback prominently, with a clear "what to do next" for `changes_requested`.
- Preserve optimistic-revision handling and the secure upload boundary exactly.

**Acceptance:** a producer understands their status and required action without support.

---

### W-5 — Social moderation UI consolidation

**Branch:** `feature/ui-social-moderation`
**Files:** `src/features/social-feed/AdminSocialFeedManager.jsx`, `src/features/social-feed/PublicSocialFeed.jsx`

- Rebuild the moderation panel on primitives; separate feed configuration from the moderation queue.
- Keep required reasons for hide/reject, revision conflict handling, pagination, and empty-page recovery.
- Show sync status and last error code in operator-safe language.
- Verify the public grid matches the design language of the rest of the detail page.

**Acceptance:** moderation is efficient at desktop and mobile widths, and no unapproved content can be surfaced.

---

### W-6 — Placeholder content removal

**Branch:** `feature/ui-content-truthfulness`
**Files:** `src/app/page.js`, `src/app/(public)/tours/page.js`, `src/lib/festivals.js`

- Replace mock `articles`/`tours` with real data, or remove the sections until content exists. Do not ship invented content.
- Decide Map view: implement, or present an honest "coming soon" rather than a broken affordance.
- Delete `src/lib/festivals.js` once unreferenced.

**Acceptance:** no screen presents fabricated data as real.

---

### W-7 — Visual fidelity pass (requires client input)

**Branch:** `feature/ui-visual-fidelity`
**Blocked on:** Figma Dev Mode access or exported tokens/assets.

- Reconcile colors, typography, spacing, and component variants with Figma.
- Confirm 390 px and 1440 px plus intermediate widths.
- Product-owner visual acceptance per `docs/Features.md` Definition of Done.

**Acceptance:** owner sign-off recorded.

---

## 5. Sequencing

| Order | Workstream | Rationale |
|---|---|---|
| 1 | W-1 Editorial workspace | Daily-use surface; highest client visibility |
| 2 | W-2 Import review | Unblocks an owner task that is currently impossible |
| 3 | W-3 Dashboard + navigation | Makes W-1/W-2 discoverable |
| 4 | W-4 Producer experience | External-facing; affects submission quality |
| 5 | W-5 Social moderation | Lower volume until provider activation |
| 6 | W-6 Placeholder content | Small, independent; can land anytime |
| 7 | W-7 Visual fidelity | Gated on Figma access |

W-6 can be done opportunistically. W-7 should be last so it polishes final structure rather than intermediate states.

---

## 6. Testing requirements

Existing gates still apply in full. This work adds the missing dimension.

**Per workstream:**

- Behavior tests unchanged where behavior is unchanged; any selector change justified in the PR.
- New browser coverage: full task completion (not just element presence), empty/loading/error/conflict states, keyboard-only operation, desktop **and** mobile.
- Redaction assertions: no contact values, Drive IDs, provider IDs, cursors, tokens, or raw errors in the DOM. Especially W-2.

**New structural guard (add in W-1, extend after):**

A contract test asserting that admin/producer feature components import from `@/components/ui/*` rather than reimplementing primitives — the regression that produced this gap goes undetected today.

**Recommended:** add `@axe-core/playwright` and scan each rebuilt screen (also listed as E-4 in `PROJECT-STATUS.md`).

---

## 7. Definition of done

A workstream is complete when:

1. It uses the shared design system.
2. Every backend capability it exposes is reachable and comprehensible in the UI.
3. Empty, loading, error, conflict, and permission-denied states exist.
4. Keyboard and screen-reader operation verified; axe scan clean.
5. Desktop and mobile verified.
6. No private or internal data leaks into the DOM.
7. All existing gates pass on the exact merge commit; branch deleted after merge.
8. `PROJECT-STATUS.md` and `docs/Client-UserGuide.md` updated where screens changed.

---

## 8. Explicitly out of scope

- Changing workflow semantics, database constraints, or provider boundaries. This is a presentation-layer effort.
- Enabling any external provider.
- Browser-initiated import prepare/apply — those stay CLI-only with signed review.
- New product features not already in `docs/Features.md`.

---

## 9. Open questions for the client

1. **Figma access** — can Dev Mode or exported tokens/assets be provided? W-7 is blocked without it.
2. **Home page articles and `/tours`** — real content, or remove the sections?
3. **Map view** — implement, or defer with honest messaging?
4. **Editor festival editing** — should editors be able to correct festival content directly, or only request producer changes? This is a workflow decision with audit implications, not just UI.
5. **Quarantine triage** — should owner decisions recorded in W-2 feed a future re-import, or only inform manual entry?
