"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const publicLinks = [
  { href: "/", label: "Discover Festivals" },
  { href: "/calendar", label: "Calendar" },
  { href: "/about", label: "About" },
  { href: "/tours", label: "Tours" },
  { href: "/producer", label: "For Producers" },
];

const staffLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/admin/festivals", label: "Festivals" },
  { href: "/admin/view-festivals", label: "View Festivals" },
  { href: "/admin/pending", label: "Pending Review" },
  { href: "/admin/submit", label: "Submit Festival" },
  { href: "/admin/settings", label: "Settings" },
];

const producerLinks = [
  { href: "/producer/dashboard", label: "Dashboard" },
  { href: "/producer/submit", label: "Submit Festival" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const firstMobileLinkRef = useRef(null);
  const { data: session } = useSession();

  const isStaff = session?.user?.role === "admin" || session?.user?.role === "super_admin";
  const isProducer = session?.user?.role === "producer";
  const isProducerArea = pathname.startsWith("/producer");
  const navLinks = isStaff ? staffLinks : isProducer ? producerLinks : publicLinks;



  useEffect(() => {
    if (!mobileOpen) return;

    firstMobileLinkRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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
            height={113}
            className="h-auto w-[200px] max-w-full"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-[31.73px] md:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "rounded-sm font-body text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black",
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
              className="flex items-center gap-1 rounded-sm font-body text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
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
              className="rounded-md bg-foreground px-3 py-1 font-body text-xs font-semibold text-background transition-colors hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Login
            </Link>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="flex rounded-md p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-[#E2E8F0] px-4 pb-4 pt-2 md:hidden" aria-label="Mobile navigation">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              ref={index === 0 ? firstMobileLinkRef : undefined}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "block rounded-sm py-2 font-body text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
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
                className="block rounded-sm py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-3 block rounded-md bg-foreground px-3 py-1.5 text-center font-body text-xs font-semibold text-background transition-colors hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
