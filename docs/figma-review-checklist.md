# Figma Review Checklist

Use this checklist **before implementing any screen** from Figma designs.

## 1. Layouts

- [ ] Identify which pages share the same shell (header, footer, sidebar, etc.)
- [ ] Document layout variants (public vs. admin vs. producer)
- [ ] Extract shared layout components into `src/components/layouts/`
- [ ] Note any nested layouts (e.g., admin sidebar with sub-nav)

## 2. Reusable Components

- [ ] Catalog every UI element: buttons, inputs, cards, modals, tables, dropdowns, toggles
- [ ] Map each to existing **shadcn/ui primitives** (Button, Input, Card, Dialog, Table, etc.)
- [ ] Flag components that need custom implementation
- [ ] Note component states: default, hover, active, disabled, loading, error, empty

## 3. Design Tokens

- [ ] Extract all colors (not just primary — also surface, border, muted, destructive, etc.)
- [ ] Extract border radius values (sm, md, lg, full)
- [ ] Extract shadow/box-shadow values
- [ ] Extract opacity/transparency values
- [ ] Note any gradient usage
- [ ] Map tokens to Tailwind theme extensions in `tailwind.config.js`

## 4. Typography

- [ ] Document font family (headings vs. body)
- [ ] Document all text styles: h1–h6, body, small, caption, label, link
- [ ] For each: font size, line height, font weight, letter spacing
- [ ] Map to Tailwind classes (`text-3xl font-bold`, etc.)
- [ ] Note any font loading requirements (`next/font`)

## 5. Spacing System

- [ ] Confirm the base grid unit (4px, 8px, or custom)
- [ ] Document margin/padding patterns across components
- [ ] Verify Tailwind default spacing scale covers all gaps in the design
- [ ] Note any custom spacing values for `theme.extend.spacing`

## 6. Color Palette

- [ ] Build a complete color map:

| Role | Hex | Tailwind Key |
|---|---|---|
| Primary | `#...` | `primary` |
| Secondary | `#...` | `secondary` |
| Accent | `#...` | `accent` |
| Destructive | `#...` | `destructive` |
| Background | `#...` | `background` |
| Foreground | `#...` | `foreground` |
| Muted | `#...` | `muted` |
| Border | `#...` | `border` |
| Ring | `#...` | `ring` |

- [ ] Note light/dark mode variations if applicable

## 7. Icons

- [ ] Confirm icon set (lucide-react is shadcn default)
- [ ] If using custom SVGs, create a `src/components/icons/` directory
- [ ] Document which icons are used where
- [ ] Note icon sizes (16px, 20px, 24px, etc.)

## 8. Responsive Breakpoints

- [ ] Verify Tailwind defaults cover the design: `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536)
- [ ] If the design uses custom breakpoints, add them to `theme.extend.screens`
- [ ] Note which components collapse/change at which breakpoints
- [ ] Document mobile-first vs. desktop-first approach (use mobile-first with Tailwind)

## 9. Accessibility

- [ ] Verify color contrast ratios (minimum 4.5:1 for normal text)
- [ ] Check focus state designs for all interactive elements
- [ ] Confirm heading hierarchy is semantic (h1 → h2 → h3, no skipping)

## 10. Empty & Error States

- [ ] Design for empty lists: "No festivals found" illustrations/messages
- [ ] Design for loading states: skeleton loading patterns
- [ ] Design for error states: error messages, retry buttons
- [ ] Design for edge cases: long text, missing images, slow connections

---

## How to Use

1. Open the Figma file and go through each item above
2. Note findings in a shared doc (or directly in this file)
3. Resolve any ambiguities with the designer **before** coding
4. Update `tailwind.config.js` theme extensions based on findings
5. Only then begin implementing the first screen
