# Figma Review Checklist — Implementation Status: Done

> All design tokens extracted from Figma Dev Mode (2026-07-13) and applied to the codebase.
> See `apps/save-philly-festivals/src/app/globals.css` (theme variables) and `apps/save-philly-festivals/src/app/layout.js` (font loading).

## 1. Layouts

- [x] Identify which pages share the same shell (header, footer, sidebar, etc.)
  - **Common shell:** NavBar (sticky header) + Footer. Pages render content between them.
- [ ] Document layout variants (public vs. admin vs. producer)
- [x] Extract shared layout components into `apps/save-philly-festivals/src/components/layouts/`
  - **Shell layout:** uses `<NavBar />` + `<Footer />` wrapping page content (not yet built).
- [ ] Note any nested layouts (e.g., admin sidebar with sub-nav)

## 2. Reusable Components

- [x] Catalog every UI element: buttons, inputs, cards, modals, tables, dropdowns, toggles
  - **Identified in Figma:** buttons (pill + standard), input (pill search), cards (festival cards), badges, select/dropdown, dialog/modal
- [x] Map each to existing **shadcn/ui primitives** (Button, Input, Card, Dialog, Table, etc.)
  - **Installed:** `button`, `card`, `badge`, `input`, `select`, `label`, `skeleton`, `dialog`, `separator`
- [x] Flag components that need custom implementation
  - **Custom shared components built:** `NavBar`, `FestivalCard`, `Footer`, `SearchBar` (`apps/save-philly-festivals/src/components/shared/`)
- [ ] Note component states: default, hover, active, disabled, loading, error, empty

## 3. Design Tokens

- [x] Extract all colors (not just primary — also surface, border, muted, destructive, etc.)
- [x] Extract border radius values (sm, md, lg, full)
  - **Cards:** 12px → `rounded-xl`; **Buttons/pills:** 18px → `rounded-2xl`; **Badges:** 4px → `rounded-sm`; **Inputs:** 6px → `rounded-md`; **News cards:** 20px → between `rounded-2xl`/`rounded-3xl`
- [ ] Extract shadow/box-shadow values
- [ ] Extract opacity/transparency values
- [ ] Note any gradient usage
- [x] Map tokens to Tailwind theme extensions
  - **All brand colors** added to `@theme inline` in `globals.css` (e.g., `text-brand-yellow`, `bg-brand-teal`)

## 4. Typography

- [x] Document font family (headings vs. body)
  - **Logo:** Nunito 700 (was Ohno Softie Variable — replaced with free alternative)
  - **Headings:** Maven Pro (400/500/700)
  - **Body:** Albert Sans (300/400/600/700)
  - **Serif:** Montaga 400 (H3/About sections)
  - **UI/Calendar:** Inter (400/500/700)
  - **Footer:** DM Sans (400/500/700)
- [ ] Document all text styles: h1–h6, body, small, caption, label, link
- [ ] For each: font size, line height, font weight, letter spacing
- [x] Map to Tailwind classes (`text-3xl font-bold`, etc.)
  - **CSS variables:** `font-logo`, `font-heading`, `font-sans`, `font-serif`, `font-ui`, `font-footer`
  - **Base:** `h1-h6 @apply font-heading` in `@layer base`
- [x] Note any font loading requirements (`next/font`)
  - **Loaded via `next/font/google`** in `apps/save-philly-festivals/src/app/layout.js`

## 5. Spacing System

- [ ] Confirm the base grid unit (4px, 8px, or custom)
  - **Default Tailwind spacing scale used (4px base).** Figma tokens to be verified per component.
- [ ] Document margin/padding patterns across components
- [x] Verify Tailwind default spacing scale covers all gaps in the design
  - **Likely sufficient.** Adjust as component-by-component implementation proceeds.
- [ ] Note any custom spacing values for `theme.extend.spacing`

## 6. Color Palette

- [x] Build a complete color map:

