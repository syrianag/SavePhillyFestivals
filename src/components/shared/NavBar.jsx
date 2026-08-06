"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

const publicLinks = [
  { href: "/", label: "Discover Festivals" },
  { href: "/about", label: "About" },
  { href: "/tours", label: "Tours" },
  { href: "/producer", label: "For Producers" },
];

const staffLinks = [
  { href: "/admin/festivals", label: "Dashboard" },
  { href: "/admin/pending", label: "Pending Review" },
  { href: "/admin/settings", label: "Settings" },
];

const producerLinks = [
  { href: "/producer/dashboard", label: "Dashboard" },
  { href: "/producer/submit", label: "Submit Festival" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  const isStaff = session?.user?.role === "admin" || session?.user?.role === "super_admin";
  const isProducer = session?.user?.role === "producer";
  const isProducerArea = pathname.startsWith("/producer") && pathname !== "/producer";
  const navLinks = isStaff ? staffLinks : isProducer ? producerLinks : publicLinks;

  if (isProducerArea) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-background">
      <div className="mx-auto flex h-[77px] items-center justify-between px-4 md:px-[81px]">
        <Link
          href="/"
          className="flex items-center shrink-0"
        >
          <Image
            src="/logos/PF-Logo-TM.png"
            alt="Save Philly Festivals"
            width={200}
            height={72}
            className="max-h-[72px] w-auto"
            priority
          />
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
          {(isStaff || isProducer) && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {(isStaff || isProducer) ? (
            <span className="font-body text-xs font-medium text-muted-foreground">
              {session.user.email}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-foreground px-3 py-1 font-body text-xs font-semibold text-background hover:bg-foreground/80 transition-colors"
            >
              Login
            </Link>
          )}
        </div>

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
          {(isStaff || isProducer) ? (
            <>
              <span className="block py-2 font-body text-xs font-medium text-muted-foreground">
                {session.user.email}
              </span>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="block py-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-3 block rounded-md bg-foreground px-3 py-1.5 text-center font-body text-xs font-semibold text-background hover:bg-foreground/80 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
