"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Discover Festivals" },
  { href: "/calendar", label: "Calendar" },
  { href: "/about", label: "About" },
  { href: "/tours", label: "Tours" },
  { href: "/producer", label: "For Producers" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-background">
      <div className="mx-auto flex h-[77px] items-center justify-between px-4 md:px-[81px]">
        <Link
          href="/"
          className="font-logo text-3xl font-bold tracking-tight text-foreground"
        >
          Philly Fests
        </Link>

        <nav className="hidden items-center gap-[31.73px] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-body text-lg font-bold transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-[#AAAAAA] hover:text-foreground"
              )}
              style={{ letterSpacing: "-0.198857px", lineHeight: "26px" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className="flex md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-[#E2E8F0] px-4 pb-4 pt-2 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-2 font-body text-lg font-bold transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-[#AAAAAA] hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