| Role | Hex | Tailwind Key | Source |
|---|---|---|---|
| Background | `#FFFFFF` | `bg-background` | Page backgrounds |
| Foreground | `#000000` | `text-foreground` | Headings/body text |
| Primary | `#F6C847` | `bg-primary` | Yellow — main brand accent |
| Primary-foreground | `#0A142F` | `text-primary-foreground` | Dark text on yellow |
| Secondary | `#206C4E` | `bg-secondary` | Light teal cards/hero |
| Secondary-foreground | `#FFFFFF` | `text-secondary-foreground` | White text on teal |
| Muted | `#EBEBEB` | `bg-muted` | Small festival card bg |
| Muted-foreground | `#848484` | `text-muted-foreground` | Dates, categories, secondary text |
| Accent | `#FE7D0C` | `bg-accent` | Orange — tags, featured badges |
| Accent-foreground | `#FFFFFF` | `text-accent-foreground` | White text on orange |
| Destructive | `#FF7261` | `bg-destructive` | Coral CTA buttons |
| Border | `#EBEBEB` | `border-border` | Card/component borders |
| Input | `#EEEDED` | `bg-input` | Search bar bg |
| Ring | `#F6C847` | `ring-ring` | Yellow focus ring |
| Brand yellow | `#F6C847` | `text-brand-yellow` / `bg-brand-yellow` | Badges, calendar highlights |
| Brand orange | `#FE7D0C` | `text-brand-orange` / `bg-brand-orange` | Tags, prev/next buttons |
| Brand light teal | `#206C4E` | `text-brand-light-teal` / `bg-brand-light-teal` | Card backgrounds, hero |
| Brand teal | `#1E7BF6` | `text-brand-teal` / `bg-brand-teal` | Card backgrounds, icon blocks |
| Brand coral | `#FF8577` | `text-brand-coral` / `bg-brand-coral` | DIY tour badge |
| Brand pink | `#FB439B` | `text-brand-pink` / `bg-brand-pink` | "Learn More" buttons |
| Brand coral-cta | `#FF7261` | `text-brand-coral-cta` / `bg-brand-coral-cta` | Calendar card "Learn More" |
| Brand dark | `#0A142F` | `text-brand-dark` / `bg-brand-dark` | Footer bg |
| Brand card-bg | `#EBEBEB` | `bg-brand-card-bg` | Small festival card bottom |
| Brand text-gray | `#AAAAAA` | `text-brand-text-gray` | Inactive nav links |
| Brand text-muted | `#848484` | `text-brand-text-muted` | Dates, categories, secondary |
| Brand text-dark | `#424242` | `text-brand-text-dark` | Unused — available for alt text |

- [x] Note light/dark mode variations if applicable
  - **Dark mode** block kept with default shadcn values (no Figma dark mode designs exist yet)

## 7. Icons

- [x] Confirm icon set (lucide-react is shadcn default)
  - **Available:** `lucide-react` in the workspace-root `package.json`. Used in shared components (`Search`, `MapPin`, `Calendar`, `Menu`, `X`, `Facebook`, `Instagram`, `Twitter`, `SlidersHorizontal`).
- [ ] If using custom SVGs, create an `apps/save-philly-festivals/src/components/icons/` directory
- [ ] Document which icons are used where
- [x] Note icon sizes (16px, 20px, 24px, etc.)
  - **Default used:** `size-4` (16px) for inline icons, `size-5` (20px) for social, `size-6` (24px) for menu toggle

## 8. Responsive Breakpoints

- [x] Verify Tailwind defaults cover the design: `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536)
  - **Defaults used.** No custom breakpoints added.
- [ ] If the design uses custom breakpoints, add them to `theme.extend.screens`
- [x] Note which components collapse/change at which breakpoints
  - **NavBar** collapses to hamburger menu at `md` (768px). Other components to verify per screen.
- [x] Document mobile-first vs. desktop-first approach (use mobile-first with Tailwind)
  - **Mobile-first** with Tailwind utility classes (`hidden md:flex`, etc.)

## 9. Accessibility

- [ ] Verify color contrast ratios (minimum 4.5:1 for normal text)
- [ ] Check focus state designs for all interactive elements
- [ ] Confirm heading hierarchy is semantic (h1 → h2 → h3, no skipping)

## 10. Empty & Error States

- [ ] Design for empty lists: "No festivals found" illustrations/messages
- [x] Design for loading states: skeleton loading patterns
  - **shadcn `Skeleton` component installed** — ready for use
- [ ] Design for error states: error messages, retry buttons
- [ ] Design for edge cases: long text, missing images, slow connections

---

## Implementation Summary

**Design tokens applied to:**
- `apps/save-philly-festivals/src/app/globals.css` — Brand colors, radius, font variable definitions in `@theme inline` and `:root`
- `apps/save-philly-festivals/src/app/layout.js` — 6 fonts loaded via `next/font/google` with CSS variable bindings

**shadcn components installed (9 total):**
`button`, `card`, `badge`, `input`, `select`, `label`, `skeleton`, `dialog`, `separator`

**Custom shared components built (4 total):**
`NavBar`, `FestivalCard`, `Footer`, `SearchBar` in `apps/save-philly-festivals/src/components/shared/`

**Pending screens to build (Week 2+):**
Homepage hero, Tours listing, Discover (calendar/map views), About page
