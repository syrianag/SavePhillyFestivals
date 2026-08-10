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
  { href: "/exhibit", label: "Digital Exhibit" },
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
  const isProducerArea = pathname.startsWith("/producer/");

  let navLinks = publicLinks;
  if (pathname.startsWith("/admin")) {
    navLinks = staffLinks;
  } else if (pathname.startsWith("/producer/")) {
    navLinks = producerLinks;
  } else {
    // We are on public pages.
    // If the user is logged in, append the respective portal link.
    if (isStaff) {
      navLinks = [
        ...publicLinks.filter((link) => link.href !== "/producer"),
        { href: "/admin/festivals", label: "Admin Portal" }
      ];
    } else if (isProducer) {
      navLinks = [
        ...publicLinks.filter((link) => link.href !== "/producer"),
        { href: "/producer/dashboard", label: "Producer Portal" }
      ];
    }
  }



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
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[77px] items-center justify-between px-4 md:px-[81px]">
        <Link
          href="/"
          className="flex items-center shrink-0 transition-transform duration-300 hover:scale-101"
        >
          <Image
            src="/logos/PF-Logo-TM.png"
            alt="Save Philly Festivals"
            width={200}
            height={113}
            className="h-auto w-[180px] sm:w-[200px] max-w-full"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-[30px] md:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "rounded-md px-1.5 py-1 font-body text-base font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500",
                pathname === link.href
                  ? "text-indigo-650"
                  : "text-slate-500 hover:text-slate-900"
              )}
              style={{ letterSpacing: "-0.15px" }}
            >
              {link.label}
            </Link>
          ))}
          {(isStaff || isProducer) && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-ui text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {(isStaff || isProducer) ? (
            <span className="font-ui text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
              {session.user.email}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2 font-ui text-sm font-bold text-white transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 shadow-2xs hover:shadow-xs"
            >
              Login
            </Link>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="flex rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-slate-700 hover:bg-slate-100 md:hidden transition-colors"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-slate-150 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile navigation">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              ref={index === 0 ? firstMobileLinkRef : undefined}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2 font-body text-base font-bold transition-all",
                pathname === link.href
                  ? "text-indigo-650 bg-indigo-50/50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
              )}
            >
              {link.label}
            </Link>
          ))}
          {(isStaff || isProducer) ? (
            <div className="mt-2 border-t border-slate-100 pt-2 px-3">
              <span className="block py-1.5 font-ui text-xs font-bold text-slate-500">
                {session.user.email}
              </span>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-2 font-ui text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block rounded-full bg-slate-900 py-2.5 text-center font-ui text-sm font-bold text-white transition-colors hover:bg-slate-800 shadow-2xs"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
