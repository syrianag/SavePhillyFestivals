"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";

const producerLinks = [
  { href: "/producer/dashboard", label: "Overview" },
  { href: "/producer/festivals", label: "My Festivals" },
  { href: "/producer/submit", label: "Submit Festival" },
  { href: "/producer/schedule", label: "Schedule" },
];

export default function ProducerLayout({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-background">
        <div className="mx-auto flex h-[77px] items-center justify-between px-4 md:px-[81px]">
          <div className="flex flex-col">
            <Link
              href="/"
              className="font-logo text-3xl font-bold tracking-tight text-foreground"
            >
              Philly Fests
            </Link>
            {session?.user && (
              <span className="font-body text-xs font-medium text-muted-foreground">
                {session.user.email}
              </span>
            )}
          </div>

          <nav className="hidden items-center gap-[31.73px] md:flex">
            {producerLinks.map((link) => (
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
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
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
            {producerLinks.map((link) => (
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
            <button
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="block py-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-[81px] md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
