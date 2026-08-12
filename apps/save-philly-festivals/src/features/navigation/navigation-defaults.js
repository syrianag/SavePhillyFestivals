/**
 * The menu as it shipped, before it became editable.
 *
 * Two jobs. It seeds the database on first admin read, so a fresh environment starts with the
 * real menu rather than an empty bar. And it stays the render-time fallback for
 * `navigation-source.js` — navigation renders on every public page, so an empty table or an
 * unreachable database must degrade to this rather than to nothing.
 *
 * Kept free of imports so it is safe to pull into a client component.
 */

export const DEFAULT_HEADER_LINKS = Object.freeze([
  { label: "Discover Festivals", href: "/" },
  { label: "Calendar", href: "/calendar" },
  { label: "Our Festivals", href: "/our-festivals" },
  { label: "About", href: "/about" },
  { label: "Tours", href: "/tours" },
  { label: "For Producers", href: "/producer" },
]);

export const DEFAULT_FOOTER_SECTIONS = Object.freeze([
  {
    title: "Explore",
    links: Object.freeze([
      { label: "Discover Festivals", href: "/" },
      { label: "Calendar", href: "/calendar" },
      { label: "Tours", href: "/tours" },
    ]),
  },
  {
    title: "Producers",
    links: Object.freeze([{ label: "Submit Festivals", href: "/producer" }]),
  },
  {
    title: "Company",
    links: Object.freeze([
      { label: "About us", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ]),
  },
]);

/** Flattened into rows, with `sort_order` carrying the order the arrays already express. */
export const DEFAULT_NAVIGATION_LINKS = Object.freeze([
  ...DEFAULT_HEADER_LINKS.map((link, index) => ({
    placement: "header", section: null, label: link.label, href: link.href, sort_order: index, visible: true,
  })),
  ...DEFAULT_FOOTER_SECTIONS.flatMap((group, groupIndex) => group.links.map((link, linkIndex) => ({
    placement: "footer",
    section: group.title,
    label: link.label,
    href: link.href,
    /* Grouped so a whole section can be moved without renumbering its neighbours. */
    sort_order: groupIndex * 100 + linkIndex,
    visible: true,
  }))),
]);
