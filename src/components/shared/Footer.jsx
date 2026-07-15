import { cn } from "@/lib/utils";
import Link from "next/link";
import { Globe, Camera, AtSign } from "lucide-react";

const footerSections = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Discover Festivals" },
      { href: "/tours", label: "Tours" },
    ],
  },
  {
    title: "Producers",
    links: [
      { href: "/producer", label: "Submit Festivals" },
      { href: "/resources", label: "Resources" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
    ],
  },
];

export function Footer({ className, ...props }) {
  return (
    <footer
      className={cn(
        "bg-brand-dark font-footer text-sm text-white/80",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-[81px]">
        <div className="max-w-xs">
          <Link
            href="/"
            className="font-logo text-2xl font-bold tracking-tight text-white"
          >
            Philly Fests
          </Link>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h4 className="mb-3 font-body text-sm font-semibold text-white">
              {section.title}
            </h4>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="mb-3 font-body text-sm font-semibold text-white">
            Subscribe
          </h4>
          <p className="mb-3 text-xs text-white/60">
            Join our community!
          </p>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Email address"
              className="rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button className="rounded-md bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30">
              Subscribe
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="#"
              aria-label="Facebook"
              className="text-white/40 transition-colors hover:text-white"
            >
              <Globe className="size-4" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="text-white/40 transition-colors hover:text-white"
            >
              <Camera className="size-4" />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="text-white/40 transition-colors hover:text-white"
            >
              <AtSign className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40 md:px-[81px]">
        <Link href="/" className="font-logo text-base font-bold tracking-tight text-white/60">
          Philly Fests
        </Link>
        <span className="mx-2">Terms &amp; Privacy</span>
        &copy; {new Date().getFullYear()} Philly Festivals - Todos os direitos
        reservados.
      </div>
    </footer>
  );
}
