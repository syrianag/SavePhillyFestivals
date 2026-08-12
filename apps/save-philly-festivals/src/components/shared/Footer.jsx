import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { AdSlot } from "@/components/shared/AdSlot";
import { SPONSOR_SLOTS } from "@/features/sponsors/sponsor-placements";
import { DEFAULT_FOOTER_SECTIONS } from "@/features/navigation/navigation-defaults";

/**
 * Footer link columns are admin-editable; `sections` arrives from `PublicLayout`.
 *
 * The built-in defaults remain the fallback for any caller that renders this without props —
 * `navigation-source.js` already degrades to the same constants, so both paths produce the same
 * menu rather than two shapes that can drift.
 */
export function Footer({ className, sections, ...props }) {
  const footerSections = sections?.length ? sections : DEFAULT_FOOTER_SECTIONS;
  return (
    <footer
      className={cn("bg-brand-dark font-footer text-sm text-white/80", className)}
      {...props}
    >
      {/* Sponsors lead the footer: it is the first thing past the page content, and one
        * reviewable strip beats placements scattered down the sides. Renders nothing at
        * all — divider included — when no slot is sold. */}
      <AdSlot slot={SPONSOR_SLOTS.FOOTER} className="border-b border-white/10 py-10" />

      {/* Rail sponsors, relocated here below 2xl where the rails themselves are hidden. CSS
        * cannot move a node across the layout/footer boundary, so the rails and this band are
        * two renders of the same sponsors with exactly one visible at any width — `hidden`
        * removes a subtree from the accessibility tree, so screen readers announce one copy. */}
      <AdSlot
        slots={[SPONSOR_SLOTS.LEFT_RAIL, SPONSOR_SLOTS.RIGHT_RAIL]}
        label="Our Sponsors"
        className="border-b border-white/10 py-10 2xl:hidden"
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-[81px]">
        <Link
          href="/"
          aria-label="Save Philly Festivals home"
          className="flex max-w-xs items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Image
            src="/logos/PF-Logo-TM.png"
            alt="Save Philly Festivals"
            width={200}
            height={113}
            className="h-auto w-[200px] max-w-full"
          />
        </Link>

        {footerSections.map((section) => (
          <section key={section.title} aria-labelledby={`footer-${section.title.toLowerCase()}`}>
            <h2 id={`footer-${section.title.toLowerCase()}`} className="mb-3 font-body text-sm font-semibold text-white">
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60 md:px-[81px]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Save Philly Festivals. All rights reserved.</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Privacy</Link>
            <Link href="/terms" className="rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
