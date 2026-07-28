# Troubleshooting Log

Documented bugs, their root causes, and the fixes applied.

---

## Critical Fixes

### Bug #1: Lint Command Broken (`npm run lint` crashes)

**Date:** 2026-07-27
**Severity:** Critical
**Files:** `package.json`, `eslint.config.mjs`

**Symptom:**
`npm run lint` fails with `Cannot find module 'typescript'` or `Cannot read properties of undefined (reading 'Cjs')`.

**Root Cause:**
Two issues:
1. The lint script used `--ext .js,.jsx`, which is ESLint v8 syntax. ESLint 9 uses flat config (`eslint.config.mjs`) and does not support the `--ext` flag.
2. No `typescript` devDependency was installed. `eslint-config-next` depends on `typescript-eslint`, which requires `typescript` as a peer dependency.

**Fix:**
1. Removed `--ext .js,.jsx` from the lint script in `package.json`. The flat config in `eslint.config.mjs` handles file matching.
2. Installed `typescript@5` as a devDependency. Version 5.x is required because `typescript-eslint@8.63.0` has a peer dependency of `>=4.8.4 <6.1.0`. TypeScript 7.x (auto-installed by npm) is too new and incompatible.

```bash
npm install -D typescript@5 --legacy-peer-deps
```

Note: `--legacy-peer-deps` is needed due to a pre-existing peer dependency conflict between `nodemailer@9.0.3` and `next-auth`.

**Verification:**
- `npm run lint` passes with 0 errors
- `npm run build` compiles successfully

---

### Bug #2: `font-body` Utility Class Used Everywhere But Never Defined

**Date:** 2026-07-27
**Severity:** Critical
**File:** `src/app/globals.css`

**Symptom:**
The `font-body` Tailwind utility class is used extensively across components (`page.js`, `NavBar.jsx`, `Footer.jsx`, `FestivalCard.jsx`, `FeaturedFestivalCard.jsx`, etc.) but was never registered in the Tailwind theme. This means `font-body` silently fell back to the default font, so the intended body font was not being applied.

**Root Cause:**
The `@theme inline` block in `globals.css` defined `--font-sans`, `--font-heading`, `--font-logo`, `--font-serif`, `--font-ui`, and `--font-footer`, but not `--font-body`.

**Fix:**
Added `--font-body: var(--font-sans);` to the `@theme inline` block, mapping `font-body` to the Albert Sans font (same as the default `font-sans`).

```css
--font-body: var(--font-sans);
```

**Verification:**
- `font-body` now resolves to Albert Sans throughout the application
- `npm run build` compiles successfully

---

## High Priority Fixes

### Bug #3: Dead "Learn More" Links

**Date:** 2026-07-27
**Severity:** High
**Files:** `src/components/shared/FestivalCard.jsx`, `src/components/shared/FeaturedFestivalCard.jsx`, `src/app/page.js`, `src/lib/festivals.js`

**Symptom:**
- "Learn more" link in `FestivalCard` default variant was `href="#"` (didn't navigate anywhere)
- "Learn more" button in `FeaturedFestivalCard` was a `<button>` with no `onClick` handler (did nothing)
- "Learn more" button at the bottom of the homepage festival list was a dead `<button>` with no link

Users could not navigate to any festival detail page from the homepage.

**Root Cause:**
The static festival data in `festivals.js` did not include `slug` fields, and the card components used placeholder `href="#"` or non-functional `<button>` elements instead of proper `<Link>` navigation.

**Fix:**
1. Added a `generateSlug()` helper function to `src/lib/festivals.js` and a `slug` field to every festival in the static data array
2. Added a `slug` prop to `FestivalCard` and changed the "Learn more" `<a href="#">` to `<Link href={/festivals/${slug}}>`
3. Added a `slug` prop to `FeaturedFestivalCard` and changed the "Learn more" `<button>` to `<Link href={/festivals/${slug}}>`
4. Updated the homepage `page.js` to pass `slug` to both card components
5. Changed the bottom "Learn more" dead `<button>` to `<Link href="/calendar">`

**Verification:**
- All "Learn more" links now navigate to `/festivals/{slug}` or `/calendar`
- `npm run build` compiles successfully

---

### Bug #4: Filter Icon Button Does Nothing

**Date:** 2026-07-27
**Severity:** High
**File:** `src/components/shared/SearchBar.jsx`

**Symptom:**
The filter icon button (`SlidersHorizontal` icon) had `onClick={onFilter}` but no parent component ever passed an `onFilter` prop. Clicking it did nothing, making it misleading UI.

**Root Cause:**
The `onFilter` prop was defined in the `SearchBar` component but never wired up by any parent (`page.js`, `calendar/page.js`). The actual filtering was handled entirely through the dropdown selects.

**Fix:**
Replaced the dead `onFilter` handler with a `handleReset` function that clears the search query and all filter selections:

```jsx
function handleReset() {
  setQuery("");
  onSearch?.("");
  onFilterChange?.({ date: "", type: "", area: "" });
}
```

Changed the button's `onClick` to `handleReset` and the `aria-label` to "Reset filters".

**Verification:**
- Clicking the filter icon now resets all filters and the search query
- `npm run lint` passes

---

### Bug #5: "Caribbean" Category Missing from Filter Options

**Date:** 2026-07-27
**Severity:** High
**File:** `src/components/shared/SearchBar.jsx`

**Symptom:**
The Type dropdown filter options were: Music, Food, Art, Cultural, Community, Holidays. "Caribbean" was missing, so Caribbean festivals (like "Caribbean Summer Fest") could not be filtered for — even though "Caribbean" exists in both the database seed data and the static festival data.

**Root Cause:**
The filter options in `SearchBar.jsx` were hardcoded and did not include "Caribbean", despite it being a valid category in `src/lib/festivals.js` (line 1: `export const categories = ["Music", "Food", "Art", "Cultural", "Community", "Caribbean", "Holidays"]`).

**Fix:**
Added `<option value="Caribbean">Caribbean</option>` to the Type dropdown in `SearchBar.jsx`.

**Verification:**
- Caribbean festivals now appear when filtering by "Caribbean"
- `npm run lint` passes

---

### Bug #6: Footer Links to Nonexistent Pages (404s)

**Date:** 2026-07-27
**Severity:** High
**Files:** `src/app/(public)/resources/page.js` (new), `src/app/(public)/contact/page.js` (new), `src/components/shared/Footer.jsx`

**Symptom:**
The Footer contained links to `/resources` and `/contact`, but no route files existed for these paths. Clicking them produced 404 errors.

**Root Cause:**
The Footer's `footerSections` array referenced routes that were never created.

**Fix:**
1. Created `src/app/(public)/resources/page.js` with content sections for Producer Toolkit, Community Guidelines, Funding & Sponsorship, and Volunteer Sign-Up
2. Created `src/app/(public)/contact/page.js` with contact info (email, phone, location) and a functional contact form with name/email/message fields and submit confirmation state
3. Fixed the Portuguese copyright text in `Footer.jsx`: changed "Todos os direitos reservados" to "All rights reserved"

**Verification:**
- `/resources` and `/contact` routes now exist and render correctly
- Build generates 26 pages (2 new)
- `npm run build` compiles successfully
