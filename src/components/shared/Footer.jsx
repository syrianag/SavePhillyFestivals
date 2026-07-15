import { cn } from "@/lib/utils";
import Link from "next/link";
import { Globe, Camera, AtSign } from "lucide-react";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
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
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Link
            href="/"
            className="font-logo text-2xl font-bold tracking-tight text-white"
          >
            Philly Fests
          </Link>
          <p className="mt-2 text-xs text-white/60">
            Discover and manage Philadelphia festivals.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex gap-4">
          <a
            href="#"
            aria-label="Facebook"
            className="text-white/60 transition-colors hover:text-white"
          >
            <Globe className="size-5" />
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="text-white/60 transition-colors hover:text-white"
          >
            <Camera className="size-5" />
          </a>
          <a
            href="#"
            aria-label="Twitter"
            className="text-white/60 transition-colors hover:text-white"
          >
            <AtSign className="size-5" />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        &copy; {new Date().getFullYear()} Save Philly Festivals. All rights
        reserved.
      </div>
    </footer>
  );
}
