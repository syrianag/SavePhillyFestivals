import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

const footerSections = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Discover Festivals" },
      { href: "/calendar", label: "Calendar" },
      { href: "/tours", label: "Tours" },
    ],
  },
  {
    title: "Producers",
    links: [{ href: "/producer", label: "Submit Festivals" }],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer({ className, ...props }) {
  return (
    <footer
      className={cn("bg-brand-dark font-footer text-sm text-white/80", className)}
      {...props}
    >
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
